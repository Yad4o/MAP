"""
agents/executor/executor_agent.py
──────────────────────────────────
Executes individual plan steps using a ReAct loop.

Phase 0: Skeleton only.
Phase 4 (Member building Executor): Implement run() using LangGraph
         ReAct loop. Register tools from the tools/ directory.
"""

import uuid
import time
import warnings
import logging
import traceback
from typing import Dict, Any, List, Optional
from agents.shared.base_agent import BaseAgent
from agents.shared.message import AgentMessage
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage, ToolMessage
from langchain_core.callbacks import CallbackManagerForLLMRun
from langchain_core.outputs import ChatResult, ChatGeneration
from pydantic import Field

# Import tools
from agents.executor.tools.web_search import WebSearchTool
from agents.executor.tools.file_reader import FileReaderTool
from agents.executor.tools.code_interpreter import CodeInterpreterTool

# Import provider resolver
from app.core.llm_provider import resolve_credentials_with_fallback, build_chat_model
from app.config import settings

# Provider-specific rate-limit exception types. Both openai and anthropic
# SDKs raise a RateLimitError subclass on HTTP 429; we check both so a
# rate limit is never silently mistaken for a generic failure.
_RATE_LIMIT_EXC_TYPES: tuple[type[Exception], ...] = ()
try:
    from openai import RateLimitError as _OpenAIRateLimitError
    _RATE_LIMIT_EXC_TYPES += (_OpenAIRateLimitError,)
except ImportError:
    pass
try:
    from anthropic import RateLimitError as _AnthropicRateLimitError
    _RATE_LIMIT_EXC_TYPES += (_AnthropicRateLimitError,)
except ImportError:
    pass


def _is_rate_limit_error(exc: Exception) -> bool:
    """True if `exc` (or anything it wraps) is a provider rate-limit error."""
    if _RATE_LIMIT_EXC_TYPES and isinstance(exc, _RATE_LIMIT_EXC_TYPES):
        return True
    # LangChain sometimes wraps the original SDK exception; fall back to a
    # message/status check so we still catch it even if the type doesn't
    # match (e.g. a differently-versioned SDK).
    msg = str(exc).lower()
    return "rate limit" in msg or "429" in msg or "ratelimit" in msg




# LangGraph imports
try:
    from langgraph.prebuilt import create_react_agent
except ImportError:
    create_react_agent = None

# Module-level logger
logger = logging.getLogger(__name__)


class ExecutorAgent(BaseAgent):
    """
    Receives a single PlanStep.
    Runs a Reason → Act → Observe loop until the step is complete.
    Returns a StepResult.

    Model config:
      - temperature: 0.2 (low — deterministic tool use)
      - max_iterations: from settings (default 10)
    """

    name = "executor"
    description = "Executes plan steps using tools in a ReAct loop."

    def __init__(self, task_id: uuid.UUID, config: dict | None = None):
        super().__init__(task_id, config)
        # Instantiate tools per instance to avoid shared mutable state
        self.available_tools = {
            "web_search": WebSearchTool(),
            "file_reader": FileReaderTool(),
            "code_interpreter": CodeInterpreterTool(),
        }

    async def run(self, message: AgentMessage) -> AgentMessage:
        """
        Input payload:  { "step": PlanStep, "context": list[MemoryResult] }
        Output payload: { "step_result": StepResult }

        Steps to implement in Phase 4:
        1. Load context from memory (provided in payload)
        2. Build LangGraph ReAct graph with available tools
        3. Run graph until step complete or max_iterations reached
        4. Collect tool call trace
        5. Return StepResult with output, trace, token counts, latency
        """
        if HumanMessage is None or create_react_agent is None:
            return self.build_error(
                "LangGraph dependencies not installed. Install with: pip install langgraph langchain-core"
            )

        try:
            # Extract step and context from payload
            payload = message.payload
            step = payload.get("step", {})
            context = payload.get("context", [])

            # Get step details
            step_description = step.get("description", "")
            tool_names = step.get("tool_names", [])

            # Build tool list - default to WebSearchTool if none specified
            if not tool_names:
                tools = [WebSearchTool()]
            else:
                tools = []
                for tool_name in tool_names:
                    if tool_name in self.available_tools:
                        tools.append(self.available_tools[tool_name])

            # If no valid tools found, default to WebSearchTool
            if not tools:
                tools = [WebSearchTool()]

            # Resolve provider/key (user's own key first, else platform default),
            # plus one fallback provider (e.g. Groq -> OpenAI) to try if the
            # primary hits a rate limit.
            user = payload.get("user")
            provider = payload.get("provider")
            creds_candidates = resolve_credentials_with_fallback(user=user, provider=provider)

            # Build prompt with context — only include memory that's actually relevant,
            # and label it so the model doesn't treat it as task content.
            context_text = ""
            if context:
                relevant = [c if isinstance(c, dict) else {"text": str(c), "score": 1.0} for c in context]
                relevant = [c for c in relevant if c.get("score", 0.0) >= 0.5]
                if relevant:
                    snippets = "\n".join(f"- {c.get('text', '')}" for c in relevant)
                    context_text = (
                        "\n\nBackground (may or may not be relevant — do NOT treat this as "
                        f"part of the task itself):\n{snippets}"
                    )

            prompt = f"""Execute the following step: {step_description}{context_text}

Please use the available tools to complete this step. Provide a clear result when finished."""

            EXECUTOR_SYSTEM_PROMPT = (
                "You are an expert executor agent in a multi-agent system.\n"
                "Your job is to execute the given step completely and accurately using available tools.\n\n"
                "Rules:\n"
                "1. For coding steps, write complete, production-ready, functional code that directly solves the problem statement.\n"
                "2. NEVER output trivial dummy placeholder code (such as print('Hello World')). Always write the actual solution.\n"
                "3. If a tool call returns an error, TOOL_ERROR, rate-limit message, or 'file not found', do NOT pretend it succeeded and do NOT silently ignore it. "
                "You may still complete the step using your own knowledge, but you MUST say so explicitly at the start of your answer "
                "(e.g. 'Note: the requested file/search tool failed, so this answer is from my own knowledge, not the source requested.'). "
                "Never claim to have read, searched, or retrieved something that a tool actually failed to provide.\n"
                "4. Provide clean, well-structured, and verified outputs.\n"
            )

            # Try primary provider, then fallback(s), on rate limit specifically.
            # Any non-rate-limit error is re-raised immediately (not retried
            # against a different provider, since it's likely not provider-specific).
            last_rate_limit_exc: Exception | None = None
            result = None
            start_time = time.time()
            for i, creds in enumerate(creds_candidates):
                # ChatOpenAI/ChatAnthropic here (not fallback_engine) since only
                # LangChain chat models support bind_tools, needed for the ReAct loop.
                llm = build_chat_model(
                    creds,
                    temperature=settings.EXECUTOR_TEMPERATURE,
                    max_tokens=settings.MAX_TOKENS,
                )
                agent = create_react_agent(llm, tools, state_modifier=EXECUTOR_SYSTEM_PROMPT)
                try:
                    result = await agent.ainvoke({"messages": [HumanMessage(content=prompt)]})
                    break
                except Exception as exc:
                    if _is_rate_limit_error(exc):
                        last_rate_limit_exc = exc
                        logger.warning(
                            f"[executor] Rate limit on provider={creds.provider} "
                            f"(candidate {i + 1}/{len(creds_candidates)}); "
                            f"{'trying fallback' if i + 1 < len(creds_candidates) else 'no fallback left'}."
                        )
                        continue
                    
                    # If tool invocation or function call schema fails (e.g. 400 tool_use_failed),
                    # fall back to direct LLM completion without tool binding to complete the step gracefully.
                    exc_msg = str(exc).lower()
                    if "tool" in exc_msg or "function" in exc_msg or "400" in exc_msg:
                        logger.warning(
                            f"[executor] Tool call error ({type(exc).__name__}: {exc}); "
                            "falling back to direct LLM completion without tool binding."
                        )
                        try:
                            direct_resp = await llm.ainvoke([
                                SystemMessage(content=EXECUTOR_SYSTEM_PROMPT),
                                HumanMessage(content=prompt)
                            ])
                            result = {"messages": [direct_resp]}
                            break
                        except Exception as inner_exc:
                            logger.error(f"[executor] Direct LLM fallback failed: {inner_exc}")
                            raise exc
                    raise exc

            if result is None:
                # Every candidate provider was rate-limited. Re-raise (rather
                # than swallowing into build_error) so this propagates up
                # through AgentController/_run_agent_task and Celery's
                # process_task actually retries the task per its
                # max_retries/default_retry_delay config, instead of the
                # task silently landing on FAILED after one shot.
                raise last_rate_limit_exc

            end_time = time.time()

            # Extract the final response and token usage
            messages = result.get("messages", [])
            final_message = messages[-1].content if messages else "No response generated"
            
            # Extract token usage from LangGraph response
            tokens_in = 0
            tokens_out = 0
            if messages:
                final_msg = messages[-1]
                # Try to extract token usage from LangChain/LangGraph response
                usage_metadata = getattr(final_msg, 'usage_metadata', None)
                response_metadata = getattr(final_msg, 'response_metadata', {})
                
                if usage_metadata:
                    tokens_in = usage_metadata.get('input_tokens', 0)
                    tokens_out = usage_metadata.get('output_tokens', 0)
                elif 'token_usage' in response_metadata:
                    token_usage = response_metadata['token_usage']
                    tokens_in = token_usage.get('prompt_tokens', 0)
                    tokens_out = token_usage.get('completion_tokens', 0)
                else:
                    # Log warning if LLM doesn't expose token metadata
                    warnings.warn("LLM doesn't expose token usage metadata - token counts will be zero")

            # Parse actual tool invocations from message trace
            actual_tool_calls = []
            for msg in messages:
                if AIMessage is not None and hasattr(msg, 'tool_calls') and msg.tool_calls:
                    actual_tool_calls.extend([tc.get('name', 'unknown') for tc in msg.tool_calls])

            # Extract tool call inputs (e.g. the code the agent wrote) and
            # tool outputs (e.g. code_interpreter's "```python\n...\n```\n\nOutput:\n...").
            # Without this, only the LLM's closing narration is kept as `output`,
            # and the actual code/artifacts a tool produced are discarded —
            # the user sees a description of the function instead of the function.
            tool_inputs: List[Dict[str, Any]] = []
            tool_outputs: List[str] = []
            for msg in messages:
                if AIMessage is not None and isinstance(msg, AIMessage) and getattr(msg, "tool_calls", None):
                    for tc in msg.tool_calls:
                        tool_inputs.append({
                            "tool": tc.get("name", "unknown"),
                            "args": tc.get("args", {}),
                        })
                if isinstance(msg, ToolMessage):
                    content = msg.content if isinstance(msg.content, str) else str(msg.content)
                    tool_outputs.append(content)

            # Prefer the richest available artifact as the canonical output:
            # a code_interpreter tool result (which now includes the source
            # code) is more useful than the LLM's paraphrase of it.
            code_artifacts = [
                out for out in tool_outputs if "```" in out or "Output:" in out
            ]
            primary_output = code_artifacts[-1] if code_artifacts else final_message

            # Build step result
            # Note: Planner emits steps with key 'step_id'; fall back to 'id' for
            # older plan formats, and finally to 'unknown' if neither is present.
            step_result = {
                "step_id": step.get("step_id") or step.get("id") or "unknown",
                "description": step_description,
                "status": "completed",
                "output": primary_output,
                "summary": final_message,
                "code_artifacts": code_artifacts,
                "tool_inputs": tool_inputs,
                "tool_calls_used": list(dict.fromkeys(actual_tool_calls)),  # Remove duplicates, preserve insertion order
                "latency_ms": int((end_time - start_time) * 1000),
                "tokens_used": {
                    "in": tokens_in,
                    "out": tokens_out,
                },
                "trace": [msg.content for msg in messages if hasattr(msg, 'content')]
            }

            # Since we bypassed FallbackChatModel, fallback_used is always false
            fallback_used = False
            
            # Create metadata with fallback information
            from agents.shared.message import AgentMetadata
            metadata = AgentMetadata(
                model_used=settings.DEFAULT_MODEL,
                tokens_in=tokens_in,
                tokens_out=tokens_out,
                latency_ms=int((end_time - start_time) * 1000),
                fallback_used=fallback_used
            )

            return self.build_response(
                recipient="controller",
                message_type="step_result",
                payload={"step_result": step_result},
                metadata=metadata
            )

        except Exception as e:
            logger.error(
                "ExecutorAgent failed",
                exc_info=True,
                extra={
                    "step_id": step.get("id", "unknown"),
                    "step_description": step_description,
                    "error_type": type(e).__name__,
                    "error_message": str(e),
                    "traceback": traceback.format_exc()
                }
            )
            if _is_rate_limit_error(e):
                # Don't swallow this into a FAILED result: build_error()
                # returns normally, which _run_agent_task/AgentController
                # treat as a completed (if failed) run rather than an
                # exception, so Celery's own retry logic never fires.
                # Re-raising here lets process_task's max_retries /
                # default_retry_delay actually kick in.
                raise
            return self.build_error(f"Error executing step: {type(e).__name__}: {str(e)}")

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
from typing import Dict, Any
from agents.shared.base_agent import BaseAgent
from agents.shared.message import AgentMessage

# Import tools
from agents.executor.tools.web_search import WebSearchTool
from agents.executor.tools.file_reader import FileReaderTool
from agents.executor.tools.code_interpreter import CodeInterpreterTool

# LangGraph imports
try:
    from langchain_core.messages import HumanMessage, AIMessage
    from langgraph.prebuilt import create_react_agent
except ImportError:
    HumanMessage = None
    AIMessage = None
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

            # Get LLM from config or use default
            llm = self.config.get("llm")
            if not llm:
                return self.build_error("No LLM provided in config")

            # Create ReAct agent
            agent = create_react_agent(llm, tools)

            # Build prompt with context
            context_text = ""
            if context:
                context_text = "\n\nContext from memory:\n" + "\n".join([str(c) for c in context])

            prompt = f"""Execute the following step: {step_description}{context_text}

Please use the available tools to complete this step. Provide a clear result when finished."""

            # Run the agent
            start_time = time.time()
            result = await agent.ainvoke({"messages": [HumanMessage(content=prompt)]})
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
            
            # Build step result
            step_result = {
                "step_id": step.get("id", "unknown"),
                "description": step_description,
                "status": "completed",
                "output": final_message,
                "tool_calls_used": list(dict.fromkeys(actual_tool_calls)),  # Remove duplicates, preserve insertion order
                "latency_ms": int((end_time - start_time) * 1000),
                "tokens_used": {
                    "in": tokens_in,
                    "out": tokens_out,
                },
                "trace": [msg.content for msg in messages if hasattr(msg, 'content')]
            }

            return self.build_response(
                recipient="controller",
                message_type="step_result",
                payload={"step_result": step_result}
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
            return self.build_error(f"Error executing step: {type(e).__name__}: {str(e)}")

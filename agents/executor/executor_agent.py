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
from typing import Dict, Any
from agents.shared.base_agent import BaseAgent
from agents.shared.message import AgentMessage

# Import tools
from agents.executor.tools.web_search import WebSearchTool
from agents.executor.tools.file_reader import FileReaderTool
from agents.executor.tools.code_interpreter import CodeInterpreterTool

# LangGraph imports
try:
    from langchain_core.messages import HumanMessage
    from langgraph.prebuilt import create_react_agent
except ImportError:
    HumanMessage = None
    create_react_agent = None


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

    # Available tools
    AVAILABLE_TOOLS = {
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
                    if tool_name in self.AVAILABLE_TOOLS:
                        tools.append(self.AVAILABLE_TOOLS[tool_name])

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

            # Extract the final response
            messages = result.get("messages", [])
            final_message = messages[-1].content if messages else "No response generated"

            # Build step result
            step_result = {
                "step_id": step.get("id", "unknown"),
                "description": step_description,
                "status": "completed",
                "output": final_message,
                "tool_calls_used": [tool.name for tool in tools],
                "latency_ms": int((end_time - start_time) * 1000),
                "tokens_used": {
                    "in": 0,  # Would need to track from LLM calls
                    "out": 0,
                },
                "trace": [msg.content for msg in messages if hasattr(msg, 'content')]
            }

            return self.build_response(
                recipient="controller",
                message_type="step_result",
                payload={"step_result": step_result}
            )

        except Exception as e:
            return self.build_error(f"Error executing step: {str(e)}")

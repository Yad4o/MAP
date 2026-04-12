"""
agents/planner_agent.py
──────────────────────
Agent responsible for breaking down high-level tasks into executable steps.
"""

import json
import logging
import time
from typing import Any
import uuid

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from app.config import settings
from app.agents.base import BaseAgent
from app.agents.prompts import PLANNER_SYSTEM_PROMPT, build_planner_prompt
from app.schemas.agent import AgentMessage, AgentMetadata

logger = logging.getLogger(__name__)

class PlannerAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="planner")
        self.llm = ChatOpenAI(
            model=settings.DEFAULT_MODEL,
            temperature=settings.PLANNER_TEMPERATURE,
            openai_api_key=settings.OPENAI_API_KEY
        )

    async def run(self, task_description: str, task_id: Any) -> AgentMessage:
        """
        Generates an execution plan for the given task description.
        Retries once on JSON parsing failures.
        """
        if isinstance(task_id, str):
            task_id = uuid.UUID(task_id)
            
        start_time = time.time()
        messages = [
            SystemMessage(content=PLANNER_SYSTEM_PROMPT),
            HumanMessage(content=build_planner_prompt(task_description))
        ]

        retries = 1
        last_error = None

        while retries >= 0:
            try:
                # Call LLM
                response = await self.llm.ainvoke(messages)
                content = response.content
                
                # Strip markdown fences if present
                if content.strip().startswith("```"):
                    # Basic strip for ```json or ```
                    lines = content.strip().split("\n")
                    if lines[0].startswith("```"):
                        lines = lines[1:]
                    if lines and lines[-1].strip() == "```":
                        lines = lines[:-1]
                    content = "\n".join(lines).strip()

                # Parse JSON
                plan_dict = json.loads(content)
                
                # Validate steps array is present and non-empty
                if "steps" not in plan_dict or not isinstance(plan_dict["steps"], list) or not plan_dict["steps"]:
                    raise ValueError("Response must contain a non-empty 'steps' array.")

                # Populate metadata
                latency_ms = int((time.time() - start_time) * 1000)
                usage = response.response_metadata.get("token_usage", {})
                
                metadata = AgentMetadata(
                    model_used=settings.DEFAULT_MODEL,
                    tokens_in=usage.get("prompt_tokens"),
                    tokens_out=usage.get("completion_tokens"),
                    latency_ms=latency_ms
                )

                return self.build_response(
                    task_id=task_id,
                    message_type="plan",
                    payload={"plan": plan_dict},
                    metadata=metadata
                )

            except (json.JSONDecodeError, ValueError) as e:
                last_error = str(e)
                logger.warning(f"PlannerAgent: Parse/Validation failure (attempts left: {retries}). Error: {last_error}")
                
                if retries > 0:
                    # Pass the error feedback back to the LLM in the message chain
                    messages.append(HumanMessage(content=content)) # Add the bad response
                    messages.append(HumanMessage(content=f"The previous response failed validation: {last_error}. Please provide a corrected JSON execution plan following the schema strictly."))
                retries -= 1

        # On 2nd failure, return error response
        latency_ms = int((time.time() - start_time) * 1000)
        return self.build_error(
            task_id=task_id,
            error_message=f"Planner failed to generate a valid JSON plan after retries. Last error: {last_error}",
            metadata=AgentMetadata(model_used=settings.DEFAULT_MODEL, latency_ms=latency_ms)
        )

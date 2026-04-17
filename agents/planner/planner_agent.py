"""
agents/planner/planner_agent.py
────────────────────────────────
Decomposes a task description into a structured PlanDocument.
"""

import json
import logging
import time
import uuid
from backend.app.config import settings
from backend.app.core.fallback_engine import fallback_engine
from agents.shared.base_agent import BaseAgent
from agents.shared.message import AgentMessage, AgentMetadata
from agents.planner.prompts import PLANNER_SYSTEM_PROMPT, build_planner_prompt

logger = logging.getLogger(__name__)

class PlannerAgent(BaseAgent):
    """
    Receives a task description.
    Returns a PlanDocument containing ordered, dependency-linked steps.
    """

    name = "planner"
    description = "Decomposes tasks into structured execution plans."

    def __init__(self, task_id: uuid.UUID, config: dict | None = None):
        super().__init__(task_id, config)

    async def run(self, message: AgentMessage) -> AgentMessage:
        """
        Input payload:  { "task_description": str }
        Output payload: { "plan": plan_dict }
        """
        task_description = message.payload.get("task_description", "")
        if not task_description:
            return self.build_error("No task_description provided in payload.")

        messages = [
            {"role": "system", "content": PLANNER_SYSTEM_PROMPT},
            {"role": "user", "content": build_planner_prompt(task_description)}
        ]

        retries = 1
        content = ""
        last_error = "Unknown error"
        overall_fallback_used = False

        while retries >= 0:
            start_time = time.time()
            append_feedback = False
            try:
                # Call LLM using fallback_engine
                # OLD: llm = ChatOpenAI(...); response = await llm.ainvoke(messages)
                # NEW: using fallback_engine.chat_completion
                content, fallback_used, tokens_in, tokens_out = await fallback_engine.chat_completion(
                    messages=messages,
                    model=settings.DEFAULT_MODEL,
                    temperature=settings.PLANNER_TEMPERATURE,
                    max_tokens=settings.MAX_TOKENS,
                )
                
                # Track if fallback was used in any attempt
                overall_fallback_used = overall_fallback_used or fallback_used
                
                # Strip markdown fences if present
                if content.strip().startswith("```"):
                    lines = content.strip().split("\n")
                    if lines[0].strip().startswith("```"):
                        lines = lines[1:]
                    if lines and lines[-1].strip().startswith("```"):
                        lines = lines[:-1]
                    content = "\n".join(lines).strip()

                # Parse JSON
                plan_dict = json.loads(content)
                
                # Validate steps array is present and non-empty
                if "steps" not in plan_dict or not isinstance(plan_dict["steps"], list) or not plan_dict["steps"]:
                    raise ValueError("Response must contain a non-empty 'steps' array.")

                # Populate metadata
                latency_ms = int((time.time() - start_time) * 1000)
                
                metadata = AgentMetadata(
                    model_used=settings.DEFAULT_MODEL,
                    tokens_in=tokens_in,
                    tokens_out=tokens_out,
                    latency_ms=latency_ms,
                    fallback_used=overall_fallback_used
                )

                return self.build_response(
                    recipient="controller",
                    message_type="plan",
                    payload={"plan": plan_dict},
                    metadata=metadata
                )

            except (json.JSONDecodeError, ValueError) as e:
                last_error = str(e)
                logger.warning(f"PlannerAgent: Parse/Validation failure (attempts left: {retries}). Error: {last_error}")
                append_feedback = True
                
            except Exception as e:
                last_error = f"LLM call failed: {e}"
                logger.error(f"PlannerAgent: Unexpected LLM error: {e}", exc_info=True)

            if append_feedback:
                # Add feedback for next attempt
                messages.append({"role": "assistant", "content": content}) # Add the bad response with correct role
                messages.append({
                    "role": "user", 
                    "content": f"The previous response failed validation: {last_error}. "
                    "Please provide a corrected JSON execution plan following the schema strictly."
                })
                # Note: overall_fallback_used already tracks fallback usage across retries
            
            retries -= 1

        # On persistent failure, return error response
        return self.build_error(f"Planner failed to generate a valid JSON plan after retries. Last error: {last_error}")

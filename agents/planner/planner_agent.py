"""
agents/planner/planner_agent.py
────────────────────────────────
Decomposes a task description into a structured PlanDocument.

Phase 0: Skeleton only.
Phase 4 (Member building Planner): Implement run() using LangGraph
         and structured LLM output. See prompts.py for system prompt.
"""

import uuid
from agents.shared.base_agent import BaseAgent
from agents.shared.message import AgentMessage


class PlannerAgent(BaseAgent):
    """
    Receives a task description.
    Returns a PlanDocument containing ordered, dependency-linked steps.

    Model config:
      - temperature: 0.7 (higher creativity for decomposition)
      - structured output: JSON mode enforced
    """

    name = "planner"
    description = "Decomposes tasks into structured execution plans."

    async def run(self, message: AgentMessage) -> AgentMessage:
        """
        Input payload:  { "task_description": str }
        Output payload: { "plan": PlanDocument }

        Steps to implement in Phase 4:
        1. Build prompt from task_description using prompts.py
        2. Call LLM via FallbackEngine with JSON mode
        3. Parse response into PlanDocument (validate with Pydantic)
        4. If validation fails: retry with error feedback (max 2 attempts)
        5. Return AgentMessage with message_type="plan" and plan in payload
        """
        raise NotImplementedError("Phase 4 — implement this")

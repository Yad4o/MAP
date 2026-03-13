"""
agents/controller/agent_controller.py
───────────────────────────────────────
Orchestrates the full agent pipeline for a single task:
  Planner → Executor → Analyzer → Memory

Phase 0: Class skeleton, method signatures only.
Phase 4: Implement run_pipeline() — dispatch agents in sequence,
         pass messages between them, handle failures.
"""

import uuid
from agents.shared.message import AgentMessage


class AgentController:
    """
    Called by the Celery worker for each task.
    Owns the full lifecycle of a task's agent execution.
    """

    def __init__(self, task_id: uuid.UUID, task_description: str, config: dict | None = None):
        self.task_id = task_id
        self.task_description = task_description
        self.config = config or {}

        # Agents are instantiated fresh for each task
        # TODO Phase 4: instantiate real agents here
        # self.planner = PlannerAgent(task_id, config)
        # self.executor = ExecutorAgent(task_id, config)
        # self.analyzer = AnalyzerAgent(task_id, config)
        # self.memory = MemoryAgent(task_id, config)

    async def run_pipeline(self) -> dict:
        """
        Full pipeline:
        1. Send task description to PlannerAgent → get PlanDocument
        2. For each step in PlanDocument: send to ExecutorAgent → get StepResult
        3. Send all StepResults to AnalyzerAgent → get validation report
        4. If any step fails validation: re-run that step (max 2 retries)
        5. Send completed results to MemoryAgent → store context
        6. Return final synthesized result dict

        Phase 4 — implement this
        """
        raise NotImplementedError("Phase 4 — implement this")

    async def _run_planner(self, task_description: str) -> AgentMessage:
        """Send task description to planner, return plan message."""
        raise NotImplementedError("Phase 4 — implement this")

    async def _run_executor(self, plan_message: AgentMessage) -> list[AgentMessage]:
        """Execute each plan step, return list of step result messages."""
        raise NotImplementedError("Phase 4 — implement this")

    async def _run_analyzer(self, step_results: list[AgentMessage]) -> AgentMessage:
        """Validate all step results, return validation message."""
        raise NotImplementedError("Phase 4 — implement this")

    async def _run_memory(self, final_results: list[AgentMessage]) -> None:
        """Store task context in vector store."""
        raise NotImplementedError("Phase 4 — implement this")

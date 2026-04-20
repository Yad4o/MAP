"""
agents/controller/agent_controller.py
───────────────────────────────────────
Orchestrates the full agent pipeline for a single task:
  Planner → Executor → Analyzer → Memory

Phase 0: Class skeleton, method signatures only.
Phase 4: Implement run_pipeline() — dispatch agents in sequence,
         pass messages between them, handle failures.
"""

import logging
import uuid
from agents.shared.message import AgentMessage

from agents.planner.planner_agent import PlannerAgent
from agents.executor.executor_agent import ExecutorAgent
from agents.analyzer.analyzer_agent import AnalyzerAgent
from agents.memory.memory_agent import MemoryAgent

logger = logging.getLogger(__name__)


class AgentController:
    """
    Called by the Celery worker for each task.
    Owns the full lifecycle of a task's agent execution.
    """

    def __init__(self, task_id: uuid.UUID, task_description: str, config: dict | None = None):
        self.task_id = task_id
        self.task_description = task_description
        self.config = config or {}

        self.planner = PlannerAgent(task_id, config)
        self.executor = ExecutorAgent(task_id, config)
        self.analyzer = AnalyzerAgent(task_id, config)
        self.memory = MemoryAgent(task_id, config)

    async def run_pipeline(self) -> dict:
        """
        Full pipeline:
        1. Send task description to PlannerAgent → get PlanDocument
        2. For each step in PlanDocument: send to ExecutorAgent → get StepResult
        3. Send all StepResults to AnalyzerAgent → get validation report
        4. If any step fails validation: re-run that step (max 2 retries)
        5. Send completed results to MemoryAgent → store context
        6. Return final synthesized result dict
        """
        # 1. Planner
        plan_message = await self._run_planner(self.task_description)
        if plan_message.message_type == "error":
            return {"error": plan_message.payload.get("error", "Planner error"), "status": "FAILED"}
            
        plan_dict = plan_message.payload.get("plan", {})
        steps = plan_dict.get("steps", [])

        # 2. Executor loop
        step_results = await self._run_executor(steps)

        # 3. Analyzer
        validation_message = await self._run_analyzer(step_results, plan_dict)
        validation_report = validation_message.payload.get("validation_report", {})
        
        # 4. Retry loop (max 2 retries)
        retries = 0
        while retries < 2 and not validation_report.get("passed", True):
            retries += 1
            failed_steps = validation_report.get("failed_steps", [])
            retried_any = False
            
            for i, step in enumerate(steps):
                # Canonical identifier is the step's declared "id" field (1-based, as used in the plan).
                # failed_steps from the analyzer must use the same id values.
                step_id = str(step.get("id", ""))
                # If failed_steps is empty the analyzer gave no specifics — retry all;
                # otherwise only retry steps whose canonical id appears in the list.
                if not failed_steps or step_id in failed_steps:
                    step_results[i] = await self._execute_step(step)
                    retried_any = True

            if not retried_any:
                break

            # Re-analyze all steps — non-retried results are carried over from the previous pass.
            validation_message = await self._run_analyzer(step_results, plan_dict)
            validation_report = validation_message.payload.get("validation_report", {})
        
        # 5. Memory (store) — pass the validation message directly.
        await self._run_memory(validation_message)
        
        # Format the final result
        return {
            "status": "COMPLETED" if validation_report.get("passed", True) else "FAILED",
            "plan": plan_dict,
            "step_results": [msg.payload.get("step_result") or msg.payload for msg in step_results],
            "validation": validation_report,
            "summary": validation_report.get("summary", ""),
            "steps_completed": len(step_results)
        }

    async def _run_planner(self, task_description: str) -> AgentMessage:
        """Send task description to planner, return plan message."""
        # message_type="plan" is the agreed *request* type the PlannerAgent
        # expects — it is the dispatching key, not a description of content.
        # See agent message contract in agents/shared/message.py.
        msg = AgentMessage(
            message_id=uuid.uuid4(),
            task_id=self.task_id,
            sender="controller",
            recipient="planner",
            message_type="plan",
            payload={"task_description": task_description}
        )
        return await self.planner.run(msg)

    async def _execute_step(self, step: dict) -> AgentMessage:
        """Execute a single step: retrieve memory, call executor."""
        # Memory (retrieve)
        context = []
        try:
            retrieve_msg = AgentMessage(
                message_id=uuid.uuid4(),
                task_id=self.task_id,
                sender="controller",
                recipient="memory",
                message_type="retrieve",
                payload={
                    "user_id": str(self.task_id),
                    "query": step.get("description", "")
                }
            )
            context_msg = await self.memory.run(retrieve_msg)
            context = context_msg.payload.get("memory_context", [])
        except Exception as e:
            logger.warning(f"Memory retrieve failed: {e}")

        # Executor
        exec_msg = AgentMessage(
            message_id=uuid.uuid4(),
            task_id=self.task_id,
            sender="controller",
            recipient="executor",
            message_type="execute_step",
            payload={"step": step, "context": context}
        )
        return await self.executor.run(exec_msg)

    async def _run_executor(self, steps: list[dict]) -> list[AgentMessage]:
        """Execute each plan step sequentially, return list of step result messages."""
        step_results = []
        for step in steps:
            result_msg = await self._execute_step(step)
            step_results.append(result_msg)
        return step_results

    async def _run_analyzer(self, step_results: list[AgentMessage], plan_dict: dict) -> AgentMessage:
        """Validate all step results, return validation message."""
        msg = AgentMessage(
            message_id=uuid.uuid4(),
            task_id=self.task_id,
            sender="controller",
            recipient="analyzer",
            message_type="validation",
            payload={
                "step_results": [r.payload.get("step_result", {}) for r in step_results],
                "plan": plan_dict
            }
        )
        return await self.analyzer.run(msg)

    async def _run_memory(self, validation_message: AgentMessage | None) -> None:
        """Store task context in vector store using the final validation message."""
        if not validation_message:
            logger.warning("_run_memory called with no validation_message — memory store skipped.")
            return

        validation_report = validation_message.payload.get("validation_report", {})
        summary = validation_report.get("summary", "")

        try:
            store_msg = AgentMessage(
                message_id=uuid.uuid4(),
                task_id=self.task_id,
                sender="controller",
                recipient="memory",
                message_type="store",
                payload={
                    "user_id": str(self.task_id),
                    "text": summary,
                    "metadata": {}
                }
            )
            await self.memory.run(store_msg)
        except Exception as e:
            logger.warning(f"Memory store failed: {e}")


"""
agents/controller/agent_controller.py
───────────────────────────────────────
Orchestrates the full agent pipeline for a single task:
  Planner → Executor → Analyzer → Memory

Writes TaskStep records to the DB at each stage so the
frontend Task Detail page can display live execution steps.
"""

import logging
import time
import uuid
from datetime import datetime, timezone

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
        logger.info(f"[controller] Pipeline starting for task {self.task_id}")

        # 1. Planner
        plan_message = await self._run_planner(self.task_description)
        if plan_message.message_type == "error":
            err = plan_message.payload.get("error", "Planner error")
            logger.error(f"[controller] Planner failed: {err}")
            return {"error": err, "status": "FAILED"}

        plan_dict = plan_message.payload.get("plan", {})
        steps = plan_dict.get("steps", [])
        logger.info(f"[controller] Plan received with {len(steps)} steps")

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
                step_id = str(step.get("id", ""))
                if not failed_steps or step_id in failed_steps:
                    step_results[i] = await self._execute_step(step, step_index=i)
                    retried_any = True

            if not retried_any:
                break

            validation_message = await self._run_analyzer(step_results, plan_dict)
            validation_report = validation_message.payload.get("validation_report", {})

        # 5. Memory (store)
        await self._run_memory(validation_message)

        final_status = "COMPLETED" if validation_report.get("passed", True) else "FAILED"
        logger.info(f"[controller] Pipeline finished for task {self.task_id} — status={final_status}")

        return {
            "status": final_status,
            "plan": plan_dict,
            "step_results": [msg.payload.get("step_result") or msg.payload for msg in step_results],
            "validation": validation_report,
            "summary": validation_report.get("summary", ""),
            "steps_completed": len(step_results)
        }

    # ── Helpers ───────────────────────────────────────────────

    async def _persist_step(
        self,
        step_index: int,
        step_type: str,
        agent_name: str,
        status: str,
        input_payload: dict | None = None,
        output_payload: dict | None = None,
        model_used: str | None = None,
        tokens_in: int | None = None,
        tokens_out: int | None = None,
        latency_ms: int | None = None,
        confidence: float | None = None,
    ) -> None:
        """Persist a TaskStep record to the database for frontend display."""
        try:
            from app.db.base import AsyncSessionLocal
            from app.db.models.task import TaskStep

            async with AsyncSessionLocal() as db:
                step = TaskStep(
                    task_id=self.task_id,
                    step_index=step_index,
                    step_type=step_type,
                    agent_name=agent_name,
                    status=status,
                    title=f"Step {step_index + 1}: {agent_name}",
                    order=step_index,
                    input_payload=input_payload,
                    output_payload=output_payload,
                    model_used=model_used,
                    tokens_in=tokens_in,
                    tokens_out=tokens_out,
                    latency_ms=latency_ms,
                    confidence=confidence,
                    completed_at=datetime.now(timezone.utc) if status in ("COMPLETED", "FAILED") else None,
                )
                db.add(step)
                await db.commit()
                logger.debug(f"[controller] Persisted step {step_index} ({agent_name}) status={status}")
        except Exception as e:
            # Never let DB persistence failure break the pipeline
            logger.warning(f"[controller] Failed to persist step {step_index}: {e}")

    async def _run_planner(self, task_description: str) -> AgentMessage:
        """Send task description to planner, return plan message."""
        logger.info(f"[controller] Running PlannerAgent")
        t0 = time.monotonic()

        msg = AgentMessage(
            message_id=uuid.uuid4(),
            task_id=self.task_id,
            sender="controller",
            recipient="planner",
            message_type="plan",
            payload={"task_description": task_description}
        )
        result = await self.planner.run(msg)
        latency = int((time.monotonic() - t0) * 1000)

        status = "FAILED" if result.message_type == "error" else "COMPLETED"
        meta = result.payload.get("metadata", {})
        await self._persist_step(
            step_index=0,
            step_type="PLAN",
            agent_name="PlannerAgent",
            status=status,
            input_payload={"task_description": task_description},
            output_payload=result.payload,
            model_used=meta.get("model_used"),
            tokens_in=meta.get("tokens_in"),
            tokens_out=meta.get("tokens_out"),
            latency_ms=latency,
        )
        return result

    async def _execute_step(self, step: dict, step_index: int = 0) -> AgentMessage:
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
            logger.warning(f"[controller] Memory retrieve failed: {e}")

        # Executor
        logger.info(f"[controller] Running ExecutorAgent for step {step_index}: {step.get('description', '')[:60]}")
        t0 = time.monotonic()

        exec_msg = AgentMessage(
            message_id=uuid.uuid4(),
            task_id=self.task_id,
            sender="controller",
            recipient="executor",
            message_type="execute_step",
            payload={"step": step, "context": context}
        )
        result = await self.executor.run(exec_msg)
        latency = int((time.monotonic() - t0) * 1000)

        status = "FAILED" if result.message_type == "error" else "COMPLETED"
        meta = result.payload.get("metadata", {})
        await self._persist_step(
            step_index=step_index + 1,  # +1 because planner is step 0
            step_type="EXECUTE",
            agent_name="ExecutorAgent",
            status=status,
            input_payload={"step": step},
            output_payload=result.payload,
            model_used=meta.get("model_used"),
            tokens_in=meta.get("tokens_in"),
            tokens_out=meta.get("tokens_out"),
            latency_ms=latency,
        )
        return result

    async def _run_executor(self, steps: list[dict]) -> list[AgentMessage]:
        """Execute each plan step sequentially, return list of step result messages."""
        step_results = []
        for i, step in enumerate(steps):
            result_msg = await self._execute_step(step, step_index=i)
            step_results.append(result_msg)
        return step_results

    async def _run_analyzer(self, step_results: list[AgentMessage], plan_dict: dict) -> AgentMessage:
        """Validate all step results, return validation message."""
        logger.info(f"[controller] Running AnalyzerAgent")
        t0 = time.monotonic()

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
        result = await self.analyzer.run(msg)
        latency = int((time.monotonic() - t0) * 1000)

        status = "FAILED" if result.message_type == "error" else "COMPLETED"
        meta = result.payload.get("metadata", {})
        await self._persist_step(
            step_index=len(step_results) + 1,
            step_type="ANALYZE",
            agent_name="AnalyzerAgent",
            status=status,
            input_payload={"num_steps": len(step_results)},
            output_payload=result.payload,
            model_used=meta.get("model_used"),
            tokens_in=meta.get("tokens_in"),
            tokens_out=meta.get("tokens_out"),
            latency_ms=latency,
        )
        return result

    async def _run_memory(self, validation_message: AgentMessage | None) -> None:
        """Store task context in vector store using the final validation message."""
        if not validation_message:
            logger.warning("[controller] _run_memory called with no validation_message — skipped.")
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
            logger.info(f"[controller] Memory stored for task {self.task_id}")
        except Exception as e:
            logger.warning(f"[controller] Memory store failed: {e}")

"""
worker/agent_runner.py
──────────────────────
AgentRunner — bridges Celery worker tasks and AgentController.
Fetches the Task from DB, drives the full agent pipeline, and
persists the final status and result back to DB.
"""

import logging
import uuid

logger = logging.getLogger(__name__)

class AgentRunner:
    """
    Placeholder class for the actual agent execution logic.
    Accepts task_id and runs an async workflow.
    """
    
    def __init__(self, task_id: str | uuid.UUID):
        self.task_id = uuid.UUID(task_id) if isinstance(task_id, str) else task_id

    async def run(self) -> dict:
        """
        Drive the full agent pipeline for this task:
          1. Fetch Task from DB
          2. Set status PROCESSING
          3. Run AgentController.run_pipeline()
          4. Persist final status + result
        """
        # PHASE 3 STUB REPLACED — Now using real AgentController pipeline
        logger.info(f"AgentRunner: starting execution for task {self.task_id}")
        
        # Inline imports are used here to prevent circular import issues and premature DB initialization 
        # when the module is loaded by the Celery worker.
        import sys
        from pathlib import Path
        
        # Ensure backend root is in python path so 'agents' can be imported
        backend_root = str(Path(__file__).resolve().parent.parent.parent)
        if backend_root not in sys.path:
            sys.path.insert(0, backend_root)

        from app.db.base import AsyncSessionLocal
        from app.db.repositories.task_repo import TaskRepository, TaskMessageRepository
        from agents.controller.agent_controller import AgentController
        
        async with AsyncSessionLocal() as session:
            task_repo = TaskRepository(session)
            message_repo = TaskMessageRepository(session)
            
            # Fetch task from DB
            task = await task_repo.get_by_id(self.task_id)
            if not task:
                logger.error(f"AgentRunner: Task {self.task_id} not found")
                return {"status": "FAILED", "task_id": str(self.task_id), "error": "Task not found"}
                
            # Update status to PROCESSING
            task.status = "PROCESSING"
            await session.commit()

            # Follow-up thread, if any. Empty on a task's first run — a new
            # task has no messages yet, so effective_description falls back
            # to the plain task.description below, unchanged from before.
            messages = await message_repo.list_by_task(self.task_id)
            effective_description = self._build_effective_description(
                task.description, task.result, messages
            )

            # Create AgentController(task_id, description, config).
            # Task.config is a verified JSON column from the Phase 2 schema (task.py line 44).
            # getattr guards against any future model drift that drops the column.
            controller = AgentController(
                task_id=task.id,
                task_description=effective_description,
                config=getattr(task, "config", None),
            )
            
            # Return await controller.run_pipeline()
            result = await controller.run_pipeline()
            
            task.status = result.get("status", "COMPLETED").upper()
            task.result = result
            await session.commit()

            # Log the agent's reply on the thread so the *next* follow-up
            # (if any) sees it as prior context. Only relevant once a
            # thread exists — the initial run has nothing to reply to yet.
            if messages:
                reply = result.get("summary") or result.get("error") or "(no summary produced)"
                await message_repo.create(task_id=self.task_id, role="assistant", content=reply)
            
            logger.info(f"AgentRunner: task {self.task_id} completed with status {result.get('status')}")
            return result

    @staticmethod
    def _build_effective_description(
        original_description: str,
        prior_result: dict | None,
        messages: list,
    ) -> str:
        """
        Fold a task's follow-up conversation into a single description string
        for the Planner — the one place the whole pipeline reads task intent
        from, so this is the only integration point continuation needs.

        No-op (returns the plain description) when there's no thread yet,
        which is every task's first run.
        """
        if not messages:
            return original_description

        parts = [f"Original task:\n{original_description}"]

        if prior_result:
            prior_summary = prior_result.get("summary") or prior_result.get("error")
            if prior_summary:
                parts.append(f"Previous outcome:\n{prior_summary}")

        thread_lines = []
        for m in messages:
            speaker = "User" if m.role == "user" else "Assistant"
            thread_lines.append(f"{speaker}: {m.content}")
        parts.append("Follow-up conversation so far:\n" + "\n".join(thread_lines))

        parts.append(
            "Treat the most recent User message above as the current request. "
            "Stay consistent with what was already done rather than starting over."
        )

        return "\n\n".join(parts)

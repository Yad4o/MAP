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
            new_status = result.get("status", "COMPLETED").upper()

            is_continuation = bool(messages)

            # A follow-up that fails should never destroy a previously good
            # result. Keep the last good result + COMPLETED status, and log
            # the failure as an assistant message instead of clobbering
            # task.result/task.status with the failed run's garbage.
            if is_continuation and new_status == "FAILED" and task.result:
                task.status = "COMPLETED"
                await session.commit()

                failure_note = (
                    result.get("error")
                    or "I couldn't complete that follow-up. The result above is still the last good one."
                )
                await message_repo.create(
                    task_id=self.task_id,
                    role="assistant",
                    content=f"⚠️ Follow-up failed: {failure_note}",
                )
                logger.warning(
                    f"AgentRunner: continuation for task {self.task_id} failed; preserving prior result"
                )
                return {
                    "status": "COMPLETED",
                    "task_id": str(self.task_id),
                    "result": task.result,
                    "note": "follow-up failed, prior result preserved",
                }

            task.status = new_status
            task.result = result
            await session.commit()

            # Log the agent's reply on the thread so the *next* follow-up
            # (if any) sees it as prior context. Only relevant once a
            # thread exists — the initial run has nothing to reply to yet.
            if is_continuation:
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

        IMPORTANT: this is framed as reference material, not as something
        to fetch. An earlier version of this prompt caused the Planner to
        generate bogus steps like "retrieve previous version details from
        memory" — it read "previous outcome" as an instruction to go look
        something up, instead of context already handed to it. The wording
        below is deliberately explicit that the prior result is already
        provided in full and the plan should only cover the new request.
        """
        if not messages:
            return original_description

        parts = [
            "This is a FOLLOW-UP on a task that already ran. Everything below "
            "under 'Background' is reference material already available to "
            "you — do NOT create a step to retrieve, look up, or fetch any "
            "of it from memory or anywhere else. Only plan steps for the "
            "NEW request at the bottom.",
            f"Background — original task:\n{original_description}",
        ]

        if prior_result:
            prior_summary = prior_result.get("summary") or prior_result.get("error")
            if prior_summary:
                parts.append(f"Background — result from the last run:\n{prior_summary}")

        thread_lines = [f"{'User' if m.role == 'user' else 'Assistant'}: {m.content}" for m in messages]
        parts.append("Background — conversation so far:\n" + "\n".join(thread_lines))

        parts.append(
            "NEW REQUEST — plan only for this: "
            + (messages[-1].content if messages else original_description)
        )

        return "\n\n".join(parts)

"""
worker/tasks.py
───────────────
Celery task definitions.

Phase 0: Tasks registered, bodies raise NotImplementedError.
Phase 3: Implement process_task — acquire Redis lock, call AgentController.
"""

import logging
import asyncio
import uuid
from app.worker.celery_app import celery_app
from app.db.base import AsyncSessionLocal
from app.db.repositories.task import TaskRepository
from app.core.agent.runner import AgentRunner
from app.schemas.task import TaskStatus

logger = logging.getLogger(__name__)


@celery_app.task(
    name="app.worker.tasks.process_task",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
)
def process_task(self, task_id_str: str) -> dict:
    """
    Main task worker. Called when a task is pushed to the default queue.
    """
    logger.info(f"[worker] Received task {task_id_str}")
    
    # Run the async logic using asyncio.run
    return asyncio.run(_process_task_async(self, task_id_str))


async def _process_task_async(self, task_id_str: str) -> dict:
    task_id = uuid.UUID(task_id_str)
    
    async with AsyncSessionLocal() as db:
        repo = TaskRepository(db)
        
        # 1. Get task to find user_id
        task = await repo.get(task_id)
        if not task:
            logger.error(f"Task {task_id} not found")
            return {"status": "FAILED", "error": "Task not found"}
        
        user_id = task.user_id
        
        try:
            # 2. Update status to PROCESSING
            await repo.update_status_if_not_terminal(task_id, user_id, TaskStatus.PROCESSING)
            
            # 3. Call AgentRunner.run()
            runner = AgentRunner(task_id)
            result = await runner.run()
            
            # 4. Update status to COMPLETED
            await repo.update_status(task_id, TaskStatus.COMPLETED, extra_fields={"result": result})
            
            return {"status": "COMPLETED", "task_id": str(task_id)}
            
        except Exception as exc:
            logger.exception(f"Error processing task {task_id}: {exc}")
            
            # Update DB with error
            await repo.update_status(task_id, TaskStatus.FAILED, extra_fields={"error": {"message": str(exc)}})
            
            # Retry
            try:
                self.retry(exc=exc)
            except Exception:
                # self.retry raises an exception to stop current execution
                raise
            
            return {"status": "FAILED", "task_id": str(task_id), "error": str(exc)}


@celery_app.task(
    name="app.worker.tasks.process_priority_task",
    bind=True,
    max_retries=3,
    default_retry_delay=15,
)
def process_priority_task(self, task_id: str) -> dict:
    """High-priority queue variant. Same logic, different queue."""
    return process_task.apply(args=[task_id])


@celery_app.task(
    name="app.worker.tasks.process_long_task",
    bind=True,
    max_retries=1,
    default_retry_delay=60,
    soft_time_limit=12600,   # 3.5 hours
    time_limit=14400,        # 4 hours
)
def process_long_task(self, task_id: str) -> dict:
    """Long-running queue variant for large document and research tasks."""
    return process_task.apply(args=[task_id])

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
from app.db.repositories.task_repo import TaskRepository
from app.schemas.task import TaskStatus
from app.worker.agent_runner import AgentRunner

logger = logging.getLogger(__name__)


async def _run_agent_task(task_id: str):
    """Internal async logic for task processing."""
    tid = uuid.UUID(task_id)
    async with AsyncSessionLocal() as db:
        repo = TaskRepository(db)
        
        # 1. Update status to PROCESSING
        logger.info(f"Task {task_id}: status -> PROCESSING")
        await repo.update_status(tid, TaskStatus.PROCESSING)
        
        try:
            # 2. Run AgentRunner
            runner = AgentRunner(task_id)
            result = await runner.run()
            
            # 3. Update status to COMPLETED
            logger.info(f"Task {task_id}: status -> COMPLETED")
            await repo.set_result(tid, result)
            await repo.update_status(tid, TaskStatus.COMPLETED)
            return result
            
        except Exception as e:
            logger.error(f"Task {task_id}: error -> {str(e)}")
            await repo.set_error(tid, {"error": str(e)})
            await repo.update_status(tid, TaskStatus.FAILED)
            raise e


async def _set_task_failed(task_id: str):
    """Set task status to FAILED after all retries exhausted."""
    async with AsyncSessionLocal() as db:
        repo = TaskRepository(db)
        await repo.update_status(uuid.UUID(task_id), TaskStatus.FAILED)


def _run_async(coro):
    """Helper to run a coroutine, handling existing event loops (e.g. in tests)."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                return executor.submit(asyncio.run, coro).result()
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


@celery_app.task(
    name="app.worker.tasks.process_task",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
)
def process_task(self, task_id: str) -> dict:
    """
    Main task worker. Called when a task is pushed to the default queue.
    """
    logger.info(f"[worker] Received task {task_id}")
    
    try:
        return _run_async(_run_agent_task(task_id))
    except Exception as exc:
        # Check if we should retry
        if self.request.retries >= self.max_retries:
            logger.error(f"[worker] Task {task_id} failed after {self.max_retries} retries")
            _run_async(_set_task_failed(task_id))
            raise exc
        
        logger.warning(f"[worker] Retrying task {task_id} due to: {exc}")
        raise self.retry(exc=exc)


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

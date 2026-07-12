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
from app.db.repositories.user_repo import UserRepository
from app.schemas.task import TaskStatus
from app.worker.agent_runner import AgentRunner
from app.services.email_service import EmailService
from app.services.email_templates import task_completed_email, task_failed_email

logger = logging.getLogger(__name__)


async def _notify_task_result(db, tid: uuid.UUID, task, final_status: str, error: str | None = None) -> None:
    """Best-effort email notification on task completion/failure.
    Never raises — a notification failure must not affect task state."""
    try:
        user_repo = UserRepository(db)
        user = await user_repo.get_by_id(task.user_id)
        if user is None:
            return

        if final_status == "FAILED":
            html = task_failed_email(task.title, str(tid), error or "Unknown error")
            subject = "Your MAP task failed"
        else:
            html = task_completed_email(task.title, str(tid))
            subject = "Your MAP task completed"

        await EmailService().send(to=user.email, subject=subject, html=html)
    except Exception as exc:
        logger.warning(f"Task {tid}: failed to send notification email: {exc}")


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
            
            # 3. Update status based on result
            final_status = result.get("status", TaskStatus.COMPLETED.value).upper()
            logger.info(f"Task {task_id}: status -> {final_status}")
            
            if final_status == "FAILED":
                await repo.set_error(tid, result)
            else:
                await repo.set_result(tid, result)
                
            await repo.update_status(tid, TaskStatus(final_status))

            # Best-effort notification — must never affect task outcome,
            # even if the repo/session is mocked or the fetch fails.
            try:
                task = await repo.get_by_id(tid)
                if task is not None:
                    await _notify_task_result(db, tid, task, final_status, result.get("error"))
            except Exception as notify_exc:
                logger.warning(f"Task {task_id}: notification step failed: {notify_exc}")

            return result
            
        except Exception as e:
            logger.error(f"Task {task_id}: error -> {str(e)}")
            await repo.set_error(tid, {"error": str(e)})
            await repo.update_status(tid, TaskStatus.FAILED)

            try:
                task = await repo.get_by_id(tid)
                if task is not None:
                    await _notify_task_result(db, tid, task, "FAILED", str(e))
            except Exception as notify_exc:
                logger.warning(f"Task {task_id}: notification step failed: {notify_exc}")

            raise e


async def _set_task_failed(task_id: str):
    """Set task status to FAILED after all retries exhausted."""
    async with AsyncSessionLocal() as db:
        repo = TaskRepository(db)
        await repo.update_status(uuid.UUID(task_id), TaskStatus.FAILED)


def _run_async(coro):
    """
    Run an async coroutine from a sync context safely.

    Celery workers run in a plain thread with no active event loop, so
    asyncio.run() is always safe there.

    In dev mode (task_always_eager=True) the Celery task is called
    *inside* FastAPI's event loop.  Calling loop.run_until_complete()
    on a running loop deadlocks, so we dispatch to a dedicated thread
    with its own event loop in all cases.
    """
    import concurrent.futures
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(asyncio.run, coro)
        return future.result()


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

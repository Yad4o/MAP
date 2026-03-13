"""
worker/tasks.py
───────────────
Celery task definitions.

Phase 0: Tasks registered, bodies raise NotImplementedError.
Phase 3: Implement process_task — acquire Redis lock, call AgentController.
"""

import logging
from app.worker.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    name="app.worker.tasks.process_task",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
)
def process_task(self, task_id: str) -> dict:
    """
    Main task worker. Called when a task is pushed to the default queue.

    Steps to implement in Phase 3:
    1. Acquire Redis distributed lock on task_id
    2. Update task status to PROCESSING in DB
    3. Instantiate AgentController with task_id
    4. Run the agent pipeline
    5. Write result to DB, update status to COMPLETED
    6. Release lock and publish Redis pub/sub notification
    """
    logger.info(f"[worker] Received task {task_id}")
    raise NotImplementedError("Phase 3 — implement this")


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

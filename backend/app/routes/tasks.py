"""
Task management routes.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.db.base import get_db
from app.dependencies import get_current_user
from app.schemas.task import (
    TaskCreateRequest, TaskUpdateRequest, TaskRead, TaskDetailRead, TaskStatusResponse,
    TaskMessageCreateRequest, TaskMessageRead,
)
from app.services.task_service import TaskService
from app.db.repositories.task_repo import TaskRepository, TaskMessageRepository
from app.core.exceptions import TaskNotFoundError, TaskOwnershipError, TaskStateTransitionError, TaskNotContinuableError
from app.worker.tasks import process_task
from app.core.redis_client import get_redis
from app.core.token_stream import clear_task_stream, stream_task_events


router = APIRouter(prefix="/tasks", tags=["tasks"])


def get_task_service(db: AsyncSession = Depends(get_db)) -> TaskService:
    """Dependency injection for task service."""
    repo = TaskRepository(db)
    message_repo = TaskMessageRepository(db)
    return TaskService(repo, message_repo)


@router.post("", response_model=TaskRead, status_code=status.HTTP_202_ACCEPTED)
async def create_task(
    task_data: TaskCreateRequest,
    current_user = Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service)
):
    """Create a new task."""
    task = await task_service.create_task(current_user.id, task_data)

    # Dispatch Celery job for processing here in the route layer
    # In development (eager mode), add a small countdown to ensure
    # the DB transaction is fully committed before the worker reads it
    from app.config import settings
    countdown = 1 if settings.is_development else 0
    process_task.apply_async(args=[str(task.id)], countdown=countdown)

    return task


@router.get("", response_model=list[TaskRead])
async def list_tasks(
    current_user = Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service)
):
    """List all tasks for the current user."""
    return await task_service.list_tasks(current_user.id)


@router.get("/{task_id}", response_model=TaskDetailRead)
async def get_task(
    task_id: uuid.UUID,
    current_user = Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service)
):
    """Get a specific task by ID."""
    try:
        return await task_service.get_task(task_id, current_user.id)
    except (TaskNotFoundError, TaskOwnershipError):
        raise HTTPException(status_code=404, detail="Task not found")


async def get_stream_redis():
    """Redis client for live-stream reads (overridable in tests)."""
    return await get_redis()


_TERMINAL_STATUSES = {"COMPLETED", "FAILED", "CANCELLED"}


async def _clear_stream(task_id: uuid.UUID) -> None:
    """Drop the previous run's streamed text before a task is re-queued. Best effort."""
    try:
        await clear_task_stream(await get_redis(), task_id)
    except Exception:  # noqa: BLE001 — never block a retry/follow-up on Redis
        pass


@router.get("/{task_id}/stream")
async def stream_task(
    task_id: uuid.UUID,
    request: Request,
    offset: int = Query(0, ge=0, description="Resume from this event id (the SSE Last-Event-ID + 1)."),
    current_user = Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service),
    redis = Depends(get_stream_redis),
):
    """
    Server-Sent Events: the task's answer text as it is generated.

    Purely additive — the task's final result is still saved and served by the normal
    endpoints, so a client can ignore this stream (or lose it) and nothing is missed.
    """
    try:
        await task_service.get_task_status(task_id, current_user.id)  # ownership check
    except (TaskNotFoundError, TaskOwnershipError):
        raise HTTPException(status_code=404, detail="Task not found")

    async def task_finished() -> bool:
        # Own short-lived session: the request-scoped one is closed once streaming starts.
        from app.db.base import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            task = await TaskRepository(session).get(task_id)
            if task is None:
                return True
            return str(getattr(task.status, "value", task.status)) in _TERMINAL_STATUSES

    return StreamingResponse(
        stream_task_events(
            redis, task_id, offset,
            is_disconnected=request.is_disconnected,
            is_task_finished=task_finished,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # tell proxies (nginx/Render) not to buffer the stream
        },
    )


@router.get("/{task_id}/status", response_model=TaskStatusResponse)
async def get_task_status(
    task_id: uuid.UUID,
    current_user = Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service)
):
    """Get the status of a specific task (lightweight endpoint)."""
    try:
        return await task_service.get_task_status(task_id, current_user.id)
    except (TaskNotFoundError, TaskOwnershipError):
        raise HTTPException(status_code=404, detail="Task not found")


@router.post("/{task_id}/messages", response_model=TaskRead, status_code=status.HTTP_202_ACCEPTED)
async def add_task_message(
    task_id: uuid.UUID,
    message_data: TaskMessageCreateRequest,
    current_user = Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service)
):
    """
    Send a follow-up message to a completed/failed task.

    Records the message on the task's thread and re-queues the task so the
    worker can pick it back up with full conversation context, instead of
    the caller having to start a brand new task from scratch.
    """
    try:
        task = await task_service.add_message(task_id, current_user.id, message_data.content)
    except (TaskNotFoundError, TaskOwnershipError):
        raise HTTPException(status_code=404, detail="Task not found")
    except TaskNotContinuableError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Same dispatch pattern as create_task — small countdown in dev mode so
    # the DB transaction (message insert + status flip) is committed before
    # the worker reads it.
    from app.config import settings
    countdown = 1 if settings.is_development else 0
    await _clear_stream(task_id)
    process_task.apply_async(args=[str(task_id)], countdown=countdown)

    return task


@router.get("/{task_id}/messages", response_model=list[TaskMessageRead])
async def list_task_messages(
    task_id: uuid.UUID,
    current_user = Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service)
):
    """Get the full follow-up conversation thread for a task."""
    try:
        return await task_service.list_messages(task_id, current_user.id)
    except (TaskNotFoundError, TaskOwnershipError):
        raise HTTPException(status_code=404, detail="Task not found")


@router.put("/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: uuid.UUID,
    task_data: TaskUpdateRequest,
    current_user = Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service)
):
    """Update a specific task."""
    try:
        return await task_service.update_task(task_id, current_user.id, task_data)
    except (TaskNotFoundError, TaskOwnershipError):
        raise HTTPException(status_code=404, detail="Task not found")


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: uuid.UUID,
    current_user = Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service)
):
    """Delete a specific task."""
    try:
        await task_service.delete_task(task_id, current_user.id)
        return None
    except (TaskNotFoundError, TaskOwnershipError):
        raise HTTPException(status_code=404, detail="Task not found")


@router.post("/{task_id}/cancel", response_model=TaskRead)
async def cancel_task(
    task_id: uuid.UUID,
    current_user = Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service)
):
    """Cancel a specific task."""
    try:
        return await task_service.cancel_task(task_id, current_user.id)
    except (TaskNotFoundError, TaskOwnershipError):
        raise HTTPException(status_code=404, detail="Task not found")
    except TaskStateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{task_id}/retry", response_model=TaskRead, status_code=status.HTTP_202_ACCEPTED)
async def retry_task(
    task_id: uuid.UUID,
    current_user = Depends(get_current_user),
    task_service: TaskService = Depends(get_task_service)
):
    """Re-queue a failed or cancelled task."""
    try:
        task = await task_service.get_task(task_id, current_user.id)
    except (TaskNotFoundError, TaskOwnershipError):
        raise HTTPException(status_code=404, detail="Task not found")

    from app.schemas.task import TaskStatus
    if task.status not in (TaskStatus.FAILED, TaskStatus.CANCELLED):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot retry a task with status '{task.status}'. Only FAILED or CANCELLED tasks can be retried."
        )

    # Reset status to PENDING and re-dispatch
    from app.schemas.task import TaskStatus
    await task_service.repo.update_status(task_id, TaskStatus.PENDING)

    # Add countdown in development mode to ensure DB commit completes
    from app.config import settings
    countdown = 1 if settings.is_development else 0
    await _clear_stream(task_id)
    process_task.apply_async(args=[str(task_id)], countdown=countdown)

    # Return the refreshed task
    return await task_service.get_task(task_id, current_user.id)


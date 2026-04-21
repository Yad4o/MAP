"""
Task management routes.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.db.base import get_db
from app.dependencies import get_current_user
from app.schemas.task import TaskCreateRequest, TaskUpdateRequest, TaskRead, TaskStatusResponse
from app.services.task_service import TaskService
from app.db.repositories.task_repo import TaskRepository
from app.core.exceptions import TaskNotFoundError, TaskOwnershipError, TaskStateTransitionError
from app.worker.tasks import process_task


router = APIRouter(prefix="/tasks", tags=["tasks"])


def get_task_service(db: AsyncSession = Depends(get_db)) -> TaskService:
    """Dependency injection for task service."""
    repo = TaskRepository(db)
    return TaskService(repo)


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


@router.get("/{task_id}", response_model=TaskRead)
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
    process_task.apply_async(args=[str(task_id)], countdown=countdown)

    # Return the refreshed task
    return await task_service.get_task(task_id, current_user.id)


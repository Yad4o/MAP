"""
Task management routes.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.db.base import get_db
from app.dependencies import get_current_user
from app.schemas.task import TaskCreateRequest, TaskUpdateRequest, TaskRead
from app.services.task_service import TaskService
from app.db.repositories.task_repo import TaskRepository
from app.core.exceptions import TaskNotFoundError, TaskOwnershipError


router = APIRouter(prefix="/tasks", tags=["tasks"])


def get_task_service() -> TaskService:
    """Dependency injection for task service."""
    # Repository will be created per operation with the appropriate db session
    return TaskService(None)


@router.post("/", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: TaskCreateRequest,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new task."""
    repo = TaskRepository(db)
    task_service = TaskService(repo)
    return await task_service.create_task(db, current_user.id, task_data)


@router.get("/", response_model=list[TaskRead])
async def list_tasks(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all tasks for the current user."""
    repo = TaskRepository(db)
    task_service = TaskService(repo)
    return await task_service.list_tasks(db, current_user.id)


@router.get("/{task_id}", response_model=TaskRead)
async def get_task(
    task_id: uuid.UUID,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific task by ID."""
    repo = TaskRepository(db)
    task_service = TaskService(repo)
    try:
        return await task_service.get_task(db, task_id, current_user.id)
    except (TaskNotFoundError, TaskOwnershipError):
        raise HTTPException(status_code=404, detail="Task not found")


@router.put("/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: uuid.UUID,
    task_data: TaskUpdateRequest,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a specific task."""
    repo = TaskRepository(db)
    task_service = TaskService(repo)
    try:
        return await task_service.update_task(db, task_id, current_user.id, task_data)
    except (TaskNotFoundError, TaskOwnershipError):
        raise HTTPException(status_code=404, detail="Task not found")


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: uuid.UUID,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a specific task."""
    repo = TaskRepository(db)
    task_service = TaskService(repo)
    try:
        await task_service.delete_task(db, task_id, current_user.id)
        return None
    except (TaskNotFoundError, TaskOwnershipError):
        raise HTTPException(status_code=404, detail="Task not found")

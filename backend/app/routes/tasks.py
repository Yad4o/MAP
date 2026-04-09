"""
Task management routes.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.dependencies import get_current_user
from app.schemas.task_simple import TaskCreate, TaskRead, TaskUpdate
from app.services.protocols import TaskServiceProtocol
from tests.mocks.task_service import MockTaskService


router = APIRouter(prefix="/tasks", tags=["tasks"])


def get_task_service() -> TaskServiceProtocol:
    """Dependency injection for task service."""
    # In production, this would return the actual database service
    # For now, return the mock service
    # This will be overridden in tests
    return MockTaskService()


@router.post("/", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: TaskCreate,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    task_service: TaskServiceProtocol = Depends(get_task_service)
):
    """Create a new task."""
    return await task_service.create_task(db, current_user.id, task_data)


@router.get("/", response_model=list[TaskRead])
async def list_tasks(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    task_service: TaskServiceProtocol = Depends(get_task_service)
):
    """List all tasks for the current user."""
    print(f"Route service instance: {task_service}")
    print(f"Route service tasks: {task_service.tasks if hasattr(task_service, 'tasks') else 'No tasks attr'}")
    return await task_service.list_tasks(db, current_user.id)


@router.get("/{task_id}", response_model=TaskRead)
async def get_task(
    task_id: int,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    task_service: TaskServiceProtocol = Depends(get_task_service)
):
    """Get a specific task by ID."""
    return await task_service.get_task(db, task_id, current_user.id)


@router.put("/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: int,
    task_data: TaskUpdate,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    task_service: TaskServiceProtocol = Depends(get_task_service)
):
    """Update a specific task."""
    return await task_service.update_task(db, task_id, current_user.id, task_data)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    task_service: TaskServiceProtocol = Depends(get_task_service)
):
    """Delete a specific task."""
    await task_service.delete_task(db, task_id, current_user.id)
    return None

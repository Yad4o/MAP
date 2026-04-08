"""
services/task_service.py
-------------------------
Business logic layer for task management with repository pattern.

TaskService uses dependency injection with TaskRepositoryProtocol,
making it easy to test with mock repositories.
"""

from typing import Any, List
from fastapi import HTTPException, status
import uuid

from app.db.repositories.protocols import TaskRepositoryProtocol
from app.schemas.task import TaskRead, TaskCreateRequest, TaskUpdateRequest


class TaskService:
    """Service layer for task operations with repository injection."""

    def __init__(self, repo: TaskRepositoryProtocol):
        self.repo = repo

    async def create_task(self, db: Any, user_id: uuid.UUID, data: TaskCreateRequest) -> TaskRead:
        """Create a new task for a user."""
        task = await self.repo.create(db, user_id, data)
        return TaskRead.model_validate(task)

    async def get_task(self, db: Any, task_id: uuid.UUID, user_id: uuid.UUID) -> TaskRead:
        """Get a task by ID, validating ownership."""
        task = await self.repo.get(db, task_id)
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        # Handle both dict and object responses
        task_user_id = task.user_id if hasattr(task, 'user_id') else task['user_id']
        if task_user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        return TaskRead.model_validate(task)

    async def list_tasks(self, db: Any, user_id: uuid.UUID) -> List[TaskRead]:
        """List all tasks for a user."""
        tasks = await self.repo.get_all_by_user(db, user_id)
        return [TaskRead.model_validate(task) for task in tasks]

    async def update_task(self, db: Any, task_id: uuid.UUID, user_id: uuid.UUID, data: TaskUpdateRequest) -> TaskRead:
        """Update a task, validating ownership."""
        # First check if task exists and belongs to user
        existing_task = await self.repo.get(db, task_id)
        if not existing_task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        # Handle both dict and object responses
        task_user_id = existing_task.user_id if hasattr(existing_task, 'user_id') else existing_task['user_id']
        if task_user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        # Update the task
        updated_task = await self.repo.update(db, task_id, data)
        if not updated_task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        return TaskRead.model_validate(updated_task)

    async def delete_task(self, db: Any, task_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """Delete a task, validating ownership."""
        # First check if task exists and belongs to user
        existing_task = await self.repo.get(db, task_id)
        if not existing_task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        # Handle both dict and object responses
        task_user_id = existing_task.user_id if hasattr(existing_task, 'user_id') else existing_task['user_id']
        if task_user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        return await self.repo.delete(db, task_id)

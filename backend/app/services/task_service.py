"""
services/task_service.py
-------------------------
Business logic layer for task management with repository pattern.

TaskService uses dependency injection with TaskRepositoryProtocol,
making it easy to test with mock repositories.
"""

from typing import Any, List
import uuid

from app.db.repositories.protocols import TaskRepositoryProtocol
from app.schemas.task import TaskRead, TaskCreateRequest, TaskUpdateRequest, TaskStatus
from app.core.exceptions import TaskNotFoundError, TaskOwnershipError, TaskStateTransitionError


class TaskService:
    """Service layer for task operations with repository injection."""

    def __init__(self, repo: TaskRepositoryProtocol):
        self.repo = repo

    async def create_task(self, user_id: uuid.UUID, data: TaskCreateRequest) -> TaskRead:
        """Create a new task for a user."""
        task = await self.repo.create(
            user_id=user_id,
            title=data.title,
            description=data.description,
            priority=data.priority,
            config=data.config
        )
        
        # Use Pydantic's ORM handling with from_attributes=True
        return TaskRead.model_validate(task, from_attributes=True)

    async def get_task(self, task_id: uuid.UUID, user_id: uuid.UUID) -> TaskRead:
        """Get a task by ID, validating ownership."""
        task = await self.repo.get(task_id)
        if not task:
            raise TaskNotFoundError(task_id)
        
        # Check ownership
        if task.user_id != user_id:
            raise TaskOwnershipError()
        
        # Use Pydantic's ORM handling with from_attributes=True
        return TaskRead.model_validate(task, from_attributes=True)

    async def list_tasks(self, user_id: uuid.UUID) -> List[TaskRead]:
        """List all tasks for a user."""
        tasks = await self.repo.get_all_by_user(user_id)
        # Use Pydantic's ORM handling with from_attributes=True
        return [TaskRead.model_validate(task, from_attributes=True) for task in tasks]

    async def update_task(self, task_id: uuid.UUID, user_id: uuid.UUID, data: TaskUpdateRequest) -> TaskRead:
        """Update a task with atomic ownership validation (only non-status fields)."""
        # Try atomic update first
        updated_task = await self.repo.update_owned(task_id, user_id, data)
        if updated_task is not None:
            # Success - task was found and user owned it
            # Use Pydantic's ORM handling with from_attributes=True
            return TaskRead.model_validate(updated_task, from_attributes=True)
        
        # If we get here, update failed - distinguish between not found and not owned
        # NOTE: TOCTOU - task could be deleted between atomic op and this get().
        # In that edge case we may raise TaskOwnershipError instead of TaskNotFoundError.
        # Acceptable trade-off; revisit if strict error semantics are required.
        existing_task = await self.repo.get(task_id)
        if not existing_task:
            raise TaskNotFoundError(task_id)
        
        # Task exists but update failed - must be ownership issue
        raise TaskOwnershipError()

    async def delete_task(self, task_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """Delete a task with atomic ownership validation."""
        # Try atomic delete first
        deleted = await self.repo.delete_owned(task_id, user_id)
        if deleted:
            # Success - task was found and user owned it
            return True
        
        # If we get here, delete failed - distinguish between not found and not owned
        # NOTE: TOCTOU — task could be deleted between atomic op and this get().
        # In that edge case we may raise TaskOwnershipError instead of TaskNotFoundError.
        # Acceptable trade-off; revisit if strict error semantics are required.
        existing_task = await self.repo.get(task_id)
        if not existing_task:
            raise TaskNotFoundError(task_id)
        
        # Task exists but delete failed - must be ownership issue
        raise TaskOwnershipError()

    async def update_task_status(self, task_id: uuid.UUID, user_id: uuid.UUID, status: TaskStatus) -> TaskRead:
        """Internal method for updating task status (used by workers, not API)."""
        # Try atomic status update first
        updated = await self.repo.update_status_if_not_terminal(task_id, user_id, status.value)
        if updated is not None:
            # Success - task was found, owned, and status was updated
            return TaskRead.model_validate(updated, from_attributes=True)
        
        # If we get here, status update failed - distinguish reasons
        # NOTE: TOCTOU — task could be deleted between atomic op and this get().
        # In that edge case we may raise TaskOwnershipError instead of TaskNotFoundError.
        # Acceptable trade-off; revisit if strict error semantics are required.
        existing = await self.repo.get(task_id)
        if not existing:
            raise TaskNotFoundError(task_id)
        
        # Check ownership
        task_user_id = existing['user_id'] if isinstance(existing, dict) else existing.user_id
        if task_user_id != user_id:
            raise TaskOwnershipError()
        
        # Task exists and user owns it - must be terminal state violation
        current_status = existing['status'] if isinstance(existing, dict) else existing.status
        current_status = TaskStatus(current_status) if isinstance(current_status, str) else current_status
        raise TaskStateTransitionError(current_status, status)

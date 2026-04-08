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

    async def create_task(self, db: Any, user_id: uuid.UUID, data: TaskCreateRequest) -> TaskRead:
        """Create a new task for a user."""
        task = await self.repo.create(db, user_id, data)
        return TaskRead.model_validate(task)

    async def get_task(self, db: Any, task_id: uuid.UUID, user_id: uuid.UUID) -> TaskRead:
        """Get a task by ID, validating ownership."""
        task = await self.repo.get(db, task_id)
        if not task:
            raise TaskNotFoundError(task_id)
        
        # Use consistent dictionary access for all repo responses
        task_user_id = task['user_id'] if isinstance(task, dict) else task.user_id
        if task_user_id != user_id:
            raise TaskOwnershipError()
        
        return TaskRead.model_validate(task)

    async def list_tasks(self, db: Any, user_id: uuid.UUID) -> List[TaskRead]:
        """List all tasks for a user."""
        tasks = await self.repo.get_all_by_user(db, user_id)
        return [TaskRead.model_validate(task) for task in tasks]

    async def update_task(self, db: Any, task_id: uuid.UUID, user_id: uuid.UUID, data: TaskUpdateRequest) -> TaskRead:
        """Update a task with atomic ownership validation (only non-status fields)."""
        # First check if task exists to distinguish between not found and ownership errors
        existing_task = await self.repo.get(db, task_id)
        if not existing_task:
            raise TaskNotFoundError(task_id)
        
        # Update with atomic ownership check (status updates not allowed via API)
        updated_task = await self.repo.update_owned(db, task_id, user_id, data)
        if not updated_task:
            # Task exists but user doesn't own it
            raise TaskOwnershipError()
        return TaskRead.model_validate(updated_task)

    async def delete_task(self, db: Any, task_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """Delete a task with atomic ownership validation."""
        # First check if task exists to distinguish between not found and ownership errors
        existing_task = await self.repo.get(db, task_id)
        if not existing_task:
            raise TaskNotFoundError(task_id)
        
        # Delete with atomic ownership check
        deleted = await self.repo.delete_owned(db, task_id, user_id)
        if not deleted:
            # Task exists but user doesn't own it
            raise TaskOwnershipError()
        return True

    async def update_task_status(self, db: Any, task_id: uuid.UUID, user_id: uuid.UUID, status: TaskStatus) -> TaskRead:
        """Internal method for updating task status (used by workers, not API)."""
        # First check if task exists and user owns it
        existing_task = await self.repo.get(db, task_id)
        if not existing_task:
            raise TaskNotFoundError(task_id)
        
        # Check ownership
        task_user_id = existing_task['user_id'] if isinstance(existing_task, dict) else existing_task.user_id
        if task_user_id != user_id:
            raise TaskOwnershipError()
        
        # Validate status transitions
        current_status = existing_task['status'] if isinstance(existing_task, dict) else existing_task.status
        TERMINAL_STATES = {TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED}
        if current_status in TERMINAL_STATES:
            raise TaskStateTransitionError(current_status, status)
        
        # Update status atomically
        update_data = {"status": status}
        updated_task = await self.repo.update_owned(db, task_id, user_id, update_data)
        if not updated_task:
            raise TaskOwnershipError()
        return TaskRead.model_validate(updated_task)

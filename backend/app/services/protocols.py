"""
services/protocols.py
---------------------
Service protocols for dependency injection and testing.

Defines the interface that TaskService (and future services) must implement,
enabling route-level mocking without importing the concrete service.
"""

from typing import Protocol, List
import uuid

from app.schemas.task import TaskCreateRequest, TaskRead, TaskUpdateRequest, TaskStatus


class TaskServiceProtocol(Protocol):
    """Protocol defining the interface for task service implementations."""

    async def create_task(self, user_id: uuid.UUID, data: TaskCreateRequest) -> TaskRead:
        """Create a new task for a user."""
        ...

    async def get_task(self, task_id: uuid.UUID, user_id: uuid.UUID) -> TaskRead:
        """Get a task by ID, validating ownership."""
        ...

    async def list_tasks(self, user_id: uuid.UUID) -> List[TaskRead]:
        """List all tasks for a user."""
        ...

    async def update_task(self, task_id: uuid.UUID, user_id: uuid.UUID, data: TaskUpdateRequest) -> TaskRead:
        """Update a task with ownership validation."""
        ...

    async def delete_task(self, task_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """Delete a task with ownership validation."""
        ...

    async def update_task_status(self, task_id: uuid.UUID, user_id: uuid.UUID, status: TaskStatus) -> TaskRead:
        """Update task status (used by workers, not API)."""
        ...

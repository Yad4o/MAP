"""
db/repositories/protocols.py
---------------------------
Repository protocols for dependency injection and testing.

TaskRepositoryProtocol defines the interface that any task repository
must implement, enabling easy mocking and swapping of implementations.
"""

from typing import Any, Protocol
import uuid


class TaskRepositoryProtocol(Protocol):
    """Protocol defining the interface for task repositories."""

    async def create(self, db: Any, user_id: uuid.UUID, data: Any) -> Any:
        """Create a new task."""
        ...

    async def get(self, db: Any, task_id: uuid.UUID) -> Any | None:
        """Get a task by ID."""
        ...

    async def get_all_by_user(self, db: Any, user_id: uuid.UUID) -> list:
        """Get all tasks for a user."""
        ...

    async def update(self, db: Any, task_id: uuid.UUID, data: Any) -> Any | None:
        """Update a task."""
        ...

    async def update_owned(self, db: Any, task_id: uuid.UUID, user_id: uuid.UUID, data: Any) -> Any | None:
        """Update a task with ownership check atomically."""
        ...

    async def delete(self, db: Any, task_id: uuid.UUID) -> bool:
        """Delete a task."""
        ...

    async def delete_owned(self, db: Any, task_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """Delete a task with ownership check atomically."""
        ...

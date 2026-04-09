"""
db/repositories/protocols.py
---------------------------
Repository protocols for dependency injection and testing.

Task Repositories protocols for task management.

This module defines the interfaces that all task repositories
must implement, enabling easy mocking and swapping of implementations.
"""

from typing import Any, Protocol, runtime_checkable
import uuid
from app.schemas.task import TaskCreateRequest, TaskUpdateRequest


@runtime_checkable
class TaskRepositoryProtocol(Protocol):
    """
    Protocol defining the interface for task repositories.
    
    Note on ID Types:
        - All task_id parameters expect uuid.UUID type
        - User ID parameters expect uuid.UUID type  
        - Return types should match to underlying storage (ORM objects or dicts)
    """

    async def create(self, user_id: uuid.UUID, title: str, description: str, priority: int = 5, config: dict | None = None) -> Any:
        """
        Create a new task.
        
        Args:
            user_id: UUID of the user creating the Task
            title: Title of the task
            description: Description of the task
            priority: Priority integer
            config: Config dict
        
        Returns:
            Created task (ORM object or dict representation)
        """
        ...

    async def get(self, task_id: uuid.UUID) -> Any | None:
        """
        Get a task by ID.
        
        Args:
            task_id: UUID of the task to retrieve
        
        Returns:
            Task if found, None otherwise (ORM object or dict)
        """
        ...

    async def get_all_by_user(self, user_id: uuid.UUID) -> list:
        """
        Get all tasks for a user.
        
        Args:
            user_id: UUID of the user to fetch tasks for
        
        Returns:
            List of tasks (ORM objects or dict representations)
        """
        ...

    async def update(self, task_id: uuid.UUID, data: TaskUpdateRequest) -> Any | None:
        """
        Update a task.
        
        Args:
            task_id: UUID of the task to update
            data: Task update data (TaskUpdateRequest or similar)
        
        Returns:
            Updated task if found, None otherwise (ORM object or dict)
        """
        ...

    async def update_owned(self, task_id: uuid.UUID, user_id: uuid.UUID, data: TaskUpdateRequest) -> Any | None:
        """
        Update a task with ownership check atomically.
        
        Args:
            task_id: UUID of the Task to update
            user_id: UUID of the user who must own the Task
            data: Task update data (TaskUpdateRequest or similar)
        
        Returns:
            Updated task if found and owned, None otherwise (ORM object or dict)
        """
        ...

    async def update_status_if_not_terminal(self, task_id: uuid.UUID, user_id: uuid.UUID, new_status: str) -> Any | None:
        """
        Update task status atomically if current status is not terminal.
        
        Args:
            task_id: UUID of the Task to update
            user_id: UUID of the user who must own the Task
            new_status: New status string value
        
        Returns:
            Updated task if found and owned, None otherwise (ORM object or dict)
        """
        ...

    async def delete(self, task_id: uuid.UUID) -> bool:
        """
        Delete a task.
        
        Args:
            task_id: UUID of the task to delete
        
        Returns:
            True if deleted, False if not found
        """
        ...

    async def delete_owned(self, task_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """
        Delete a task with ownership check atomically.
        
        Args:
            task_id: UUID of the task to delete
            user_id: UUID of the user who must own the task
        
        Returns:
            True if deleted, False if not found or not owned
        """
        ...

"""
Service protocols for dependency injection and testing.
"""

from typing import Protocol, List

from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.task_simple import TaskCreate, TaskRead, TaskUpdate


class TaskServiceProtocol(Protocol):
    """Protocol for task service implementations."""
    
    async def create_task(self, db: AsyncSession, user_id: int, data: TaskCreate) -> TaskRead:
        """Create a new task for a user."""
        ...
    
    async def get_task(self, db: AsyncSession, task_id: int, user_id: int) -> TaskRead:
        """Get a specific task by ID for a user."""
        ...
    
    async def list_tasks(self, db: AsyncSession, user_id: int) -> List[TaskRead]:
        """List all tasks for a user."""
        ...
    
    async def update_task(self, db: AsyncSession, task_id: int, user_id: int, data: TaskUpdate) -> TaskRead:
        """Update a specific task for a user."""
        ...
    
    async def delete_task(self, db: AsyncSession, task_id: int, user_id: int) -> bool:
        """Delete a specific task for a user."""
        ...

"""
tests/mocks/task_repository.py
------------------------------
Mock implementation of TaskRepositoryProtocol for testing.

Uses in-memory dict storage with auto-incrementing integer IDs.
Returns dict objects matching TaskResponse schema shape.
"""

from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
import uuid

from app.db.repositories.protocols import TaskRepositoryProtocol
from app.db.models.task import Task


class MockTaskRepository(TaskRepositoryProtocol):
    """Mock task repository using in-memory storage for testing."""

    def __init__(self):
        # In-memory storage: {task_id: task}
        self._tasks: Dict[uuid.UUID, Task] = {}

    async def create(self, user_id: uuid.UUID, title: str, description: str, priority: int = 5, config: dict | None = None) -> Task:
        """Create a new task with UUID ID."""
        task_id = uuid.uuid4()

        # Convert TaskCreateRequest data to Task model
        task = Task(
            id=task_id,
            user_id=user_id,
            title=title,
            description=description,
            priority=priority,
            config=config,
            status="PENDING",
            task_type=None,
            retry_count=0,
            created_at=datetime.now(timezone.utc),
            started_at=None,
            completed_at=None,
            result=None,
            error=None,
        )

        self._tasks[task_id] = task
        return task

    async def get(self, task_id: uuid.UUID) -> Optional[Task]:
        """Get a task by ID, returns None if not found."""
        return self._tasks.get(task_id, None)

    async def get_all_by_user(self, user_id: uuid.UUID) -> List[Task]:
        """Get all tasks for a specific user."""
        return [
            task
            for task in self._tasks.values() 
            if task.user_id == user_id
        ]

    async def update(self, task_id: uuid.UUID, data: Any) -> Optional[Task]:
        """Update a task, returns None if not found."""
        if task_id not in self._tasks:
            return None

        task = self._tasks[task_id]
        update_data = data.model_dump(exclude_unset=True) if hasattr(data, 'model_dump') else data
        if 'status' in update_data and hasattr(update_data['status'], 'value'):
            update_data['status'] = update_data['status'].value
            
        for k, v in update_data.items():
            setattr(task, k, v)
        return task

    async def update_owned(self, task_id: uuid.UUID, user_id: uuid.UUID, data: Any) -> Optional[Task]:
        """Update a task with ownership check atomically, returns None if not found or not owned."""
        if task_id not in self._tasks:
            return None
        
        task = self._tasks[task_id]
        if task.user_id != user_id:
            return None

        update_data = data.model_dump(exclude_unset=True) if hasattr(data, 'model_dump') else data
        if 'status' in update_data and hasattr(update_data['status'], 'value'):
            update_data['status'] = update_data['status'].value
            
        for k, v in update_data.items():
            setattr(task, k, v)
        return task

    async def delete(self, task_id: uuid.UUID) -> bool:
        """Delete a task, returns False if not found."""
        if task_id not in self._tasks:
            return False
        
        del self._tasks[task_id]
        return True

    async def delete_owned(self, task_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """Delete a task with ownership check atomically, returns False if not found or not owned."""
        if task_id not in self._tasks:
            return False
        
        # Check ownership atomically
        if self._tasks[task_id].user_id != user_id:
            return False
        
        del self._tasks[task_id]
        return True

    async def update_status_if_not_terminal(self, task_id: uuid.UUID, user_id: uuid.UUID, new_status: str) -> Optional[Task]:
        """Update task status atomically if current status is not terminal."""
        if task_id not in self._tasks:
            return None
        
        task = self._tasks[task_id]
        if task.user_id != user_id:
            return None
        
        TERMINAL = {"COMPLETED", "FAILED", "CANCELLED"}
        if task.status in TERMINAL:
            return None
        
        task.status = new_status
        return task

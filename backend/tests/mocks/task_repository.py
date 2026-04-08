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


class MockTaskRepository(TaskRepositoryProtocol):
    """Mock task repository using in-memory storage for testing."""

    def __init__(self):
        # In-memory storage: {task_id: task_data}
        self._tasks: Dict[uuid.UUID, Dict[str, Any]] = {}

    async def create(self, db: Any, user_id: uuid.UUID, data: Any) -> Dict[str, Any]:
        """Create a new task with UUID ID."""
        task_id = uuid.uuid4()

        # Convert TaskCreateRequest data to dict
        task_data = {
            "id": task_id,
            "user_id": user_id,
            "title": data.title,
            "description": data.description,
            "priority": data.priority,
            "config": data.config,
            "status": "PENDING",
            "task_type": None,
            "retry_count": 0,
            "created_at": datetime.now(timezone.utc),
            "started_at": None,
            "completed_at": None,
            "result": None,
            "error": None,
        }

        self._tasks[task_id] = task_data
        return task_data.copy()

    async def get(self, db: Any, task_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        """Get a task by ID, returns None if not found."""
        task = self._tasks.get(task_id, None)
        return task.copy() if task is not None else None

    async def get_all_by_user(self, db: Any, user_id: uuid.UUID) -> List[Dict[str, Any]]:
        """Get all tasks for a specific user."""
        return [
            task.copy() 
            for task in self._tasks.values() 
            if task["user_id"] == user_id
        ]

    async def update(self, db: Any, task_id: uuid.UUID, data: Any) -> Optional[Dict[str, Any]]:
        """Update a task, returns None if not found."""
        if task_id not in self._tasks:
            return None

        # Convert TaskUpdate data to dict and update
        update_data = data.model_dump(exclude_unset=True) if hasattr(data, 'model_dump') else data
        # Ensure status is stored as string for consistency with TaskRead schema
        if 'status' in update_data and hasattr(update_data['status'], 'value'):
            update_data['status'] = update_data['status'].value
        self._tasks[task_id].update(update_data)
        return self._tasks[task_id].copy()

    async def update_owned(self, db: Any, task_id: uuid.UUID, user_id: uuid.UUID, data: Any) -> Optional[Dict[str, Any]]:
        """Update a task with ownership check atomically, returns None if not found or not owned."""
        if task_id not in self._tasks:
            return None
        
        # Check ownership atomically
        if self._tasks[task_id]["user_id"] != user_id:
            return None

        # Convert TaskUpdate data to dict and update
        update_data = data.model_dump(exclude_unset=True) if hasattr(data, 'model_dump') else data
        # Ensure status is stored as string for consistency with TaskRead schema
        if 'status' in update_data and hasattr(update_data['status'], 'value'):
            update_data['status'] = update_data['status'].value
        self._tasks[task_id].update(update_data)
        return self._tasks[task_id].copy()

    async def delete(self, db: Any, task_id: uuid.UUID) -> bool:
        """Delete a task, returns False if not found."""
        if task_id not in self._tasks:
            return False
        
        del self._tasks[task_id]
        return True

    async def delete_owned(self, db: Any, task_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """Delete a task with ownership check atomically, returns False if not found or not owned."""
        if task_id not in self._tasks:
            return False
        
        # Check ownership atomically
        if self._tasks[task_id]["user_id"] != user_id:
            return False
        
        del self._tasks[task_id]
        return True

    async def update_status_if_not_terminal(self, db: Any, task_id: uuid.UUID, user_id: uuid.UUID, new_status: str) -> Optional[Dict[str, Any]]:
        """Update task status atomically if current status is not terminal."""
        if task_id not in self._tasks:
            return None
        
        task = self._tasks[task_id]
        if task["user_id"] != user_id:
            return None
        
        TERMINAL = {"COMPLETED", "FAILED", "CANCELLED"}
        if task["status"] in TERMINAL:
            return None
        
        task["status"] = new_status
        return task.copy()

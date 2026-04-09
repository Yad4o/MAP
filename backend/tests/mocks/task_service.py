"""
Mock task service for testing.
"""

from typing import List
from fastapi import HTTPException
import uuid

from app.schemas.task import TaskCreateRequest, TaskRead, TaskUpdateRequest


class MockTaskService:
    """In-memory mock implementation of task service."""
    
    def __init__(self):
        self.tasks = []  # In-memory storage
        self.next_id = uuid.uuid4  # generate UUIDs, not ints

    async def create_task(self, db, user_id: uuid.UUID, data: TaskCreateRequest) -> TaskRead:
        """Create a new task."""
        task_id = self.next_id()
        task_dict = {
            "id": task_id,
            "user_id": user_id,
            "title": data.title,
            "description": data.description,
            "status": "PENDING",  # Match canonical schema
            "task_type": None,
            "priority": data.priority or 5,
            "retry_count": 0,
            "config": None,
            "created_at": "2026-04-09T00:00:00",
            "started_at": None,
            "completed_at": None,
            "result": None,
            "error": None
        }
        
        self.tasks.append(task_dict)
        
        return TaskRead(**task_dict)
    
    async def get_task(self, db, task_id: uuid.UUID, user_id: uuid.UUID) -> TaskRead:
        """Get a specific task by ID for a user."""
        task = next(
            (t for t in self.tasks if t["id"] == task_id and t["user_id"] == user_id),
            None
        )
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return TaskRead(**task)
    
    async def list_tasks(self, db, user_id: uuid.UUID) -> List[TaskRead]:
        """List all tasks for a user."""
        user_tasks = [t for t in self.tasks if t["user_id"] == user_id]
        return [TaskRead(**task) for task in user_tasks]
    
    async def update_task(self, db, task_id: uuid.UUID, user_id: uuid.UUID, data: TaskUpdateRequest) -> TaskRead:
        """Update a specific task for a user."""
        task = next(
            (t for t in self.tasks if t["id"] == task_id and t["user_id"] == user_id),
            None
        )
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Update fields that are provided in data
        if data.title is not None:
            task["title"] = data.title
        if data.description is not None:
            task["description"] = data.description
        if data.priority is not None:
            task["priority"] = data.priority
        if data.config is not None:
            task["config"] = data.config
        
        return TaskRead(**task)
    
    async def delete_task(self, db, task_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """Delete a specific task for a user."""
        task_index = next(
            (i for i, t in enumerate(self.tasks) if t["id"] == task_id and t["user_id"] == user_id),
            None
        )
        
        if task_index is None:
            raise HTTPException(status_code=404, detail="Task not found")
        
        del self.tasks[task_index]
        return True


# Singleton instance
_mock_service_instance = None


def get_mock_service():
    """Get or create the singleton mock service instance."""
    global _mock_service_instance
    if _mock_service_instance is None:
        _mock_service_instance = MockTaskService()
    return _mock_service_instance

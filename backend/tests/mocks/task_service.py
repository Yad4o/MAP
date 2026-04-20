"""
Mock task service for testing.
"""

import uuid
import datetime
from typing import List
from app.schemas.task import TaskCreateRequest, TaskRead, TaskUpdateRequest
from app.core.exceptions import TaskNotFoundError, TaskOwnershipError


class MockTaskService:
    """In-memory mock implementation of task service."""
    
    def __init__(self):
        self.tasks = []  # In-memory storage

    async def create_task(self, user_id: uuid.UUID, data: TaskCreateRequest) -> TaskRead:
        """Create a new task."""
        task_id = uuid.uuid4()
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
            "created_at": datetime.datetime.utcnow(),
            "updated_at": None,
            "started_at": None,
            "completed_at": None,
            "result": None,
            "error": None
        }
        
        self.tasks.append(task_dict)
        
        return TaskRead(**task_dict)
    
    async def get_task(self, task_id: uuid.UUID, user_id: uuid.UUID) -> TaskRead:
        """Get a specific task by ID for a user."""
        task = next(
            (t for t in self.tasks if t["id"] == task_id and t["user_id"] == user_id),
            None
        )
        
        if not task:
            raise TaskNotFoundError(task_id)
        
        return TaskRead(**task)
    
    async def list_tasks(self, user_id: uuid.UUID) -> List[TaskRead]:
        """List all tasks for a user."""
        user_tasks = [t for t in self.tasks if t["user_id"] == user_id]
        return [TaskRead(**task) for task in user_tasks]
    
    async def update_task(self, task_id: uuid.UUID, user_id: uuid.UUID, data: TaskUpdateRequest) -> TaskRead:
        """Update a specific task for a user."""
        task = next(
            (t for t in self.tasks if t["id"] == task_id and t["user_id"] == user_id),
            None
        )
        
        if not task:
            raise TaskNotFoundError(task_id)
        
        # Update fields that are provided in data
        if data.title is not None:
            task["title"] = data.title
        if data.description is not None:
            task["description"] = data.description
        if data.priority is not None:
            task["priority"] = data.priority
        if data.config is not None:
            task["config"] = data.config
        
        task["updated_at"] = datetime.datetime.utcnow()
        
        return TaskRead(**task)
    
    async def delete_task(self, task_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """Delete a specific task for a user."""
        task_index = next(
            (i for i, t in enumerate(self.tasks) if t["id"] == task_id and t["user_id"] == user_id),
            None
        )
        
        if task_index is None:
            raise TaskNotFoundError(task_id)
        
        del self.tasks[task_index]
        return True

    async def get_task_status(self, task_id: uuid.UUID, user_id: uuid.UUID):
        """Mock status polling."""
        from app.schemas.task import TaskStatusResponse
        task = next(
            (t for t in self.tasks if t["id"] == task_id and t["user_id"] == user_id),
            None
        )
        if not task:
            raise TaskNotFoundError(task_id)
        return TaskStatusResponse(task_id=task["id"], status=task["status"])



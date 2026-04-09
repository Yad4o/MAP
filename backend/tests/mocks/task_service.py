"""
Mock task service for testing.
"""

from typing import List
from fastapi import HTTPException

from app.services.protocols import TaskServiceProtocol
from app.schemas.task_simple import TaskCreate, TaskRead, TaskUpdate


class MockTaskService(TaskServiceProtocol):
    """In-memory mock implementation of TaskServiceProtocol."""
    
    def __init__(self):
        self.tasks = []  # In-memory storage
        self.next_id = 1


# Singleton instance
_mock_service_instance = None


def get_mock_service():
    """Get or create the singleton mock service instance."""
    global _mock_service_instance
    if _mock_service_instance is None:
        _mock_service_instance = MockTaskService()
    return _mock_service_instance


class MockTaskService(TaskServiceProtocol):
    """In-memory mock implementation of TaskServiceProtocol."""
    
    def __init__(self):
        self.tasks = []  # In-memory storage
        self.next_id = 1
    
    async def create_task(self, db, user_id: int, data: TaskCreate) -> TaskRead:
        """Create a new task."""
        task_dict = {
            "id": self.next_id,
            "user_id": user_id,
            "title": data.title,
            "description": data.description,
            "status": data.status or "pending",
            "priority": data.priority or "medium"
        }
        
        self.tasks.append(task_dict)
        self.next_id += 1
        
        return TaskRead(**task_dict)
    
    async def get_task(self, db, task_id: int, user_id: int) -> TaskRead:
        """Get a specific task by ID for a user."""
        task = next(
            (t for t in self.tasks if t["id"] == task_id and t["user_id"] == user_id),
            None
        )
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return TaskRead(**task)
    
    async def list_tasks(self, db, user_id: int) -> List[TaskRead]:
        """List all tasks for a user."""
        user_tasks = [t for t in self.tasks if t["user_id"] == user_id]
        return [TaskRead(**task) for task in user_tasks]
    
    async def update_task(self, db, task_id: int, user_id: int, data: TaskUpdate) -> TaskRead:
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
        if data.status is not None:
            task["status"] = data.status
        if data.priority is not None:
            task["priority"] = data.priority
        
        return TaskRead(**task)
    
    async def delete_task(self, db, task_id: int, user_id: int) -> bool:
        """Delete a specific task for a user."""
        task_index = next(
            (i for i, t in enumerate(self.tasks) if t["id"] == task_id and t["user_id"] == user_id),
            None
        )
        
        if task_index is None:
            raise HTTPException(status_code=404, detail="Task not found")
        
        del self.tasks[task_index]
        return True

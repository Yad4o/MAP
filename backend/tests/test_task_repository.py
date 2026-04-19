"""
test_task_repository.py
────────────────────
Pytest async tests for TaskRepository and TaskStepRepository.
Covers: create, get, get_all_by_user, update, delete, and step operations.
"""

import uuid
import pytest
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.task_repo import TaskRepository, TaskStepRepository
from app.schemas.task import TaskStatus

pytestmark = pytest.mark.asyncio


@pytest.fixture
def task_repo(db_session: AsyncSession) -> TaskRepository:
    return TaskRepository(db_session)


@pytest.fixture
def step_repo(db_session: AsyncSession) -> TaskStepRepository:
    return TaskStepRepository(db_session)


class TestTaskRepository:
    """Test suite for TaskRepository methods."""

    async def test_create_task(self, task_repo: TaskRepository, test_user: uuid.UUID):
        """Test creating a new task."""
        task = await task_repo.create(
            user_id=test_user,
            title="Test Task",
            description="This is a test task description"
        )
        
        assert task is not None
        assert task.title == "Test Task"
        assert task.description == "This is a test task description"
        assert task.status == "PENDING"
        assert task.user_id == test_user
        assert task.id is not None
        assert task.created_at is not None

    async def test_get_task_by_id(self, task_repo: TaskRepository, test_user: uuid.UUID):
        """Test retrieving a task by ID."""
        # First create a task
        created_task = await task_repo.create(
            user_id=test_user,
            title="Test Task",
            description="Test description"
        )
        
        # Then retrieve it
        retrieved_task = await task_repo.get_by_id(created_task.id)
        
        assert retrieved_task is not None
        assert retrieved_task.id == created_task.id
        assert retrieved_task.title == "Test Task"
        assert retrieved_task.user_id == test_user

    async def test_get_nonexistent_task(self, task_repo: TaskRepository):
        """Test retrieving a non-existent task returns None."""
        fake_id = uuid.uuid4()
        task = await task_repo.get_by_id(fake_id)
        assert task is None

    async def test_get_all_tasks_by_user(self, task_repo: TaskRepository, test_user: uuid.UUID):
        """Test retrieving all tasks for a user."""
        # Create multiple tasks
        tasks_data = [
            {"title": "Task 1", "description": "First task"},
            {"title": "Task 2", "description": "Second task"},
            {"title": "Task 3", "description": "Third task"}
        ]
        
        for task_data in tasks_data:
            await task_repo.create(
                user_id=test_user,
                title=task_data["title"],
                description=task_data["description"]
            )
        
        # Retrieve all tasks for user
        all_tasks = await task_repo.get_all_by_user(test_user)
        
        assert len(all_tasks) == 3
        task_titles = [task.title for task in all_tasks]
        assert set(task_titles) == {"Task 1", "Task 2", "Task 3"}

    async def test_update_task_status(self, task_repo: TaskRepository, test_user: uuid.UUID):
        """Test updating a task."""
        # Create a task
        task = await task_repo.create(
            user_id=test_user,
            title="Original Task",
            description="Original description"
        )
        
        # Update the task status
        await task_repo.update_status(task.id, TaskStatus.COMPLETED)
        
        # Verify update
        updated_task = await task_repo.get_by_id(task.id)
        assert updated_task.status == TaskStatus.COMPLETED

    async def test_delete_task(self, task_repo: TaskRepository, test_user: uuid.UUID):
        """Test deleting a task."""
        # Create a task
        task = await task_repo.create(
            user_id=test_user,
            title="Task to delete",
            description="Will be deleted"
        )
        task_id = task.id
        
        # Delete the task
        result = await task_repo.delete(task_id)
        assert result is True
        
        # Verify task is gone
        deleted_task = await task_repo.get_by_id(task_id)
        assert deleted_task is None

    async def test_delete_nonexistent_task(self, task_repo: TaskRepository):
        """Test deleting a non-existent task returns False."""
        fake_id = uuid.uuid4()
        result = await task_repo.delete(fake_id)
        assert result is False

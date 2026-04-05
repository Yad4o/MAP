"""
test_task_repository_simple.py
─────────────────────────────
Simplified tests for TaskRepository without User model dependencies.
"""

import uuid
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.task import TaskRepository, TaskStepRepository


@pytest.fixture
def task_repo(db_session: AsyncSession) -> TaskRepository:
    return TaskRepository(db_session)


@pytest.fixture
def step_repo(db_session: AsyncSession) -> TaskStepRepository:
    return TaskStepRepository(db_session)


@pytest.fixture
def test_user_id() -> str:
    """Return a test user ID as string without creating a User model."""
    return str(uuid.uuid4())


class TestTaskRepository:
    """Test suite for TaskRepository methods."""

    async def test_create_task_success(self, task_repo: TaskRepository, test_user_id: str):
        """Test creating a new task successfully."""
        task_data = {
            "title": "Test Task",
            "description": "This is a test task description"
        }
        
        # This should work without requiring a User model
        task = await task_repo.create(test_user_id, task_data)
        
        assert task is not None
        assert task.title == "Test Task"
        assert task.description == "This is a test task description"
        assert task.status == "pending"
        assert task.user_id == test_user_id
        assert task.id is not None
        assert task.created_at is not None

    async def test_create_task_minimal(self, task_repo: TaskRepository, test_user_id: str):
        """Test creating a task with minimal data."""
        task_data = {
            "title": "Minimal Task"
            # description is optional
        }
        
        task = await task_repo.create(test_user_id, task_data)
        
        assert task is not None
        assert task.title == "Minimal Task"
        assert task.description is None
        assert task.status == "pending"

    async def test_get_task_by_id(self, task_repo: TaskRepository, test_user_id: str):
        """Test retrieving a task by ID."""
        # Create a task first
        task_data = {
            "title": "Test Task for Get",
            "description": "Test description"
        }
        created_task = await task_repo.create(test_user_id, task_data)
        
        # Then retrieve it
        retrieved_task = await task_repo.get(created_task.id)
        
        assert retrieved_task is not None
        assert retrieved_task.id == created_task.id
        assert retrieved_task.title == "Test Task for Get"
        assert retrieved_task.user_id == test_user_id

    async def test_get_nonexistent_task(self, task_repo: TaskRepository):
        """Test retrieving a non-existent task returns None."""
        fake_id = uuid.uuid4()
        task = await task_repo.get(fake_id)
        assert task is None

    async def test_get_all_tasks_by_user_empty(self, task_repo: TaskRepository, test_user_id: str):
        """Test retrieving tasks for user with no tasks."""
        tasks = await task_repo.get_all_by_user(test_user_id)
        assert tasks == []

    async def test_get_all_tasks_by_user_multiple(self, task_repo: TaskRepository, test_user_id: str):
        """Test retrieving multiple tasks for a user."""
        # Create multiple tasks
        tasks_data = [
            {"title": "Task 1", "description": "First task"},
            {"title": "Task 2", "description": "Second task"},
            {"title": "Task 3", "description": "Third task"}
        ]
        
        created_tasks = []
        for task_data in tasks_data:
            task = await task_repo.create(test_user_id, task_data)
            created_tasks.append(task)
        
        # Retrieve all tasks for user
        all_tasks = await task_repo.get_all_by_user(test_user_id)
        
        assert len(all_tasks) == 3
        # Tasks should be ordered by created_at desc
        task_titles = [task.title for task in all_tasks]
        assert "Task 3" in task_titles
        assert "Task 2" in task_titles
        assert "Task 1" in task_titles

    async def test_update_task(self, task_repo: TaskRepository, test_user_id: str):
        """Test updating a task."""
        # Create a task
        task_data = {
            "title": "Original Task",
            "description": "Original description"
        }
        task = await task_repo.create(test_user_id, task_data)
        
        # Update the task
        update_data = {
            "status": "completed",
            "description": "Updated description"
        }
        updated_task = await task_repo.update(task.id, update_data)
        
        assert updated_task is not None
        assert updated_task.id == task.id
        assert updated_task.status == "completed"
        assert updated_task.description == "Updated description"

    async def test_update_nonexistent_task(self, task_repo: TaskRepository):
        """Test updating a non-existent task returns None."""
        fake_id = uuid.uuid4()
        update_data = {"status": "completed"}
        result = await task_repo.update(fake_id, update_data)
        assert result is None

    async def test_delete_task(self, task_repo: TaskRepository, test_user_id: str):
        """Test deleting a task."""
        # Create a task
        task_data = {"title": "Task to delete", "description": "Will be deleted"}
        task = await task_repo.create(test_user_id, task_data)
        task_id = task.id
        
        # Delete the task
        result = await task_repo.delete(task_id)
        assert result is True
        
        # Verify task is gone
        deleted_task = await task_repo.get(task_id)
        assert deleted_task is None

    async def test_delete_nonexistent_task(self, task_repo: TaskRepository):
        """Test deleting a non-existent task returns False."""
        fake_id = uuid.uuid4()
        result = await task_repo.delete(fake_id)
        assert result is False


class TestTaskStepRepository:
    """Test suite for TaskStepRepository methods."""

    async def test_create_step(self, step_repo: TaskStepRepository, test_user_id: str):
        """Test creating a new task step."""
        # First create a task to associate with the step
        task_repo = TaskRepository(step_repo.db)
        task_data = {"title": "Parent Task", "description": "Task with steps"}
        task = await task_repo.create(test_user_id, task_data)
        
        # Create a step
        step_data = {
            "title": "Test Step",
            "order": 1,
            "step_index": 1,
            "step_type": "test"
        }
        step = await step_repo.create(task.id, step_data)
        
        assert step is not None
        assert step.title == "Test Step"
        assert step.order == 1
        assert step.task_id == task.id
        assert step.id is not None
        assert step.created_at is not None

    async def test_get_steps_by_task_empty(self, step_repo: TaskStepRepository, test_user_id: str):
        """Test retrieving steps for task with no steps."""
        # Create a task first
        task_repo = TaskRepository(step_repo.db)
        task_data = {"title": "Empty Task", "description": "Task with no steps"}
        task = await task_repo.create(test_user_id, task_data)
        
        # Retrieve steps
        steps = await step_repo.get_by_task(task.id)
        assert steps == []

    async def test_get_steps_by_task_multiple(self, step_repo: TaskStepRepository, test_user_id: str):
        """Test retrieving multiple steps for a task."""
        # Create a task first
        task_repo = TaskRepository(step_repo.db)
        task_data = {"title": "Task with multiple steps", "description": "Test task"}
        task = await task_repo.create(test_user_id, task_data)
        
        # Create multiple steps
        steps_data = [
            {"title": "Step 1", "order": 1, "step_index": 1, "step_type": "test"},
            {"title": "Step 2", "order": 2, "step_index": 2, "step_type": "test"},
            {"title": "Step 3", "order": 3, "step_index": 3, "step_type": "test"}
        ]
        
        created_steps = []
        for step_data in steps_data:
            step = await step_repo.create(task.id, step_data)
            created_steps.append(step)
        
        # Retrieve all steps for the task
        all_steps = await step_repo.get_by_task(task.id)
        
        assert len(all_steps) == 3
        # Steps should be ordered by 'order' field
        step_titles = [step.title for step in all_steps]
        assert step_titles == ["Step 1", "Step 2", "Step 3"]

    async def test_delete_step(self, step_repo: TaskStepRepository, test_user_id: str):
        """Test deleting a task step."""
        # Create a task and step
        task_repo = TaskRepository(step_repo.db)
        task_data = {"title": "Task with step to delete", "description": "Test task"}
        task = await task_repo.create(test_user_id, task_data)
        
        step_data = {"title": "Step to delete", "order": 1, "step_index": 1, "step_type": "test"}
        step = await step_repo.create(task.id, step_data)
        step_id = step.id
        
        # Delete the step
        result = await step_repo.delete(step_id)
        assert result is True
        
        # Verify step is gone
        remaining_steps = await step_repo.get_by_task(task.id)
        assert len(remaining_steps) == 0

    async def test_delete_nonexistent_step(self, step_repo: TaskStepRepository):
        """Test deleting a non-existent step returns False."""
        fake_id = uuid.uuid4()
        result = await step_repo.delete(fake_id)
        assert result is False

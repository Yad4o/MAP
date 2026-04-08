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

from app.db.repositories.task import TaskRepository, TaskStepRepository

pytestmark = pytest.mark.asyncio


@pytest.fixture
def task_repo() -> TaskRepository:
    return TaskRepository()


@pytest.fixture
def step_repo(db_session: AsyncSession) -> TaskStepRepository:
    return TaskStepRepository(db_session)


class TestTaskRepository:
    """Test suite for TaskRepository methods."""

    async def test_create_task(self, task_repo: TaskRepository, db_session: AsyncSession, test_user: uuid.UUID):
        """Test creating a new task."""
        task_data = {
            "title": "Test Task",
            "description": "This is a test task description"
        }
        
        task = await task_repo.create(db_session, test_user, task_data)
        
        assert task is not None
        assert task.title == "Test Task"
        assert task.description == "This is a test task description"
        assert task.status == "PENDING"
        assert task.user_id == test_user
        assert str(task.id) is not None
        assert task.created_at is not None

    async def test_get_task_by_id(self, task_repo: TaskRepository, db_session: AsyncSession, test_user: uuid.UUID):
        """Test retrieving a task by ID."""
        # First create a task
        task_data = {
            "title": "Test Task",
            "description": "Test description"
        }
        created_task = await task_repo.create(db_session, test_user, task_data)
        
        # Then retrieve it
        retrieved_task = await task_repo.get(db_session, created_task.id)
        
        assert retrieved_task is not None
        assert retrieved_task.id == created_task.id
        assert retrieved_task.title == "Test Task"
        assert retrieved_task.user_id == test_user

    async def test_get_nonexistent_task(self, task_repo: TaskRepository, db_session: AsyncSession):
        """Test retrieving a non-existent task returns None."""
        fake_id = uuid.uuid4()
        task = await task_repo.get(db_session, fake_id)
        assert task is None

    async def test_get_all_tasks_by_user(self, task_repo: TaskRepository, db_session: AsyncSession, test_user: uuid.UUID):
        """Test retrieving all tasks for a user."""
        # Create multiple tasks
        tasks_data = [
            {"title": "Task 1", "description": "First task"},
            {"title": "Task 2", "description": "Second task"},
            {"title": "Task 3", "description": "Third task"}
        ]
        
        created_tasks = []
        for i, task_data in enumerate(tasks_data):
            task = await task_repo.create(db_session, test_user, task_data)
            created_tasks.append(task)
            # Add small delay to ensure different timestamps
            if i < len(tasks_data) - 1:
                await asyncio.sleep(0.01)
        
        # Retrieve all tasks for user
        all_tasks = await task_repo.get_all_by_user(db_session, test_user)
        
        assert len(all_tasks) == 3
        # Check that tasks are ordered by created_at desc (newest first)
        # Print debug info to see what's happening
        print(f"Task order: {[task.title for task in all_tasks]}")
        print(f"Created times: {[task.created_at for task in all_tasks]}")
        
        task_titles = [task.title for task in all_tasks]
        assert set(task_titles) == {"Task 1", "Task 2", "Task 3"}
        # verify descending order by created_at
        for i in range(len(all_tasks) - 1):
            assert all_tasks[i].created_at >= all_tasks[i + 1].created_at

    async def test_get_all_tasks_for_user_with_no_tasks(self, task_repo: TaskRepository, db_session: AsyncSession, test_user: uuid.UUID):
        """Test retrieving tasks for user with no tasks."""
        tasks = await task_repo.get_all_by_user(db_session, test_user)
        assert tasks == []

    async def test_update_task_status(self, task_repo: TaskRepository, db_session: AsyncSession, test_user: uuid.UUID):
        """Test updating a task."""
        # Create a task
        task_data = {
            "title": "Original Task",
            "description": "Original description"
        }
        task = await task_repo.create(db_session, test_user, task_data)
        
        # Update the task
        update_data = {
            "status": "completed",
            "description": "Updated description"
        }
        updated_task = await task_repo.update(db_session, task.id, update_data)
        
        assert updated_task is not None
        assert updated_task.id == task.id
        assert updated_task.status == "completed"
        assert updated_task.description == "Updated description"

    async def test_update_nonexistent_task(self, task_repo: TaskRepository, db_session: AsyncSession):
        """Test updating a non-existent task returns None."""
        fake_id = uuid.uuid4()
        update_data = {"status": "completed"}
        result = await task_repo.update(db_session, fake_id, update_data)
        assert result is None

    async def test_delete_task(self, task_repo: TaskRepository, db_session: AsyncSession, test_user: uuid.UUID):
        """Test deleting a task."""
        # Create a task
        task_data = {"title": "Task to delete", "description": "Will be deleted"}
        task = await task_repo.create(db_session, test_user, task_data)
        task_id = task.id
        
        # Delete the task
        result = await task_repo.delete(db_session, task_id)
        assert result is True
        
        # Verify task is gone
        deleted_task = await task_repo.get(db_session, task_id)
        assert deleted_task is None

    async def test_delete_nonexistent_task(self, task_repo: TaskRepository, db_session: AsyncSession):
        """Test deleting a non-existent task returns False."""
        fake_id = uuid.uuid4()
        result = await task_repo.delete(db_session, fake_id)
        assert result is False


class TestTaskStepRepository:
    """Test suite for TaskStepRepository methods."""

    async def test_create_step(self, step_repo: TaskStepRepository, db_session: AsyncSession, test_user: uuid.UUID):
        """Test creating a new task step."""
        # First create a task to associate with the step
        task_repo = TaskRepository()
        task_data = {"title": "Parent Task", "description": "Task with steps"}
        task = await task_repo.create(db_session, test_user, task_data)
        
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

    async def test_get_steps_by_task(self, step_repo: TaskStepRepository, db_session: AsyncSession, test_user: uuid.UUID):
        """Test retrieving all steps for a task."""
        # Create a task first
        task_repo = TaskRepository()
        task_data = {"title": "Task with multiple steps", "description": "Test task"}
        task = await task_repo.create(db_session, test_user, task_data)
        
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
        assert all_steps[0].title == "Step 1"
        assert all_steps[1].title == "Step 2"
        assert all_steps[2].title == "Step 3"

    async def test_get_steps_for_task_with_no_steps(self, step_repo: TaskStepRepository, db_session: AsyncSession, test_user: uuid.UUID):
        """Test retrieving steps for task with no steps."""
        # Create a task first
        task_repo = TaskRepository()
        task_data = {"title": "Empty Task", "description": "Task with no steps"}
        task = await task_repo.create(db_session, test_user, task_data)
        
        # Retrieve steps
        steps = await step_repo.get_by_task(task.id)
        assert steps == []

    async def test_delete_step(self, step_repo: TaskStepRepository, db_session: AsyncSession, test_user: uuid.UUID):
        """Test deleting a task step."""
        # Create a task and step
        task_repo = TaskRepository()
        task_data = {"title": "Task with step to delete", "description": "Test task"}
        task = await task_repo.create(db_session, test_user, task_data)
        
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

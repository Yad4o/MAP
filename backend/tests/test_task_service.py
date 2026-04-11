"""
tests/test_task_service.py
---------------------------
Unit tests for TaskService using MockTaskRepository.

Tests cover all CRUD operations with ownership validation
and error handling using HTTPException.
"""

import pytest
import uuid
from typing import Any

from app.services.task_service import TaskService
from tests.mocks.task_repository import MockTaskRepository
from app.schemas.task import TaskCreateRequest, TaskUpdateRequest, TaskStatus, TaskRead
from app.core.exceptions import TaskNotFoundError, TaskOwnershipError, TaskStateTransitionError
from unittest.mock import patch


@pytest.fixture
def mock_repo():
    """Fixture providing a MockTaskRepository instance."""
    return MockTaskRepository()


@pytest.fixture
def task_service(mock_repo):
    """Fixture providing a TaskService with mock repository."""
    return TaskService(mock_repo)


@pytest.fixture
def sample_task_data():
    """Sample task creation data."""
    return TaskCreateRequest(
        title="Test Task",
        description="This is a test task description",
        priority=5,
        config={"key": "value"}
    )


@pytest.fixture
def sample_update_data():
    """Sample task update data."""
    return TaskUpdateRequest(
        title="Updated Task Title"
    )


class TestTaskService:
    """Test suite for TaskService."""

    @pytest.fixture(autouse=True)
    def mock_celery(self):
        """Automatically mock the Celery task for all tests in this class."""
        with patch("app.routes.tasks.process_task.apply_async") as mocked:
            yield mocked

    @pytest.mark.asyncio
    async def test_create_task_returns_correct_shape(self, task_service, mock_repo, sample_task_data):
        """Test that create_task returns a task with correct shape."""
        # Arrange
        user_id = uuid.uuid4()
        
        # Act
        result = await task_service.create_task(user_id=user_id, data=sample_task_data)
        
        # Assert
        assert result.title == "Test Task"
        assert result.description == "This is a test task description"
        assert result.priority == 5
        assert result.status == TaskStatus.PENDING
        assert result.config == {"key": "value"}
        assert result.user_id == user_id
        assert result.id is not None

    @pytest.mark.asyncio
    async def test_get_task_raises_ownership_error_for_wrong_user(self, task_service, mock_repo, sample_task_data):
        """Test that get_task raises TaskOwnershipError when task belongs to different user."""
        # Arrange - create task for user 1
        user1_id = uuid.uuid4()
        user2_id = uuid.uuid4()
        created_task = await task_service.create_task(user_id=user1_id, data=sample_task_data)
        
        # Act & Assert - try to get task as user 2
        with pytest.raises(TaskOwnershipError):
            await task_service.get_task(task_id=created_task.id, user_id=user2_id)

    @pytest.mark.asyncio
    async def test_get_task_raises_not_found_for_nonexistent_task(self, task_service):
        """Test that get_task raises TaskNotFoundError when task doesn't exist."""
        fake_uuid = uuid.uuid4()
        fake_user_id = uuid.uuid4()
        with pytest.raises(TaskNotFoundError):
            await task_service.get_task(task_id=fake_uuid, user_id=fake_user_id)

    @pytest.mark.asyncio
    async def test_list_tasks_returns_only_user_tasks(self, task_service, mock_repo, sample_task_data):
        """Test that list_tasks returns only tasks belonging to the user."""
        # Arrange - create tasks for different users
        user1_id = uuid.uuid4()
        user2_id = uuid.uuid4()
        task1 = await task_service.create_task(user_id=user1_id, data=sample_task_data)
        task2 = await task_service.create_task(user_id=user1_id, data=sample_task_data)
        task3 = await task_service.create_task(user_id=user2_id, data=sample_task_data)
        
        # Act
        user1_tasks = await task_service.list_tasks(user_id=user1_id)
        user2_tasks = await task_service.list_tasks(user_id=user2_id)
        
        # Assert
        assert len(user1_tasks) == 2
        assert all(task.user_id == user1_id for task in user1_tasks)
        assert len(user2_tasks) == 1
        assert user2_tasks[0].user_id == user2_id

    @pytest.mark.asyncio
    async def test_update_task_changes_status(self, task_service, mock_repo, sample_task_data):
        """Test that update_task successfully changes status via internal method."""
        # Arrange
        user_id = uuid.uuid4()
        created_task = await task_service.create_task(user_id=user_id, data=sample_task_data)
        assert created_task.status == TaskStatus.PENDING
        
        # Act - use internal status update method
        updated_task = await task_service.update_task_status(
            task_id=created_task.id, user_id=user_id, status=TaskStatus.COMPLETED
        )
        
        # Assert
        assert updated_task.status == TaskStatus.COMPLETED
        assert updated_task.id == created_task.id

    @pytest.mark.asyncio
    async def test_update_task_changes_title(self, task_service, mock_repo, sample_task_data, sample_update_data):
        """Test that update_task successfully changes title."""
        # Arrange
        user_id = uuid.uuid4()
        created_task = await task_service.create_task(user_id=user_id, data=sample_task_data)
        
        # Act
        updated_task = await task_service.update_task(
            task_id=created_task.id, user_id=user_id, data=sample_update_data
        )
        
        # Assert
        assert updated_task.title == "Updated Task Title"
        assert updated_task.id == created_task.id

    @pytest.mark.asyncio
    async def test_update_task_raises_ownership_error_for_wrong_user(self, task_service, mock_repo, sample_task_data, sample_update_data):
        """Test that update_task raises TaskOwnershipError when trying to update another user's task."""
        # Arrange
        user1_id = uuid.uuid4()
        user2_id = uuid.uuid4()
        created_task = await task_service.create_task(user_id=user1_id, data=sample_task_data)
        
        # Act & Assert
        with pytest.raises(TaskOwnershipError):
            await task_service.update_task(
                task_id=created_task.id, user_id=user2_id, data=sample_update_data
            )

    @pytest.mark.asyncio
    async def test_update_task_raises_transition_error_from_completed_state(self, task_service, mock_repo, sample_task_data):
        """Test that update_task_status raises TaskStateTransitionError when trying to update a completed task."""
        # Arrange
        user_id = uuid.uuid4()
        created_task = await task_service.create_task(user_id=user_id, data=sample_task_data)
        
        # First update task to COMPLETED state using internal method
        await task_service.update_task_status(task_id=created_task.id, user_id=user_id, status=TaskStatus.COMPLETED)
        
        # Try to update completed task back to PENDING
        # Act & Assert
        with pytest.raises(TaskStateTransitionError) as exc_info:
            await task_service.update_task_status(
                task_id=created_task.id, user_id=user_id, status=TaskStatus.PENDING
            )
        
        assert exc_info.value.current_status == TaskStatus.COMPLETED
        assert exc_info.value.new_status == TaskStatus.PENDING

    @pytest.mark.asyncio
    async def test_delete_task_returns_true(self, task_service, mock_repo, sample_task_data):
        """Test that delete_task returns True when successful."""
        # Arrange
        user_id = uuid.uuid4()
        created_task = await task_service.create_task(user_id=user_id, data=sample_task_data)
        
        # Act
        result = await task_service.delete_task(task_id=created_task.id, user_id=user_id)
        
        # Assert
        assert result is True
        
        # Verify task is actually deleted
        with pytest.raises(TaskNotFoundError):
            await task_service.get_task(task_id=created_task.id, user_id=user_id)

    @pytest.mark.asyncio
    async def test_delete_task_raises_not_found_for_nonexistent_task(self, task_service):
        """Test that delete_task raises TaskNotFoundError when task doesn't exist."""
        fake_uuid = uuid.uuid4()
        fake_user_id = uuid.uuid4()
        with pytest.raises(TaskNotFoundError):
            await task_service.delete_task(task_id=fake_uuid, user_id=fake_user_id)

    @pytest.mark.asyncio
    async def test_delete_task_raises_ownership_error_for_wrong_user(self, task_service, mock_repo, sample_task_data):
        """Test that delete_task raises TaskOwnershipError when trying to delete another user's task."""
        # Arrange
        user1_id = uuid.uuid4()
        user2_id = uuid.uuid4()
        created_task = await task_service.create_task(user_id=user1_id, data=sample_task_data)
        
        # Act & Assert
        with pytest.raises(TaskOwnershipError):
            await task_service.delete_task(task_id=created_task.id, user_id=user2_id)

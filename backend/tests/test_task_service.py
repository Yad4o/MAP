"""
tests/test_task_service.py
---------------------------
Unit tests for TaskService using MockTaskRepository.

Tests cover all CRUD operations with ownership validation
and error handling using HTTPException.
"""

import pytest
from fastapi import HTTPException, status
import uuid

from app.services.task_service import TaskService
from tests.mocks.task_repository import MockTaskRepository
from app.schemas.task import TaskCreateRequest, TaskUpdateRequest, TaskStatus, TaskRead


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
        status=TaskStatus.COMPLETED,
        title="Updated Task Title"
    )


class TestTaskService:
    """Test suite for TaskService."""

    @pytest.mark.asyncio
    async def test_create_task_returns_correct_shape(self, task_service, mock_repo, sample_task_data):
        """Test that create_task returns a task with correct shape."""
        # Arrange
        user_id = uuid.uuid4()
        
        # Act
        result = await task_service.create_task(None, user_id=user_id, data=sample_task_data)
        
        # Assert
        assert result.title == "Test Task"
        assert result.description == "This is a test task description"
        assert result.priority == 5
        assert result.status == "PENDING"
        assert result.config == {"key": "value"}
        assert result.user_id == user_id
        assert result.id is not None

    @pytest.mark.asyncio
    async def test_get_task_raises_404_for_wrong_user(self, task_service, mock_repo, sample_task_data):
        """Test that get_task raises 404 when task belongs to different user."""
        # Arrange - create task for user 1
        user1_id = uuid.uuid4()
        user2_id = uuid.uuid4()
        created_task = await task_service.create_task(None, user_id=user1_id, data=sample_task_data)
        
        # Act & Assert - try to get task as user 2
        with pytest.raises(HTTPException) as exc_info:
            await task_service.get_task(None, task_id=created_task.id, user_id=user2_id)
        
        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
        assert exc_info.value.detail == "Task not found"

    @pytest.mark.asyncio
    async def test_get_task_raises_404_for_nonexistent_task(self, task_service):
        """Test that get_task raises 404 when task doesn't exist."""
        fake_uuid = uuid.uuid4()
        fake_user_id = uuid.uuid4()
        with pytest.raises(HTTPException) as exc_info:
            await task_service.get_task(None, task_id=fake_uuid, user_id=fake_user_id)
        
        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
        assert exc_info.value.detail == "Task not found"

    @pytest.mark.asyncio
    async def test_list_tasks_returns_only_user_tasks(self, task_service, mock_repo, sample_task_data):
        """Test that list_tasks returns only tasks belonging to the user."""
        # Arrange - create tasks for different users
        user1_id = uuid.uuid4()
        user2_id = uuid.uuid4()
        task1 = await task_service.create_task(None, user_id=user1_id, data=sample_task_data)
        task2 = await task_service.create_task(None, user_id=user1_id, data=sample_task_data)
        task3 = await task_service.create_task(None, user_id=user2_id, data=sample_task_data)
        
        # Act
        user1_tasks = await task_service.list_tasks(None, user_id=user1_id)
        user2_tasks = await task_service.list_tasks(None, user_id=user2_id)
        
        # Assert
        assert len(user1_tasks) == 2
        assert all(task.user_id == user1_id for task in user1_tasks)
        assert len(user2_tasks) == 1
        assert user2_tasks[0].user_id == user2_id

    @pytest.mark.asyncio
    async def test_update_task_changes_status(self, task_service, mock_repo, sample_task_data, sample_update_data):
        """Test that update_task successfully changes task status."""
        # Arrange
        user_id = uuid.uuid4()
        created_task = await task_service.create_task(None, user_id=user_id, data=sample_task_data)
        assert created_task.status == "PENDING"
        
        # Act
        updated_task = await task_service.update_task(
            None, task_id=created_task.id, user_id=user_id, data=sample_update_data
        )
        
        # Assert
        assert updated_task.status == TaskStatus.COMPLETED
        assert updated_task.title == "Updated Task Title"
        assert updated_task.id == created_task.id

    @pytest.mark.asyncio
    async def test_update_task_raises_404_for_wrong_user(self, task_service, mock_repo, sample_task_data, sample_update_data):
        """Test that update_task raises 404 when trying to update another user's task."""
        # Arrange
        user1_id = uuid.uuid4()
        user2_id = uuid.uuid4()
        created_task = await task_service.create_task(None, user_id=user1_id, data=sample_task_data)
        
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await task_service.update_task(
                None, task_id=created_task.id, user_id=user2_id, data=sample_update_data
            )
        
        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
        assert exc_info.value.detail == "Task not found"

    @pytest.mark.asyncio
    async def test_delete_task_returns_true(self, task_service, mock_repo, sample_task_data):
        """Test that delete_task returns True when successful."""
        # Arrange
        user_id = uuid.uuid4()
        created_task = await task_service.create_task(None, user_id=user_id, data=sample_task_data)
        
        # Act
        result = await task_service.delete_task(None, task_id=created_task.id, user_id=user_id)
        
        # Assert
        assert result is True
        
        # Verify task is actually deleted
        with pytest.raises(HTTPException):
            await task_service.get_task(None, task_id=created_task.id, user_id=user_id)

    @pytest.mark.asyncio
    async def test_delete_task_raises_404_for_nonexistent_task(self, task_service):
        """Test that delete_task raises 404 when task doesn't exist."""
        fake_uuid = uuid.uuid4()
        fake_user_id = uuid.uuid4()
        with pytest.raises(HTTPException) as exc_info:
            await task_service.delete_task(None, task_id=fake_uuid, user_id=fake_user_id)
        
        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
        assert exc_info.value.detail == "Task not found"

    @pytest.mark.asyncio
    async def test_delete_task_raises_404_for_wrong_user(self, task_service, mock_repo, sample_task_data):
        """Test that delete_task raises 404 when trying to delete another user's task."""
        # Arrange
        user1_id = uuid.uuid4()
        user2_id = uuid.uuid4()
        created_task = await task_service.create_task(None, user_id=user1_id, data=sample_task_data)
        
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await task_service.delete_task(None, task_id=created_task.id, user_id=user2_id)
        
        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
        assert exc_info.value.detail == "Task not found"

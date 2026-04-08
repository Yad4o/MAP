"""
tests/test_task_service_integration.py
--------------------------------------
Integration tests for TaskService using real TaskRepository.

Tests use the real database session fixture to confirm nothing breaks
when switching from MockTaskRepository to the real implementation.
"""

import pytest
import uuid

from app.services.task_service import TaskService
from app.db.repositories.task import TaskRepository
from app.schemas.task import TaskCreateRequest, TaskUpdateRequest, TaskStatus
from app.core.exceptions import TaskNotFoundError, TaskOwnershipError, TaskStateTransitionError

# Skip integration tests if real DB session is not available
# This ensures tests work when Prajwal's conftest.py is merged
pytestmark = pytest.mark.integration

# Run with: pytest -m "not integration" to skip until conftest.py with db_session fixture is merged


@pytest.fixture
def real_task_repo():
    """Fixture providing a real TaskRepository."""
    return TaskRepository()


@pytest.fixture
def task_service_with_real_repo(real_task_repo):
    """Fixture providing a TaskService with real repository."""
    return TaskService(real_task_repo)


@pytest.fixture
def sample_task_data():
    """Sample task creation data."""
    return TaskCreateRequest(
        title="Integration Test Task",
        description="This is an integration test task description",
        priority=5,
        config={"integration": "test"}
    )


@pytest.fixture
def sample_update_data():
    """Sample task update data for integration tests."""
    return TaskUpdateRequest(
        title="Updated Integration Task"
    )


class TestTaskServiceIntegration:
    """Integration test suite for TaskService with real repository."""

    @pytest.mark.asyncio
    async def test_create_task_with_real_db(self, task_service_with_real_repo, db_session, sample_task_data):
        """Test that create_task works with real database."""
        # Arrange
        user_id = uuid.uuid4()
        
        # Act
        result = await task_service_with_real_repo.create_task(db_session, user_id=user_id, data=sample_task_data)
        
        # Assert
        assert result.title == "Integration Test Task"
        assert result.description == "This is an integration test task description"
        assert result.priority == 5
        assert result.status == TaskStatus.PENDING
        assert result.config == {"integration": "test"}
        assert result.user_id == user_id
        assert result.id is not None

    @pytest.mark.asyncio
    async def test_get_task_with_real_db(self, task_service_with_real_repo, db_session, sample_task_data):
        """Test that get_task works with real database."""
        # Arrange
        user_id = uuid.uuid4()
        created_task = await task_service_with_real_repo.create_task(db_session, user_id=user_id, data=sample_task_data)
        
        # Act
        retrieved_task = await task_service_with_real_repo.get_task(db_session, task_id=created_task.id, user_id=user_id)
        
        # Assert
        assert retrieved_task.id == created_task.id
        assert retrieved_task.title == created_task.title
        assert retrieved_task.user_id == user_id

    @pytest.mark.asyncio
    async def test_get_task_raises_ownership_error_for_wrong_user_real_db(self, task_service_with_real_repo, db_session, sample_task_data):
        """Test that get_task raises TaskOwnershipError for wrong user with real database."""
        # Arrange
        user1_id = uuid.uuid4()
        user2_id = uuid.uuid4()
        created_task = await task_service_with_real_repo.create_task(db_session, user_id=user1_id, data=sample_task_data)
        
        # Act & Assert
        with pytest.raises(TaskOwnershipError):
            await task_service_with_real_repo.get_task(db_session, task_id=created_task.id, user_id=user2_id)

    @pytest.mark.asyncio
    async def test_list_tasks_with_real_db(self, task_service_with_real_repo, db_session, sample_task_data):
        """Test that list_tasks works with real database."""
        # Arrange
        user1_id = uuid.uuid4()
        user2_id = uuid.uuid4()
        task1 = await task_service_with_real_repo.create_task(db_session, user_id=user1_id, data=sample_task_data)
        task2 = await task_service_with_real_repo.create_task(db_session, user_id=user1_id, data=sample_task_data)
        task3 = await task_service_with_real_repo.create_task(db_session, user_id=user2_id, data=sample_task_data)
        
        # Act
        user1_tasks = await task_service_with_real_repo.list_tasks(db_session, user_id=user1_id)
        user2_tasks = await task_service_with_real_repo.list_tasks(db_session, user_id=user2_id)
        
        # Assert
        assert len(user1_tasks) == 2
        assert all(task.user_id == user1_id for task in user1_tasks)
        assert len(user2_tasks) == 1
        assert user2_tasks[0].user_id == user2_id

    @pytest.mark.asyncio
    async def test_update_task_with_real_db(self, task_service_with_real_repo, db_session, sample_task_data):
        """Test that update_task works with real database (non-status fields only)."""
        # Arrange
        user_id = uuid.uuid4()
        created_task = await task_service_with_real_repo.create_task(db_session, user_id=user_id, data=sample_task_data)
        
        # Act - update only title (status not allowed via API)
        update_data = {"title": "Updated Integration Task"}
        updated_task = await task_service_with_real_repo.update_task(
            db_session, task_id=created_task.id, user_id=user_id, data=TaskUpdateRequest(**update_data)
        )
        
        # Assert
        assert updated_task.status == TaskStatus.PENDING  # Status unchanged
        assert updated_task.title == "Updated Integration Task"
        assert updated_task.id == created_task.id

    @pytest.mark.asyncio
    async def test_delete_task_with_real_db(self, task_service_with_real_repo, db_session, sample_task_data):
        """Test that delete_task works with real database."""
        # Arrange
        user_id = uuid.uuid4()
        created_task = await task_service_with_real_repo.create_task(db_session, user_id=user_id, data=sample_task_data)
        
        # Act
        result = await task_service_with_real_repo.delete_task(db_session, task_id=created_task.id, user_id=user_id)
        
        # Assert
        assert result is True
        
        # Verify task is actually deleted
        with pytest.raises(TaskNotFoundError):
            await task_service_with_real_repo.get_task(db_session, task_id=created_task.id, user_id=user_id)

    @pytest.mark.asyncio
    async def test_delete_task_raises_not_found_for_nonexistent_real_db(self, task_service_with_real_repo, db_session):
        """Test that delete_task raises TaskNotFoundError for nonexistent task with real database."""
        fake_uuid = uuid.uuid4()
        fake_user_id = uuid.uuid4()
        with pytest.raises(TaskNotFoundError):
            await task_service_with_real_repo.delete_task(db_session, task_id=fake_uuid, user_id=fake_user_id)

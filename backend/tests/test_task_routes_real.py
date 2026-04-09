"""
Integration tests for task routes with real database.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.schemas.task import TaskCreateRequest, TaskUpdateRequest
from app.db.base import Base
from app.db.models.user import User
from app.db.repositories.user_repo import UserRepository
import uuid


# Test client setup
client = TestClient(app)


# Mock user for authentication
mock_user = Mock()
mock_user.id = uuid.UUID('12345678-1234-5678-9abc-123456789abc')
mock_user.email = "test@example.com"
mock_user.role = "USER"
mock_user.is_active = True


@pytest.fixture
async def db_session():
    """Create a test database session."""
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from app.config import settings
    
    # Use in-memory SQLite for testing
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False
    )
    
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create session
    async_session = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        # Create a test user
        user_repo = UserRepository(session)
        test_user = await user_repo.create(
            email="test@example.com",
            username="testuser",
            password_hash="hashed123"
        )
        
        # Update mock user to match the created user
        mock_user.id = test_user.id
        
        yield session
    
    # Clean up
    await engine.dispose()


@pytest.fixture
async def override_dependencies(db_session):
    """Override dependencies for testing."""
    # Override get_current_user to return mock user
    from app.dependencies import get_current_user
    app.dependency_overrides[get_current_user] = lambda: mock_user
    
    # Override get_db to return test session
    from app.db.base import get_db
    app.dependency_overrides[get_db] = lambda: db_session
    
    yield
    
    # Clean up after test
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_create_task_real_db(db_session, override_dependencies):
    """Test creating a new task with real database."""
    task_data = {
        "title": "Test Task",
        "description": "Test description for the task",
        "priority": 8
    }
    
    response = client.post("/api/tasks/", json=task_data)
    
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Task"
    assert data["description"] == "Test description for the task"
    assert data["status"] == "PENDING"
    assert data["priority"] == 8
    assert "user_id" in data
    assert "id" in data


@pytest.mark.asyncio
async def test_list_tasks_empty_real_db(db_session, override_dependencies):
    """Test listing tasks when no tasks exist."""
    response = client.get("/api/tasks/")
    
    assert response.status_code == 200
    data = response.json()
    assert data == []


@pytest.mark.asyncio
async def test_list_tasks_with_tasks_real_db(db_session, override_dependencies):
    """Test listing tasks when tasks exist."""
    # Create some tasks first
    task_data1 = {
        "title": "Task 1",
        "description": "Description for task 1",
        "priority": 5
    }
    task_data2 = {
        "title": "Task 2",
        "description": "Description for task 2",
        "priority": 3
    }
    
    client.post("/api/tasks/", json=task_data1)
    client.post("/api/tasks/", json=task_data2)
    
    response = client.get("/api/tasks/")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["title"] == "Task 1"
    assert data[1]["title"] == "Task 2"


@pytest.mark.asyncio
async def test_get_task_found_real_db(db_session, override_dependencies):
    """Test getting a specific task that exists."""
    # Create a task first
    task_data = {
        "title": "Test Task",
        "description": "Test description for the task",
        "priority": 5
    }
    
    create_response = client.post("/api/tasks/", json=task_data)
    task_id = create_response.json()["id"]
    
    response = client.get(f"/api/tasks/{task_id}")
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == task_id
    assert data["title"] == "Test Task"
    assert data["description"] == "Test description for the task"


@pytest.mark.asyncio
async def test_get_task_not_found_real_db(db_session, override_dependencies):
    """Test getting a task that doesn't exist."""
    fake_id = uuid.uuid4()
    response = client.get(f"/api/tasks/{fake_id}")
    
    assert response.status_code == 404
    data = response.json()
    assert data["detail"] == "Task not found"


@pytest.mark.asyncio
async def test_update_task_found_real_db(db_session, override_dependencies):
    """Test updating a task that exists."""
    # Create a task first
    task_data = {
        "title": "Original Title",
        "description": "Original desc",
        "priority": 5
    }
    
    create_response = client.post("/api/tasks/", json=task_data)
    task_id = create_response.json()["id"]
    
    update_data = {
        "title": "Updated Title"
    }
    
    response = client.put(f"/api/tasks/{task_id}", json=update_data)
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == task_id
    assert data["title"] == "Updated Title"
    assert data["description"] == "Original desc"  # Unchanged


@pytest.mark.asyncio
async def test_update_task_not_found_real_db(db_session, override_dependencies):
    """Test updating a task that doesn't exist."""
    fake_id = uuid.uuid4()
    update_data = {
        "title": "Updated Title"
    }
    
    response = client.put(f"/api/tasks/{fake_id}", json=update_data)
    
    assert response.status_code == 404
    data = response.json()
    assert data["detail"] == "Task not found"

@pytest.mark.asyncio
async def test_delete_task_found_real_db(db_session, override_dependencies):
    """Test deleting a task that exists."""
    # Create a task first
    task_data = {
        "title": "Test Task",
        "description": "Test description for the task",
        "priority": 5
    }
    
    create_response = client.post("/api/tasks/", json=task_data)
    task_id = create_response.json()["id"]
    
    response = client.delete(f"/api/tasks/{task_id}")
    
    assert response.status_code == 204
    assert response.content == b""
    
    # Verify task is deleted
    response = client.get(f"/api/tasks/{task_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_task_not_found_real_db(db_session, override_dependencies):
    """Test deleting a task that doesn't exist."""
    fake_id = uuid.uuid4()
    response = client.delete(f"/api/tasks/{fake_id}")
    
    assert response.status_code == 404
    data = response.json()
    assert data["detail"] == "Task not found"

"""
Integration tests for task routes.
"""

import pytest
from fastapi.testclient import TestClient
from fastapi import HTTPException
from unittest.mock import Mock

from app.main import app
from tests.mocks.task_service import MockTaskService
from app.schemas.task_simple import TaskCreate, TaskUpdate
from app.routes.tasks import get_task_service


# Test client setup
client = TestClient(app)


# Mock user for authentication
mock_user = Mock()
mock_user.id = 1
mock_user.email = "test@example.com"
mock_user.role = "USER"
mock_user.is_active = True

# Mock credentials for bearer scheme
mock_credentials = Mock()
mock_credentials.credentials = "test-token"


@pytest.fixture
def override_dependencies():
    """Override task service dependency with mock."""
    # Create a single shared instance
    shared_service = MockTaskService()
    
    # Override the dependency to return the same instance
    def debug_service():
        print(f"Dependency override called, returning: {shared_service}")
        return shared_service
    
    app.dependency_overrides[get_task_service] = debug_service
    # Override get_current_user directly to bypass all authentication
    from app.dependencies import get_current_user
    app.dependency_overrides[get_current_user] = lambda: mock_user
    yield shared_service  # Return the service for use in tests
    # Clean up after test
    app.dependency_overrides.clear()


@pytest.fixture
def test_client(override_dependencies):
    """Create test client with dependency overrides."""
    with TestClient(app) as client:
        yield client


def get_task_service():
    """Helper function for dependency override."""
    from app.routes.tasks import get_task_service
    return get_task_service()


def get_current_user():
    """Helper function for dependency override."""
    return mock_user


def get_token_payload():
    """Helper function for dependency override."""
    return {"sub": "1", "jti": "test-jti", "role": "USER"}


@pytest.mark.asyncio
async def test_create_task(override_dependencies):
    """Test creating a new task."""
    task_data = {
        "title": "Test Task",
        "description": "Test description",
        "status": "pending",
        "priority": "high"
    }
    
    response = client.post("/api/tasks/", json=task_data)
    
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Task"
    assert data["description"] == "Test description"
    assert data["status"] == "pending"
    assert data["priority"] == "high"
    assert "id" in data
    assert "user_id" in data


@pytest.mark.asyncio
async def test_list_tasks_empty(override_dependencies):
    """Test listing tasks when no tasks exist."""
    response = client.get("/api/tasks/")
    
    assert response.status_code == 200
    data = response.json()
    assert data == []


@pytest.mark.asyncio
async def test_list_tasks_with_tasks(override_dependencies, test_client):
    """Test listing tasks when tasks exist."""
    # Create some tasks first using the shared service
    print(f"Service instance: {override_dependencies}")
    print(f"Service tasks before: {override_dependencies.tasks}")
    
    await override_dependencies.create_task(None, 1, TaskCreate(title="Task 1", description="Desc 1"))
    await override_dependencies.create_task(None, 1, TaskCreate(title="Task 2", description="Desc 2"))
    
    print(f"Service tasks after: {override_dependencies.tasks}")
    
    response = test_client.get("/api/tasks/")
    
    print(f"Response status: {response.status_code}")
    print(f"Response data: {response.json()}")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["title"] == "Task 1"
    assert data[1]["title"] == "Task 2"


@pytest.mark.asyncio
async def test_get_task_found(override_dependencies):
    """Test getting a specific task that exists."""
    # Create a task first using the shared service
    task = await override_dependencies.create_task(None, 1, TaskCreate(title="Test Task", description="Test desc"))
    
    response = client.get(f"/api/tasks/{task.id}")
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == task.id
    assert data["title"] == "Test Task"
    assert data["description"] == "Test desc"


@pytest.mark.asyncio
async def test_get_task_not_found(override_dependencies):
    """Test getting a task that doesn't exist."""
    response = client.get("/api/tasks/999")
    
    assert response.status_code == 404
    data = response.json()
    assert data["detail"] == "Task not found"


@pytest.mark.asyncio
async def test_update_task_found(override_dependencies):
    """Test updating a task that exists."""
    # Create a task first using the shared service
    task = await override_dependencies.create_task(None, 1, TaskCreate(title="Original Title", description="Original desc"))
    
    update_data = {
        "title": "Updated Title",
        "status": "completed"
    }
    
    response = client.put(f"/api/tasks/{task.id}", json=update_data)
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == task.id
    assert data["title"] == "Updated Title"
    assert data["description"] == "Original desc"  # Unchanged
    assert data["status"] == "completed"


@pytest.mark.asyncio
async def test_update_task_not_found(override_dependencies):
    """Test updating a task that doesn't exist."""
    update_data = {
        "title": "Updated Title"
    }
    
    response = client.put("/api/tasks/999", json=update_data)
    
    assert response.status_code == 404
    data = response.json()
    assert data["detail"] == "Task not found"


@pytest.mark.asyncio
async def test_delete_task_found(override_dependencies):
    """Test deleting a task that exists."""
    # Create a task first using the shared service
    task = await override_dependencies.create_task(None, 1, TaskCreate(title="Test Task", description="Test desc"))
    
    response = client.delete(f"/api/tasks/{task.id}")
    
    assert response.status_code == 204
    assert response.content == b""
    
    # Verify task is deleted
    with pytest.raises(HTTPException) as exc_info:
        await override_dependencies.get_task(None, task.id, 1)
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_delete_task_not_found(override_dependencies):
    """Test deleting a task that doesn't exist."""
    response = client.delete("/api/tasks/999")
    
    assert response.status_code == 404
    data = response.json()
    assert data["detail"] == "Task not found"


@pytest.mark.asyncio
async def test_task_response_shapes(override_dependencies):
    """Test that all endpoints return correct response shapes."""
    # Create task
    create_response = client.post("/api/tasks/", json={"title": "Test", "description": "Desc"})
    task_data = create_response.json()
    
    # Test create response shape
    required_fields = {"id", "user_id", "title", "description", "status", "priority"}
    assert set(task_data.keys()) == required_fields
    
    # Test get response shape
    get_response = client.get(f"/api/tasks/{task_data['id']}")
    assert set(get_response.json().keys()) == required_fields
    
    # Test list response shape
    list_response = client.get("/api/tasks/")
    assert isinstance(list_response.json(), list)
    if list_response.json():
        assert set(list_response.json()[0].keys()) == required_fields
    
    # Test update response shape
    update_response = client.put(f"/api/tasks/{task_data['id']}", json={"title": "Updated"})
    assert set(update_response.json().keys()) == required_fields

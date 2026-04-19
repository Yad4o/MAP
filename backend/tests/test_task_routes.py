"""
Integration tests for task routes.
"""

import pytest
import uuid
from fastapi.testclient import TestClient
from fastapi import HTTPException
from unittest.mock import Mock, patch

from app.main import app
from app.routes.tasks import get_task_service
from tests.mocks.task_service import MockTaskService
from app.schemas.task import TaskCreateRequest, TaskUpdateRequest


# Mock user for authentication
mock_user = Mock()
mock_user.id = uuid.UUID('12345678-1234-5678-9abc-123456789abc')
mock_user.email = "test@example.com"
mock_user.role = "USER"
mock_user.is_active = True



@pytest.fixture
def override_dependencies():
    """Override task service dependency with mock."""
    # Create a single shared instance
    shared_service = MockTaskService()
    
    # Override the dependency to return the same instance
    def debug_service():
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


@pytest.fixture(autouse=True)
def mock_celery():
    """Mock Celery apply_async for all route tests."""
    with patch("app.routes.tasks.process_task.apply_async") as mocked:
        yield mocked




def test_create_task(override_dependencies, test_client):
    """Test creating a new task."""
    task_data = {
        "title": "Test Task",
        "description": "Test description for task",
        "status": "PENDING",
        "priority": 5
    }
    
    response = test_client.post("/api/v1/tasks/", json=task_data)
    
    if response.status_code != 201:
        print(f"Error response: {response.json()}")
    
    assert response.status_code == 202
    data = response.json()
    assert data["title"] == "Test Task"
    assert data["description"] == "Test description for task"
    assert data["status"] == "PENDING"
    assert data["priority"] == 5
    assert "id" in data
    assert "user_id" in data


def test_list_tasks_empty(override_dependencies, test_client):
    """Test listing tasks when no tasks exist."""
    response = test_client.get("/api/v1/tasks/")
    
    assert response.status_code == 200
    data = response.json()
    assert data == []


@pytest.mark.asyncio
async def test_list_tasks_with_tasks(override_dependencies, test_client):
    """Test listing tasks when tasks exist."""
    # Create some tasks first using the shared service
    await override_dependencies.create_task(mock_user.id, TaskCreateRequest(title="Task 1", description="Description 1"))
    await override_dependencies.create_task(mock_user.id, TaskCreateRequest(title="Task 2", description="Description 2"))
    
    response = test_client.get("/api/v1/tasks/")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["title"] == "Task 1"
    assert data[1]["title"] == "Task 2"


@pytest.mark.asyncio
async def test_get_task_found(override_dependencies, test_client):
    """Test getting a specific task that exists."""
    # Create a task first using the shared service
    task = await override_dependencies.create_task(mock_user.id, TaskCreateRequest(title="Test Task", description="Test description"))
    
    response = test_client.get(f"/api/v1/tasks/{task.id}")
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(task.id)
    assert data["title"] == "Test Task"
    assert data["description"] == "Test description"


def test_get_task_not_found(override_dependencies, test_client):
    """Test getting a task that doesn't exist."""
    response = test_client.get("/api/v1/tasks/00000000-0000-0000-0000-000000000999")
    
    assert response.status_code == 404
    data = response.json()
    assert data["detail"] == "Task not found"


@pytest.mark.asyncio
async def test_update_task_found(override_dependencies, test_client):
    """Test updating a task that exists."""
    # Create a task first using the shared service
    task = await override_dependencies.create_task(mock_user.id, TaskCreateRequest(title="Original Title", description="Original description"))
    
    update_data = {
        "title": "Updated Title"
    }
    
    response = test_client.put(f"/api/v1/tasks/{task.id}", json=update_data)
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(task.id)
    assert data["title"] == "Updated Title"
    assert data["description"] == "Original description"  # Unchanged
    assert data["status"] == "PENDING"


def test_update_task_not_found(override_dependencies, test_client):
    """Test updating a task that doesn't exist."""
    update_data = {
        "title": "Updated Title"
    }
    
    response = test_client.put("/api/v1/tasks/00000000-0000-0000-0000-000000000999", json=update_data)
    
    assert response.status_code == 404
    data = response.json()
    assert data["detail"] == "Task not found"


@pytest.mark.asyncio
async def test_delete_task_found(override_dependencies, test_client):
    """Test deleting a task that exists."""
    # Create a task first using the shared service
    task = await override_dependencies.create_task(mock_user.id, TaskCreateRequest(title="Test Task", description="Test description"))
    
    response = test_client.delete(f"/api/v1/tasks/{task.id}")
    
    assert response.status_code == 204
    assert response.content == b""
    
    # Verify task is deleted
    from app.core.exceptions import TaskNotFoundError
    with pytest.raises(TaskNotFoundError):
        await override_dependencies.get_task(task.id, mock_user.id)


def test_delete_task_not_found(override_dependencies, test_client):
    """Test deleting a task that doesn't exist."""
    response = test_client.delete("/api/v1/tasks/00000000-0000-0000-0000-000000000999")
    
    assert response.status_code == 404
    data = response.json()
    assert data["detail"] == "Task not found"


def test_task_response_shapes(override_dependencies, test_client):
    """Test that all endpoints return correct response shapes."""
    # Create task
    create_response = test_client.post("/api/v1/tasks/", json={"title": "Test", "description": "Test description"})
    assert create_response.status_code == 202
    task_data = create_response.json()
    
    # Test create response shape
    required_fields = {"id", "user_id", "title", "description", "status", "task_type", "priority", "retry_count", "config", "created_at", "started_at", "completed_at", "result", "error"}
    assert set(task_data.keys()) == required_fields
    
    # Test get response shape
    get_response = test_client.get(f"/api/v1/tasks/{task_data['id']}")
    assert set(get_response.json().keys()) == required_fields
    
    # Test list response shape
    list_response = test_client.get("/api/v1/tasks/")
    assert isinstance(list_response.json(), list)
    if list_response.json():
        assert set(list_response.json()[0].keys()) == required_fields
    
    # Test update response shape
    update_response = test_client.put(f"/api/v1/tasks/{task_data['id']}", json={"title": "Updated"})
    assert set(update_response.json().keys()) == required_fields


@pytest.mark.asyncio
async def test_get_task_status_returns_200(override_dependencies, test_client):
    """Test GET /{task_id}/status returns 200 with task_id and status."""
    task = await override_dependencies.create_task(mock_user.id, TaskCreateRequest(title="Test", description="Test"))
    
    response = test_client.get(f"/api/v1/tasks/{task.id}/status")
    
    assert response.status_code == 200
    data = response.json()
    assert data["task_id"] == str(task.id)
    assert data["status"] == "PENDING"


def test_get_task_status_returns_404_not_found(override_dependencies, test_client):
    """Test GET /{task_id}/status returns 404 for nonexistent task."""
    response = test_client.get("/api/v1/tasks/00000000-0000-0000-0000-000000000999/status")
    assert response.status_code == 404
    assert response.json()["detail"] == "Task not found"


@pytest.mark.asyncio
async def test_get_task_status_returns_404_wrong_owner(override_dependencies, test_client):
    """Test GET /{task_id}/status returns 404 for wrong user."""
    # Create task with a different user ID using the mock repo directly if needed, 
    # but override_dependencies.create_task uses mock_user.id.
    # Let's use a different user_id for creation.
    other_user = uuid.uuid4()
    task = await override_dependencies.create_task(other_user, TaskCreateRequest(title="Other", description="Other"))
    
    # client is logged in as mock_user
    response = test_client.get(f"/api/v1/tasks/{task.id}/status")
    assert response.status_code == 404
    assert response.json()["detail"] == "Task not found"

import pytest
from httpx import AsyncClient
from unittest.mock import patch
import uuid

# EXISTING TEST FILE — appending new tests per task instructions

pytestmark = pytest.mark.asyncio

@pytest.fixture(autouse=True)
def mock_celery():
    """Mock Celery apply_async so no workers are actually triggered during integration tests."""
    with patch("app.routes.tasks.process_task.apply_async") as mock:
        yield mock

async def test_create_task_success(client: AsyncClient, create_test_user: dict):
    """Case 1: Create a task successfully"""
    task_data = {
        "title": "Integration Test Task",
        "description": "Task description",
        "priority": 5
    }
    response = await client.post("/api/v1/tasks", json=task_data, headers=create_test_user)
    assert response.status_code == 201
    assert response.json()["title"] == task_data["title"]

async def test_list_tasks(client: AsyncClient, create_test_user: dict):
    """Case 2: List tasks for the current user"""
    # Create two tasks first
    await client.post("/api/v1/tasks", json={"title": "Task 1", "priority": 1}, headers=create_test_user)
    await client.post("/api/v1/tasks", json={"title": "Task 2", "priority": 1}, headers=create_test_user)
    
    response = await client.get("/api/v1/tasks", headers=create_test_user)
    assert response.status_code == 200
    assert len(response.json()) >= 2

async def test_get_task_by_id(client: AsyncClient, create_test_user: dict):
    """Case 3: Get task details by ID"""
    create_response = await client.post("/api/v1/tasks", json={"title": "Detail Task", "priority": 1}, headers=create_test_user)
    task_id = create_response.json()["id"]
    
    response = await client.get(f"/api/v1/tasks/{task_id}", headers=create_test_user)
    assert response.status_code == 200
    assert response.json()["id"] == task_id

async def test_get_task_status(client: AsyncClient, create_test_user: dict):
    """Case 4: Get lightweight task status"""
    create_response = await client.post("/api/v1/tasks", json={"title": "Status Task", "priority": 1}, headers=create_test_user)
    task_id = create_response.json()["id"]
    
    response = await client.get(f"/api/v1/tasks/{task_id}/status", headers=create_test_user)
    assert response.status_code == 200
    assert "status" in response.json()
    assert response.json()["task_id"] == task_id

async def test_update_task_success(client: AsyncClient, create_test_user: dict):
    """Case 5: Update an existing task"""
    create_response = await client.post("/api/v1/tasks", json={"title": "Old Title", "priority": 1}, headers=create_test_user)
    task_id = create_response.json()["id"]
    
    response = await client.put(f"/api/v1/tasks/{task_id}", json={"title": "New Title"}, headers=create_test_user)
    assert response.status_code == 200
    assert response.json()["title"] == "New Title"

async def test_delete_task_success(client: AsyncClient, create_test_user: dict):
    """Case 6: Delete a task successfully"""
    create_response = await client.post("/api/v1/tasks", json={"title": "To Delete", "priority": 1}, headers=create_test_user)
    task_id = create_response.json()["id"]
    
    response = await client.delete(f"/api/v1/tasks/{task_id}", headers=create_test_user)
    assert response.status_code == 204
    
    # Verify it's gone
    get_response = await client.get(f"/api/v1/tasks/{task_id}", headers=create_test_user)
    assert get_response.status_code == 404

async def test_get_nonexistent_task(client: AsyncClient, create_test_user: dict):
    """Case 7: 404 for nonexistent task ID"""
    fake_id = str(uuid.uuid4())
    response = await client.get(f"/api/v1/tasks/{fake_id}", headers=create_test_user)
    assert response.status_code == 404

async def test_access_other_user_task(client: AsyncClient, create_test_user: dict, test_user_data: dict):
    """Case 8: 404 when accessing another user's task"""
    # Create task with user 1
    create_response = await client.post("/api/v1/tasks", json={"title": "User 1 Task", "priority": 1}, headers=create_test_user)
    task_id = create_response.json()["id"]
    
    # Login as user 2
    user2_data = {"email": "user2@example.com", "username": "user2", "password": "Password123!"}
    await client.post("/api/v1/auth/register", json=user2_data)
    login_response = await client.post("/api/v1/auth/login", json={"email": user2_data["email"], "password": user2_data["password"]})
    user2_token = login_response.json()["access_token"]
    user2_headers = {"Authorization": f"Bearer {user2_token}"}
    
    # Try to access user 1's task with user 2's headers
    response = await client.get(f"/api/v1/tasks/{task_id}", headers=user2_headers)
    assert response.status_code == 404

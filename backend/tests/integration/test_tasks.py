import pytest
from httpx import AsyncClient
from unittest.mock import patch
import uuid

# EXISTING TEST FILE — appending new tests per task instructions

pytestmark = pytest.mark.asyncio

@pytest.fixture(autouse=True)
def mock_celery():
    # Patch where it's imported (routes.tasks), not where it's defined (worker.tasks)
    with patch("app.routes.tasks.process_task.apply_async") as mock:
        yield mock

async def test_create_task_success(client: AsyncClient, create_test_user: dict, mock_celery):
    """Case 1: Create a task successfully"""
    task_data = {
        "title": "Integration Test Task",
        "description": "Task description",
        "priority": 5
    }
    response = await client.post("/api/v1/tasks", json=task_data, headers=create_test_user)
    assert response.status_code == 202
    assert response.json()["title"] == task_data["title"]
    mock_celery.assert_called_once()

async def test_list_tasks(client: AsyncClient, create_test_user: dict, mock_celery):
    """Case 2: List tasks for the current user"""
    # Create two tasks first
    await client.post("/api/v1/tasks", json={"title": "Task 1", "priority": 1}, headers=create_test_user)
    await client.post("/api/v1/tasks", json={"title": "Task 2", "priority": 1}, headers=create_test_user)
    
    response = await client.get("/api/v1/tasks", headers=create_test_user)
    assert response.status_code == 200
    assert mock_celery.call_count == 2
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 2
    titles = [t["title"] for t in data]
    assert "Task 1" in titles
    assert "Task 2" in titles

async def test_get_task_by_id(client: AsyncClient, create_test_user: dict, mock_celery):
    """Case 3: Get task details by ID"""
    create_response = await client.post("/api/v1/tasks", json={"title": "Detail Task", "priority": 1}, headers=create_test_user)
    task_id = create_response.json()["id"]
    mock_celery.assert_called_once()
    
    response = await client.get(f"/api/v1/tasks/{task_id}", headers=create_test_user)
    assert response.status_code == 200
    assert response.json()["id"] == task_id

async def test_get_task_status(client: AsyncClient, create_test_user: dict, mock_celery):
    """Case 4: Get lightweight task status"""
    create_response = await client.post("/api/v1/tasks", json={"title": "Status Task", "priority": 1}, headers=create_test_user)
    task_id = create_response.json()["id"]
    mock_celery.assert_called_once()
    
    response = await client.get(f"/api/v1/tasks/{task_id}/status", headers=create_test_user)
    assert response.status_code == 200
    assert "status" in response.json()
    assert response.json()["task_id"] == task_id

async def test_update_task_success(client: AsyncClient, create_test_user: dict, mock_celery):
    """Case 5: Update an existing task"""
    create_response = await client.post("/api/v1/tasks", json={"title": "Old Title", "priority": 1}, headers=create_test_user)
    task_id = create_response.json()["id"]
    mock_celery.assert_called_once()
    
    response = await client.put(f"/api/v1/tasks/{task_id}", json={"title": "New Title"}, headers=create_test_user)
    assert response.status_code == 200
    assert response.json()["title"] == "New Title"

async def test_delete_task_success(client: AsyncClient, create_test_user: dict, mock_celery):
    """Case 6: Delete a task successfully"""
    create_response = await client.post("/api/v1/tasks", json={"title": "To Delete", "priority": 1}, headers=create_test_user)
    task_id = create_response.json()["id"]
    mock_celery.assert_called_once()
    
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

async def test_access_other_user_task(client: AsyncClient, create_test_user: dict, test_user_data: dict, mock_celery):
    """Case 8: 404 when accessing another user's task"""
    # Create task with user 1
    create_response = await client.post("/api/v1/tasks", json={"title": "User 1 Task", "priority": 1}, headers=create_test_user)
    task_id = create_response.json()["id"]
    mock_celery.assert_called_once()
    
    # Login as user 2
    suffix = str(uuid.uuid4())[:8]
    user2_data = {
        "email": f"user2_{suffix}@example.com",
        "username": f"user2_{suffix}",
        "password": "Password123!"
    }
    await client.post("/api/v1/auth/register", json=user2_data)
    login_response = await client.post("/api/v1/auth/login", json={"email": user2_data["email"], "password": user2_data["password"]})
    user2_token = login_response.json()["access_token"]
    user2_headers = {"Authorization": f"Bearer {user2_token}"}
    
    # Try to access user 1's task with user 2's headers
    response = await client.get(f"/api/v1/tasks/{task_id}", headers=user2_headers)
    assert response.status_code == 404

async def test_create_task_unauthenticated(client: AsyncClient):
    """Case 9: Create a task without token"""
    response = await client.post("/api/v1/tasks", json={"title": "No Auth Task", "priority": 1})
    # The app now explicitly returns 401 Unauthorized when the Authorization header is missing
    assert response.status_code == 401

async def test_list_tasks_empty(client: AsyncClient, create_test_user: dict):
    """Case 10: List tasks when none exist for the user"""
    response = await client.get("/api/v1/tasks", headers=create_test_user)
    assert response.status_code == 200
    # Current implementation returns a list, not a paginated object
    assert response.json() == []

async def test_cancel_task(client: AsyncClient, create_test_user: dict, mock_celery):
    """Case 11: Successful task cancellation"""
    create_response = await client.post("/api/v1/tasks", json={"title": "To Cancel", "priority": 1}, headers=create_test_user)
    task_id = create_response.json()["id"]
    mock_celery.assert_called_once()
    
    # Cancelling a 'PENDING' task is allowed as it's not a terminal state
    response = await client.post(f"/api/v1/tasks/{task_id}/cancel", headers=create_test_user)
    assert response.status_code == 200
    assert response.json()["status"] == "CANCELLED"  # Matches TaskStatus.CANCELLED enum value

async def test_cancel_completed_task(client: AsyncClient, create_test_user: dict, db_session, mock_celery):
    """Case 12: Cannot cancel a COMPLETED task"""
    create_response = await client.post("/api/v1/tasks", json={"title": "Already Done", "priority": 1}, headers=create_test_user)
    task_id = uuid.UUID(create_response.json()["id"])
    mock_celery.assert_called_once()
    
    # Manually mark as completed in DB
    from app.db.models import Task
    from sqlalchemy import select
    res = await db_session.execute(select(Task).filter(Task.id == task_id))
    task = res.scalar_one()
    task.status = "COMPLETED"
    await db_session.flush()
    await db_session.refresh(task)
    assert task.status == "COMPLETED"
    
    response = await client.post(f"/api/v1/tasks/{task_id}/cancel", headers=create_test_user)
    assert response.status_code == 400

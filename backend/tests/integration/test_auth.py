import pytest
from httpx import AsyncClient



pytestmark = pytest.mark.asyncio

async def test_register_new_user(client: AsyncClient, test_user_data: dict):
    """Case 1: Successful registration"""
    response = await client.post("/api/v1/auth/register", json={
        "email": "newuser@example.com",
        "username": "newuser",
        "password": "Password123!"
    })
    assert response.status_code == 201
    assert response.json()["email"] == "newuser@example.com"

async def test_register_duplicate_email(client: AsyncClient, test_user_data: dict):
    """Case 2: Duplicate email registration failure"""
    await client.post("/api/v1/auth/register", json=test_user_data)
    response = await client.post("/api/v1/auth/register", json=test_user_data)
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()

async def test_login_success(client: AsyncClient, test_user_data: dict):
    """Case 3: Successful login"""
    await client.post("/api/v1/auth/register", json=test_user_data)
    response = await client.post("/api/v1/auth/login", json={
        "email": test_user_data["email"],
        "password": test_user_data["password"]
    })
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert "refresh_token" in response.json()

async def test_login_invalid_credentials(client: AsyncClient, test_user_data: dict):
    """Case 4: Login with wrong password"""
    await client.post("/api/v1/auth/register", json=test_user_data)
    response = await client.post("/api/v1/auth/login", json={
        "email": test_user_data["email"],
        "password": "WrongPassword123!"
    })
    assert response.status_code == 401

async def test_get_me_authenticated(client: AsyncClient, create_test_user: dict):
    """Case 5: Get current user details when authenticated"""
    response = await client.get("/api/v1/auth/me", headers=create_test_user)
    assert response.status_code == 200
    assert "email" in response.json()

async def test_get_me_unauthenticated(client: AsyncClient):
    """Case 6: Get current user details without token"""
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401

async def test_get_me_expired_token(client: AsyncClient):
    """Case 8: Get current user details with expired token"""
    expired = "Bearer eyJhbGciOiJSUzI1NiJ9.eyJleHAiOjE2MDAwMDAwMDB9.invalidsig"
    response = await client.get("/api/v1/auth/me", headers={"Authorization": expired})
    assert response.status_code == 401

async def test_logout_success(client: AsyncClient, create_test_user: dict):
    """Case 7: Successful logout"""
    response = await client.post("/api/v1/auth/logout", headers=create_test_user)
    assert response.status_code == 204

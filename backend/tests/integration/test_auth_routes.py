import pytest
from httpx import AsyncClient

# Apply pytest.mark.asyncio to all test functions in this module
pytestmark = pytest.mark.asyncio


async def test_register_success(client: AsyncClient, test_user_data: dict):
    response = await client.post("/api/v1/auth/register", json=test_user_data)
    assert response.status_code == 201
    
    data = response.json()
    assert "email" in data
    assert "username" in data
    assert "password_hash" not in data


async def test_register_duplicate_email(client: AsyncClient, test_user_data: dict):
    # First registration
    await client.post("/api/v1/auth/register", json=test_user_data)
    
    # Second registration with the same details
    response = await client.post("/api/v1/auth/register", json=test_user_data)
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()


async def test_register_missing_fields(client: AsyncClient):
    response = await client.post("/api/v1/auth/register", json={"email": "test@test.com"})
    assert response.status_code == 422


async def test_login_success(client: AsyncClient, test_user_data: dict):
    # First register the user
    await client.post("/api/v1/auth/register", json=test_user_data)
    
    # Then attempt to login
    response = await client.post("/api/v1/auth/login", json={
        "email": test_user_data["email"],
        "password": test_user_data["password"]
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


async def test_login_wrong_password(client: AsyncClient, test_user_data: dict):
    # Register the user
    await client.post("/api/v1/auth/register", json=test_user_data)
    
    # Attempt login with an incorrect password
    response = await client.post("/api/v1/auth/login", json={
        "email": test_user_data["email"],
        "password": "wrongpassword123!"
    })
    
    assert response.status_code == 401


async def test_login_wrong_email(client: AsyncClient):
    # Attempt login with a non-existent email
    response = await client.post("/api/v1/auth/login", json={
        "email": "notfound@test.com",
        "password": "Password123!"
    })
    
    assert response.status_code == 401


async def test_get_me_authenticated(client: AsyncClient, auth_headers: dict):
    # Use headers belonging to a logged-in user
    response = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    assert "email" in response.json()


async def test_get_me_no_token(client: AsyncClient):
    # Omit the authorization token
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401  # get_token_payload returns 401 when no credentials are supplied


async def test_get_me_invalid_token(client: AsyncClient):
    # Supply an explicitly invalid token
    response = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid_token_here"})
    assert response.status_code == 401


async def test_logout_success(client: AsyncClient, auth_headers: dict):
    # Log out with an authenticated user's headers
    response = await client.post("/api/v1/auth/logout", headers=auth_headers)
    assert response.status_code == 204


async def test_update_me_success(client: AsyncClient, auth_headers: dict):
    response = await client.patch("/api/v1/auth/me", headers=auth_headers, json={"username": "newusername"})
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "newusername"


async def test_update_me_no_data(client: AsyncClient, auth_headers: dict):
    response = await client.patch("/api/v1/auth/me", headers=auth_headers, json={})
    assert response.status_code == 200
    # Should return current user unchanged
    assert "username" in response.json()

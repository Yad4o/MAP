"""
Integration tests for UserRepository and SessionRepository against the test database.

These tests verify the data access layer functionality for user and session management,
including CRUD operations, authentication-related queries, and pagination.
Tests use the db_session fixture which provides a fresh SQLite database
for each test case.
"""

import pytest
import uuid
from datetime import datetime, timedelta, timezone

from app.db.repositories.user_repo import UserRepository, SessionRepository
from app.db.models.user import User, Session


@pytest.mark.asyncio
async def test_create_user(db_session):
    """Test creating a user with correct default values."""
    user_repo = UserRepository(db_session)
    
    user = await user_repo.create(
        email="testuser@example.com",
        username="testuser",
        password_hash="hashed123"
    )
    
    assert user is not None
    assert user.id is not None
    assert user.email == "testuser@example.com"
    assert user.username == "testuser"
    assert user.password_hash == "hashed123"
    assert user.role == "USER"
    assert user.is_active is True
    assert user.tier == "free"
    assert user.email_verified is False


@pytest.mark.asyncio
async def test_get_user_by_id(db_session):
    """Test fetching a user by ID."""
    user_repo = UserRepository(db_session)
    
    # Create user first
    created_user = await user_repo.create(
        email="testuser@example.com",
        username="testuser",
        password_hash="hashed123"
    )
    
    # Fetch by ID
    fetched_user = await user_repo.get_by_id(created_user.id)
    
    assert fetched_user is not None
    assert fetched_user.id == created_user.id
    assert fetched_user.email == "testuser@example.com"


@pytest.mark.asyncio
async def test_get_user_by_email(db_session):
    """Test fetching a user by email."""
    user_repo = UserRepository(db_session)
    
    # Create user first
    created_user = await user_repo.create(
        email="testuser@example.com",
        username="testuser",
        password_hash="hashed123"
    )
    
    # Fetch by email
    fetched_user = await user_repo.get_by_email("testuser@example.com")
    
    assert fetched_user is not None
    assert fetched_user.id == created_user.id
    assert fetched_user.email == "testuser@example.com"


@pytest.mark.asyncio
async def test_get_user_by_email_not_found(db_session):
    """Test fetching a non-existent user by email."""
    user_repo = UserRepository(db_session)
    
    # Try to fetch non-existent email
    fetched_user = await user_repo.get_by_email("nonexistent@example.com")
    
    assert fetched_user is None


@pytest.mark.asyncio
async def test_update_last_login(db_session):
    """Test updating user's last login timestamp."""
    user_repo = UserRepository(db_session)
    
    # Create user first
    user = await user_repo.create(
        email="testuser@example.com",
        username="testuser",
        password_hash="hashed123"
    )
    
    # Initially last_login_at should be None
    assert user.last_login_at is None
    
    # Update last login
    await user_repo.update_last_login(user.id)
    await db_session.flush()
    
    # Fetch user again to check updated value
    updated_user = await user_repo.get_by_id(user.id)
    assert updated_user is not None
    assert updated_user.last_login_at is not None


@pytest.mark.asyncio
async def test_deactivate_user(db_session):
    """Test deactivating a user."""
    user_repo = UserRepository(db_session)
    
    # Create user first
    user = await user_repo.create(
        email="testuser@example.com",
        username="testuser",
        password_hash="hashed123"
    )
    
    # Initially user should be active
    assert user.is_active is True
    
    # Deactivate user
    await user_repo.deactivate(user.id)
    await db_session.flush()
    
    # Fetch user again to check updated value
    deactivated_user = await user_repo.get_by_id(user.id)
    assert deactivated_user is not None
    assert deactivated_user.is_active is False


@pytest.mark.asyncio
async def test_list_all_users(db_session):
    """Test listing all users with pagination."""
    user_repo = UserRepository(db_session)
    
    # Create 3 users
    users = []
    for i in range(3):
        user = await user_repo.create(
            email=f"user{i+1}@example.com",
            username=f"user{i+1}",
            password_hash="hashed123"
        )
        users.append(user)
    
    # Test default pagination (first page)
    user_list, total_count = await user_repo.list_all()
    
    assert total_count == 3
    assert len(user_list) == 3
    
    # Test pagination with parameters
    user_list_page2, total_count_page2 = await user_repo.list_all(page=2, page_size=1)
    
    assert total_count_page2 == 3  # Total count should remain the same
    assert len(user_list_page2) == 1  # Should return 1 user
    
    # Check that all created users are in the full list
    emails = [user.email for user in user_list]
    assert "user1@example.com" in emails
    assert "user2@example.com" in emails
    assert "user3@example.com" in emails


@pytest.mark.asyncio
async def test_create_session(db_session):
    """Test creating a session for a user."""
    user_repo = UserRepository(db_session)
    session_repo = SessionRepository(db_session)
    
    # Create user first
    user = await user_repo.create(
        email="testuser@example.com",
        username="testuser",
        password_hash="hashed123"
    )
    
    # Create session
    session = await session_repo.create(
        user_id=user.id,
        refresh_token_hash="refresh_hash",
        access_jti="access_jti",
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        ip_address="127.0.0.1",
        user_agent="Test Agent"
    )
    
    assert session is not None
    assert session.id is not None
    assert session.user_id == user.id  # Both are UUID objects, will compare correctly
    assert session.refresh_token_hash == "refresh_hash"
    assert session.access_jti == "access_jti"
    assert session.ip_address == "127.0.0.1"
    assert session.user_agent == "Test Agent"
    assert session.revoked_at is None


@pytest.mark.asyncio
async def test_get_active_session(db_session):
    """Test getting an active session for a user."""
    user_repo = UserRepository(db_session)
    session_repo = SessionRepository(db_session)
    
    # Create user first
    user = await user_repo.create(
        email="testuser@example.com",
        username="testuser",
        password_hash="hashed123"
    )
    
    # Create session with future expiration
    session = await session_repo.create(
        user_id=user.id,
        refresh_token_hash="refresh_hash",
        access_jti="access_jti",
        expires_at=datetime.now(timezone.utc) + timedelta(days=30)
    )
    
    # Get active session
    active_session = await session_repo.get_active_by_user(user.id)
    
    assert active_session is not None
    assert active_session.id == session.id
    assert active_session.user_id == user.id
    assert active_session.revoked_at is None


@pytest.mark.asyncio
async def test_get_active_session_not_found_when_revoked(db_session):
    """Test that revoked sessions are not returned as active."""
    user_repo = UserRepository(db_session)
    session_repo = SessionRepository(db_session)
    
    # Create user first
    user = await user_repo.create(
        email="testuser@example.com",
        username="testuser",
        password_hash="hashed123"
    )
    
    # Create session
    session = await session_repo.create(
        user_id=user.id,
        refresh_token_hash="refresh_hash",
        access_jti="access_jti",
        expires_at=datetime.now(timezone.utc) + timedelta(days=30)
    )
    
    # Revoke the session
    await session_repo.revoke(session.id)
    await db_session.flush()
    
    # Try to get active session - should return None
    active_session = await session_repo.get_active_by_user(user.id)
    assert active_session is None


@pytest.mark.asyncio
async def test_revoke_session(db_session):
    """Test revoking a session."""
    user_repo = UserRepository(db_session)
    session_repo = SessionRepository(db_session)
    
    # Create user first
    user = await user_repo.create(
        email="testuser@example.com",
        username="testuser",
        password_hash="hashed123"
    )
    
    # Create session
    session = await session_repo.create(
        user_id=user.id,
        refresh_token_hash="refresh_hash",
        access_jti="access_jti",
        expires_at=datetime.now(timezone.utc) + timedelta(days=30)
    )
    
    # Initially revoked_at should be None
    assert session.revoked_at is None
    
    # Revoke the session
    await session_repo.revoke(session.id)
    await db_session.flush()
    
    # Fetch session again to check updated value
    # Note: We need to refresh the session object or fetch it again
    from sqlalchemy import select
    result = await db_session.execute(select(Session).where(Session.id == session.id))
    revoked_session = result.scalar_one_or_none()
    assert revoked_session is not None
    assert revoked_session.revoked_at is not None


@pytest.mark.asyncio
async def test_revoke_all_for_user(db_session):
    """Test revoking all sessions for a user."""
    user_repo = UserRepository(db_session)
    session_repo = SessionRepository(db_session)
    
    # Create user first
    user = await user_repo.create(
        email="testuser@example.com",
        username="testuser",
        password_hash="hashed123"
    )
    
    # Create 2 sessions for the user
    session1 = await session_repo.create(
        user_id=user.id,
        refresh_token_hash="refresh_hash1",
        access_jti="access_jti1",
        expires_at=datetime.now(timezone.utc) + timedelta(days=30)
    )
    
    session2 = await session_repo.create(
        user_id=user.id,
        refresh_token_hash="refresh_hash2",
        access_jti="access_jti2",
        expires_at=datetime.now(timezone.utc) + timedelta(days=30)
    )
    
    # Initially both sessions should have revoked_at as None
    assert session1.revoked_at is None
    assert session2.revoked_at is None
    
    # Revoke all sessions for the user
    await session_repo.revoke_all_for_user(user.id)
    await db_session.flush()
    
    # Fetch both sessions again to check they are revoked
    from sqlalchemy import select
    result1 = await db_session.execute(select(Session).where(Session.id == session1.id))
    revoked_session1 = result1.scalar_one_or_none()
    result2 = await db_session.execute(select(Session).where(Session.id == session2.id))
    revoked_session2 = result2.scalar_one_or_none()
    
    assert revoked_session1 is not None
    assert revoked_session1.revoked_at is not None
    assert revoked_session2 is not None
    assert revoked_session2.revoked_at is not None

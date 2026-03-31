"""Unit tests for app.core.security — hashing, token creation, decoding, and refresh token generation."""

import pytest
import uuid
from datetime import datetime
from fastapi import HTTPException
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token, generate_refresh_token


def test_hash_password_returns_string():
    result = hash_password("test123")
    assert isinstance(result, str)


def test_hash_password_is_not_plain_text():
    result = hash_password("test123")
    assert result != "test123"


def test_hash_password_starts_with_bcrypt():
    result = hash_password("test123")
    assert result.startswith("$2b$")


def test_verify_password_correct():
    hashed = hash_password("test123")
    assert verify_password("test123", hashed) is True


def test_verify_password_wrong():
    hashed = hash_password("test123")
    assert verify_password("wrongpassword", hashed) is False


def test_create_access_token_returns_tuple():
    result = create_access_token(uuid.uuid4(), "USER")
    assert isinstance(result, tuple)
    assert len(result) == 3


def test_create_access_token_token_is_string():
    token, jti, expires_at = create_access_token(uuid.uuid4(), "USER")
    assert isinstance(token, str)


def test_create_access_token_jti_is_string():
    token, jti, expires_at = create_access_token(uuid.uuid4(), "USER")
    assert isinstance(jti, str)
    assert len(jti) > 0


def test_create_access_token_expires_at_is_datetime():
    token, jti, expires_at = create_access_token(uuid.uuid4(), "USER")
    assert isinstance(expires_at, datetime)


def test_decode_access_token_valid():
    token, jti, expires_at = create_access_token(uuid.uuid4(), "USER")
    payload = decode_access_token(token)
    assert "sub" in payload
    assert "role" in payload


def test_decode_access_token_invalid_raises_401():
    with pytest.raises(HTTPException) as exc_info:
        decode_access_token("invalid.token.here")
    assert exc_info.value.status_code == 401


def test_generate_refresh_token_returns_tuple():
    result = generate_refresh_token()
    assert isinstance(result, tuple)
    assert len(result) == 2


def test_generate_refresh_token_raw_is_long():
    raw_token, token_hash = generate_refresh_token()
    assert len(raw_token) > 50


def test_generate_refresh_token_hash_starts_with_bcrypt():
    raw_token, token_hash = generate_refresh_token()
    assert token_hash.startswith("$2b$")


def test_verify_password_truncation_boundary():
    """Test that passwords longer than 72 bytes are properly truncated."""
    long_password = "a" * 80  # exceeds 72 bytes
    hashed = hash_password(long_password)
    assert verify_password(long_password, hashed) is True
    # First 72 chars should also match — documents the truncation contract
    assert verify_password("a" * 72, hashed) is True

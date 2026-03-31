"""
core/security.py
"""

import secrets
import uuid
import jwt
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)


def hash_password(plain_password: str) -> str:
    """
    Hash a plain text password using bcrypt with cost factor 12.
    Returns the hash string to store in the database.
    """
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain text password against a stored bcrypt hash.
    Returns True if match, False otherwise.
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: uuid.UUID, role: str) -> tuple[str, str, datetime]:
    """
    Create a signed RS256 JWT access token.
    Returns (token_string, jti, expires_at).
    """
    jti = str(uuid.uuid4())
    now = datetime.now(timezone.utc)         
    expires_at = now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "role": role,
        "jti": jti,
        "exp": expires_at,
        "iat": now,               
    }
    token = jwt.encode(payload, settings.JWT_PRIVATE_KEY, algorithm=settings.JWT_ALGORITHM)
    return (token, jti, expires_at)


def decode_access_token(token: str) -> dict:
    """
    Decode and verify a JWT access token.
    Returns the payload dict.
    Raises HTTPException 401 on expired or invalid token.
    """

    try:
        payload = jwt.decode(token, settings.JWT_PUBLIC_KEY, algorithms=[settings.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload


def generate_refresh_token() -> tuple[str, str]:
    """
    Generate a secure refresh token pair.

    Returns:
        (raw_token, hashed_token)
        - raw_token    → send to the client; they store and return it on refresh
        - hashed_token → store in the database; never persist the raw value
    """
    raw_token = secrets.token_urlsafe(64)
    hashed_token = pwd_context.hash(raw_token)
    return raw_token, hashed_token

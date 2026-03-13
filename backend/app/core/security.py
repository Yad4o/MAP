"""
core/security.py
─────────────────
JWT creation/verification and password hashing utilities.

Phase 0: Function signatures only.
Phase 1: Implement using PyJWT and passlib.
"""

import uuid
from datetime import datetime


def hash_password(plain_password: str) -> str:
    """
    Hash a plain text password using bcrypt with cost factor 12.
    Returns the hash string to store in the database.
    Phase 1 — implement using passlib.
    """
    raise NotImplementedError("Phase 1 — implement this")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain text password against a stored bcrypt hash.
    Returns True if match, False otherwise.
    Phase 1 — implement using passlib.
    """
    raise NotImplementedError("Phase 1 — implement this")


def create_access_token(user_id: uuid.UUID, role: str) -> tuple[str, str, datetime]:
    """
    Create a signed RS256 JWT access token.
    Returns (token_string, jti, expires_at).
    Phase 1 — implement using PyJWT.
    """
    raise NotImplementedError("Phase 1 — implement this")


def decode_access_token(token: str) -> dict:
    """
    Decode and verify a JWT access token.
    Returns the payload dict.
    Raises jwt.ExpiredSignatureError or jwt.InvalidTokenError on failure.
    Phase 1 — implement using PyJWT.
    """
    raise NotImplementedError("Phase 1 — implement this")


def generate_refresh_token() -> tuple[str, str]:
    """
    Generate a secure random refresh token.
    Returns (raw_token, bcrypt_hash).
    Store only the hash in the database.
    Phase 1 — implement using secrets + passlib.
    """
    raise NotImplementedError("Phase 1 — implement this")

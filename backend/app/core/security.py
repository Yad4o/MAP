"""
core/security.py
"""

import uuid
import uuid as uuid_module
import jwt
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: uuid.UUID, role: str) -> tuple[str, str, datetime]:
    jti = str(uuid_module.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": str(user_id),
        "role": role,
        "jti": jti,
        "exp": expires_at,
        "iat": datetime.now(timezone.utc),
    }
    private_key = settings.JWT_PRIVATE_KEY.replace("\\n", "\n")
    token = jwt.encode(payload, private_key, algorithm=settings.JWT_ALGORITHM)
    return (token, jti, expires_at)


def decode_access_token(token: str) -> dict:
    public_key = settings.JWT_PUBLIC_KEY.replace("\\n", "\n")
    try:
        payload = jwt.decode(token, public_key, algorithms=[settings.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload


def generate_refresh_token() -> tuple[str, str]:
    raise NotImplementedError("Phase 1 — implement this")

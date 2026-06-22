"""
api/v1/api_keys.py
──────────────────
API key management endpoints.
Keys are stored in the user's metadata_ JSON column — no extra migration needed.
Each key stores: id, name, key_prefix, scopes, is_active, created_at, last_used_at.
The full secret is only returned once at creation (never stored in plaintext).
"""

import uuid
import secrets
import hashlib
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.db.base import get_db
from app.dependencies import get_current_user
from app.db.models.user import User
from app.db.repositories.user_repo import UserRepository

router = APIRouter(prefix="/api-keys", tags=["api-keys"])


# ── Schemas ───────────────────────────────────────────────────

class CreateApiKeyRequest(BaseModel):
    name: str
    scopes: list[str] = ["task:read", "task:write"]
    expires_at: str | None = None


class ApiKeyResponse(BaseModel):
    id: str
    name: str
    key_prefix: str
    scopes: list[str]
    is_active: bool
    last_used_at: str | None
    expires_at: str | None
    created_at: str


class NewApiKeyResponse(ApiKeyResponse):
    full_key: str


# ── Helpers ───────────────────────────────────────────────────

def _get_api_keys(user: User) -> list[dict]:
    meta = user.metadata_ or {}
    return meta.get("api_keys", [])


async def _save_api_keys(user: User, keys: list[dict], db: AsyncSession) -> None:
    meta = dict(user.metadata_ or {})
    meta["api_keys"] = keys
    user.metadata_ = meta
    db.add(user)
    await db.commit()


# ── Routes ────────────────────────────────────────────────────

@router.get("", response_model=list[ApiKeyResponse])
async def list_api_keys(
    current_user: User = Depends(get_current_user),
):
    """Return all API keys for the current user (never returns secret)."""
    keys = _get_api_keys(current_user)
    return [
        ApiKeyResponse(
            id=k["id"],
            name=k["name"],
            key_prefix=k["key_prefix"],
            scopes=k.get("scopes", []),
            is_active=k.get("is_active", True),
            last_used_at=k.get("last_used_at"),
            expires_at=k.get("expires_at"),
            created_at=k["created_at"],
        )
        for k in keys
    ]


@router.post("", response_model=NewApiKeyResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    body: CreateApiKeyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a new API key. The full secret is only returned here — never again."""
    if not body.name or not body.name.strip():
        raise HTTPException(status_code=422, detail="Key name is required.")

    # Generate: prefix (visible) + secret (never stored)
    raw_secret = secrets.token_urlsafe(32)
    key_id = str(uuid.uuid4())
    prefix = f"map_{raw_secret[:8]}"
    full_key = f"{prefix}.{raw_secret}"

    now = datetime.now(timezone.utc).isoformat()

    key_record = {
        "id": key_id,
        "name": body.name.strip(),
        "key_prefix": prefix,
        "key_hash": hashlib.sha256(full_key.encode()).hexdigest(),
        "scopes": body.scopes,
        "is_active": True,
        "created_at": now,
        "last_used_at": None,
        "expires_at": body.expires_at,
    }

    keys = _get_api_keys(current_user)
    keys.append(key_record)
    await _save_api_keys(current_user, keys, db)

    return NewApiKeyResponse(
        id=key_id,
        name=key_record["name"],
        key_prefix=prefix,
        scopes=body.scopes,
        is_active=True,
        last_used_at=None,
        expires_at=body.expires_at,
        created_at=now,
        full_key=full_key,
    )


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key(
    key_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revoke (deactivate) an API key. Does not delete it from history."""
    keys = _get_api_keys(current_user)
    found = False
    for k in keys:
        if k["id"] == key_id:
            k["is_active"] = False
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="API key not found.")
    await _save_api_keys(current_user, keys, db)

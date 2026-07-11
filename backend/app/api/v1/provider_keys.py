"""
api/v1/provider_keys.py
────────────────────────
Lets a user bring their own AI provider key (Claude, OpenAI, Gemini,
Groq) instead of using the platform's shared key for every call.

Keys are encrypted at rest (core/crypto.py) and stored in the user's
metadata_ JSON column — same pattern as api_keys.py, no new migration.
The raw key is never stored, logged, or returned after creation; only
a masked preview (e.g. ******a1b2) is ever shown back.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.db.base import get_db
from app.dependencies import get_current_user
from app.db.models.user import User
from app.core.crypto import encrypt_secret, mask_secret
from app.core.llm_provider import PROVIDERS

router = APIRouter(prefix="/provider-keys", tags=["provider-keys"])


class SetProviderKeyRequest(BaseModel):
    provider: str
    api_key: str = Field(min_length=8)


class ProviderKeyResponse(BaseModel):
    provider: str
    masked_key: str
    added_at: str


def _validate_provider(provider: str) -> None:
    if provider not in PROVIDERS:
        raise HTTPException(status_code=422, detail=f"Unknown provider '{provider}'. Supported: {list(PROVIDERS)}")


@router.get("", response_model=list[ProviderKeyResponse])
async def list_provider_keys(current_user: User = Depends(get_current_user)):
    """List the current user's configured providers. Never returns the real key."""
    stored = (current_user.metadata_ or {}).get("provider_keys", {})
    return [
        ProviderKeyResponse(provider=provider, masked_key=entry["masked_key"], added_at=entry["added_at"])
        for provider, entry in stored.items()
    ]


@router.put("", response_model=ProviderKeyResponse)
async def set_provider_key(
    body: SetProviderKeyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add or replace the current user's key for a provider."""
    _validate_provider(body.provider)

    entry = {
        "key_encrypted": encrypt_secret(body.api_key),
        "masked_key": mask_secret(body.api_key),
        "added_at": datetime.now(timezone.utc).isoformat(),
    }

    metadata = dict(current_user.metadata_ or {})
    provider_keys = dict(metadata.get("provider_keys", {}))
    provider_keys[body.provider] = entry
    metadata["provider_keys"] = provider_keys
    current_user.metadata_ = metadata

    db.add(current_user)
    await db.commit()

    return ProviderKeyResponse(provider=body.provider, masked_key=entry["masked_key"], added_at=entry["added_at"])


@router.delete("/{provider}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_provider_key(
    provider: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove the current user's key for a provider — calls fall back to the platform default."""
    metadata = dict(current_user.metadata_ or {})
    provider_keys = dict(metadata.get("provider_keys", {}))
    if provider not in provider_keys:
        raise HTTPException(status_code=404, detail=f"No key configured for '{provider}'.")

    del provider_keys[provider]
    metadata["provider_keys"] = provider_keys
    current_user.metadata_ = metadata

    db.add(current_user)
    await db.commit()

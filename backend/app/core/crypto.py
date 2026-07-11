"""
core/crypto.py
──────────────
Symmetric encryption for secrets we store at rest (e.g. a user's own
AI provider API key). Never store user-supplied API keys in plaintext.

Uses Fernet (AES-128-CBC + HMAC) from `cryptography`, keyed by
settings.ENCRYPTION_KEY. Losing that key means losing every stored
secret — back it up like any other production credential.
"""

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings


def _fernet() -> Fernet:
    """Derive a valid Fernet key from ENCRYPTION_KEY (any length/format)."""
    if not settings.ENCRYPTION_KEY:
        raise RuntimeError(
            "ENCRYPTION_KEY is not set. Required to store user-provided API keys securely."
        )
    # Fernet needs a 32-byte urlsafe-base64 key; derive one so operators
    # can set ENCRYPTION_KEY to any secret string/hex value.
    digest = hashlib.sha256(settings.ENCRYPTION_KEY.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_secret(plaintext: str) -> str:
    """Encrypt a secret for storage. Returns an opaque token, safe to store as text."""
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt_secret(token: str) -> str:
    """Decrypt a token produced by encrypt_secret. Raises ValueError if it can't be decrypted."""
    try:
        return _fernet().decrypt(token.encode()).decode()
    except InvalidToken:
        raise ValueError("Could not decrypt secret — wrong key or corrupted data.")


def mask_secret(plaintext: str, visible: int = 4) -> str:
    """Show only the last few characters, e.g. sk-...a1b2. Never log/return the rest."""
    if len(plaintext) <= visible:
        return "*" * len(plaintext)
    return f"{'*' * 6}{plaintext[-visible:]}"

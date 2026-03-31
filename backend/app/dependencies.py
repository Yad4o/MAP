from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis
from app.db.base import get_db
from app.core.security import decode_access_token
from app.db.repositories.user_repo import UserRepository
from app.db.models.user import User

bearer_scheme = HTTPBearer()

_redis_client: aioredis.Redis | None = None


def init_redis(client: aioredis.Redis) -> None:
    """Call this once from main.py lifespan startup to set the shared client."""
    global _redis_client
    if _redis_client is not None:
        raise RuntimeError("Redis client already initialised.")
    _redis_client = client


async def _get_redis() -> aioredis.Redis:
    if _redis_client is None:
        raise RuntimeError("Redis client has not been initialised. Call init_redis() at startup.")
    return _redis_client


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user_id = payload.get("sub")
    jti = payload.get("jti")
    if not user_id or not jti:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    redis = await _get_redis()
    is_revoked = await redis.exists(f"revoked:{jti}")
    if is_revoked:
        raise HTTPException(status_code=401, detail="Token has been revoked")
    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="User account is deactivated")
    return user


def require_role(role: str | list[str]):
    roles = [role] if isinstance(role, str) else role


    async def check_role(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail=f"Access denied. Required role(s): {roles}")
        return current_user
    return check_role

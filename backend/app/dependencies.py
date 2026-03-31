from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis
from app.db.base import get_db
from app.config import settings
from app.core.security import decode_access_token
from app.db.repositories.user_repo import UserRepository
from app.db.models.user import User

bearer_scheme = HTTPBearer()


async def get_redis():
    return aioredis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True, ssl_cert_reqs=None)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    jti = payload.get("jti")
    if not user_id or not jti:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    redis = await get_redis()
    try:
        is_revoked = await redis.exists(f"revoked:{jti}")
        if is_revoked:
            raise HTTPException(status_code=401, detail="Token has been revoked")
    finally:
        await redis.aclose()
    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="User account is deactivated")
    return user


def require_role(role: str):
    async def check_role(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role != role:
            raise HTTPException(status_code=403, detail=f"Access denied. Required role: {role}")
        return current_user
    return check_role

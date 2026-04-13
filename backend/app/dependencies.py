from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
import jwt
import uuid
from app.db.base import get_db
from app.core.security import decode_access_token
from app.db.repositories.user_repo import UserRepository
from app.db.models.user import User
from app.core.cache import is_token_revoked

bearer_scheme = HTTPBearer()


async def get_token_payload(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
    token = credentials.credentials
    try:
        return decode_access_token(token)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def get_current_user(
    payload: dict = Depends(get_token_payload),
    db: AsyncSession = Depends(get_db),
) -> User:
    user_id_str = payload.get("sub")
    jti = payload.get("jti")
    if not user_id_str or not jti:
        raise HTTPException(status_code=401, detail="Invalid token payload")
        
    try:
        user_id = uuid.UUID(str(user_id_str))
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token payload format")

    try:
        is_revoked = await is_token_revoked(jti)
        if is_revoked:
            raise HTTPException(status_code=401, detail="Token has been revoked")
    except HTTPException:
        # Re-raise authentication errors so they reach the client
        raise
    except Exception as e:
        # Catch other errors (like Redis connection failure) and continue
        import logging
        logging.getLogger("uvicorn").error(f"Redis connection failed: {e}")
    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="User account is deactivated")
    return user


def require_role(role: str | list[str]):
    roles = [role] if isinstance(role, str) else role


    async def check_role(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail=f"Access denied. Required role(s): {roles}")
        return current_user
    return check_role

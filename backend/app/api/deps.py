# app/api/deps.py
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.services.auth_service import AuthService


def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(db)

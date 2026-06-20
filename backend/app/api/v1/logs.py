"""
api/v1/logs.py
─────────────
System logs endpoint — queries the `logs` DB table and returns
structured log entries for the LogsPage frontend component.
"""

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.db.models.log import Log
from app.dependencies import get_current_user, require_role
from app.db.models.user import User
from pydantic import BaseModel

router = APIRouter()


class LogEntryResponse(BaseModel):
    id: int
    level: str
    event: str
    logger: str
    task_id: Optional[uuid.UUID] = None
    user_id: Optional[uuid.UUID] = None
    timestamp: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=list[LogEntryResponse])
async def get_logs(
    level: str = Query(default="ALL", description="Filter by log level"),
    search: str = Query(default="", description="Search in event text"),
    limit: int = Query(default=200, le=1000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Return structured log entries from the database.
    Admins see all logs; regular users see system logs (user_id IS NULL)
    and their own task logs.
    """
    from sqlalchemy import or_, null

    stmt = select(Log).order_by(desc(Log.created_at)).limit(limit)

    # Non-admin users see system logs (no user attached) + their own logs
    if current_user.role not in ("ADMIN", "SYSTEM"):
        stmt = stmt.where(
            or_(Log.user_id == None, Log.user_id == current_user.id)  # noqa: E711
        )

    # Filter by level
    if level and level != "ALL":
        stmt = stmt.where(Log.level == level.upper())

    # Filter by search text (case-insensitive)
    if search:
        stmt = stmt.where(Log.event.ilike(f"%{search}%"))

    result = await db.execute(stmt)
    logs = result.scalars().all()

    return [
        LogEntryResponse(
            id=log.id,
            level=log.level,
            event=log.event,
            logger=log.logger,
            task_id=log.task_id,
            user_id=log.user_id,
            timestamp=log.created_at,
        )
        for log in logs
    ]

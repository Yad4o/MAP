"""
api/v1/admin.py
────────────────
Admin-only endpoints: system metrics and user management.
All routes require ADMIN or SYSTEM role.
"""

import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.db.base import get_db
from app.dependencies import get_current_user, require_role
from app.db.models.user import User
from app.db.models.task import Task
from app.db.repositories.user_repo import UserRepository

router = APIRouter()

# ── Schemas ───────────────────────────────────────────────────────────────────

class AdminMetrics(BaseModel):
    total_tasks_today: int
    success_rate: float
    avg_task_duration: float
    active_users: int


class AdminUserResponse(BaseModel):
    id: uuid.UUID
    email: str
    username: str
    role: str
    tier: str
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AdminUserUpdate(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None
    tier: Optional[str] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/metrics", response_model=AdminMetrics)
async def get_metrics(
    _: User = Depends(require_role(["ADMIN", "SYSTEM"])),
    db: AsyncSession = Depends(get_db),
):
    """Return aggregated system metrics for the admin dashboard."""
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    # Total tasks created today
    tasks_today_result = await db.execute(
        select(func.count(Task.id)).where(Task.created_at >= today_start)
    )
    total_tasks_today = tasks_today_result.scalar() or 0

    # Completed vs failed today for success rate
    completed_result = await db.execute(
        select(func.count(Task.id)).where(
            Task.created_at >= today_start,
            Task.status == "COMPLETED",
        )
    )
    failed_result = await db.execute(
        select(func.count(Task.id)).where(
            Task.created_at >= today_start,
            Task.status == "FAILED",
        )
    )
    completed = completed_result.scalar() or 0
    failed = failed_result.scalar() or 0
    total_terminal = completed + failed
    success_rate = round((completed / total_terminal * 100) if total_terminal > 0 else 0.0, 1)

    # Average task duration (completed_at - created_at) for completed tasks today
    # Fall back to 0 if the column doesn't exist
    avg_duration = 0.0
    try:
        if hasattr(Task, "completed_at"):
            dur_result = await db.execute(
                select(
                    func.avg(
                        func.extract("epoch", Task.completed_at - Task.created_at)
                    )
                ).where(
                    Task.created_at >= today_start,
                    Task.status == "COMPLETED",
                    Task.completed_at != None,  # noqa: E711
                )
            )
            avg_duration = round(dur_result.scalar() or 0.0, 1)
    except Exception:
        avg_duration = 0.0

    # Active users (logged in within last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    active_result = await db.execute(
        select(func.count(User.id)).where(
            User.is_active == True,  # noqa: E712
            User.last_login_at >= seven_days_ago,
        )
    )
    active_users = active_result.scalar() or 0

    return AdminMetrics(
        total_tasks_today=total_tasks_today,
        success_rate=success_rate,
        avg_task_duration=avg_duration,
        active_users=active_users,
    )


@router.get("/users", response_model=list[AdminUserResponse])
async def get_users(
    _: User = Depends(require_role(["ADMIN", "SYSTEM"])),
    db: AsyncSession = Depends(get_db),
):
    """Return all users for user-management table."""
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [
        AdminUserResponse(
            id=u.id,
            email=u.email,
            username=u.username,
            role=u.role,
            tier=u.tier,
            is_active=u.is_active,
            last_login=u.last_login_at,
            created_at=u.created_at,
        )
        for u in users
    ]


@router.patch("/users/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: uuid.UUID,
    body: AdminUserUpdate,
    _: User = Depends(require_role(["ADMIN", "SYSTEM"])),
    db: AsyncSession = Depends(get_db),
):
    """Update role, active status, or tier for a user."""
    repo = UserRepository(db)
    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nothing to update")

    user = await repo.update(user_id, **update_data)
    await db.commit()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return AdminUserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        role=user.role,
        tier=user.tier,
        is_active=user.is_active,
        last_login=user.last_login_at,
        created_at=user.created_at,
    )

"""
api/v1/tasks.py
───────────────
Task route handlers.

Phase 0: Stubs returning 501.
Phase 2 (Member building API routes): Implement using task_service.
"""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.schemas.task import (
    TaskCreateRequest,
    TaskDetailResponse,
    TaskResponse,
    TaskStatusResponse,
    TaskStepResponse,
)
from app.schemas.common import PaginatedResponse

router = APIRouter()


@router.post("", response_model=TaskResponse, status_code=202)
async def create_task(body: TaskCreateRequest, db: AsyncSession = Depends(get_db)):
    """Submit a task. Returns immediately with task_id. Processing is async."""
    raise NotImplementedError("Phase 2 — implement this")


@router.get("", response_model=PaginatedResponse[TaskResponse])
async def list_tasks(page: int = 1, page_size: int = 20, db: AsyncSession = Depends(get_db)):
    raise NotImplementedError("Phase 2 — implement this")


@router.get("/{task_id}", response_model=TaskDetailResponse)
async def get_task(task_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    raise NotImplementedError("Phase 2 — implement this")


@router.get("/{task_id}/status", response_model=TaskStatusResponse)
async def get_task_status(task_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Lightweight status poll. Use this for polling, not get_task."""
    raise NotImplementedError("Phase 2 — implement this")


@router.get("/{task_id}/steps", response_model=list[TaskStepResponse])
async def get_task_steps(task_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    raise NotImplementedError("Phase 2 — implement this")


@router.delete("/{task_id}", status_code=204)
async def cancel_task(task_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    raise NotImplementedError("Phase 2 — implement this")


@router.post("/{task_id}/retry", response_model=TaskResponse, status_code=202)
async def retry_task(task_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    raise NotImplementedError("Phase 2 — implement this")

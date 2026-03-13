"""
services/task_service.py
─────────────────────────
Business logic for task management.

Phase 0: Signatures only.
Phase 2: Implement — creates DB records and pushes to Redis queue.
"""

import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.task import (
    TaskCreateRequest,
    TaskDetailResponse,
    TaskResponse,
    TaskStatusResponse,
    TaskStepResponse,
    TaskStatus,
)
from app.schemas.common import PaginatedResponse


class TaskService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_task(
        self, user_id: uuid.UUID, data: TaskCreateRequest
    ) -> TaskResponse:
        """
        1. Create task record in DB with status=PENDING
        2. Push task_id to Redis Celery queue
        3. Return TaskResponse immediately (async processing)
        """
        raise NotImplementedError("Phase 2 — implement this")

    async def list_tasks(
        self,
        user_id: uuid.UUID,
        status: TaskStatus | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> PaginatedResponse[TaskResponse]:
        raise NotImplementedError("Phase 2 — implement this")

    async def get_task_detail(
        self, task_id: uuid.UUID, user_id: uuid.UUID
    ) -> TaskDetailResponse:
        raise NotImplementedError("Phase 2 — implement this")

    async def get_task_status(
        self, task_id: uuid.UUID, user_id: uuid.UUID
    ) -> TaskStatusResponse:
        """Check Redis cache first, fall back to DB."""
        raise NotImplementedError("Phase 2 — implement this")

    async def cancel_task(self, task_id: uuid.UUID, user_id: uuid.UUID) -> None:
        raise NotImplementedError("Phase 2 — implement this")

    async def retry_task(
        self, task_id: uuid.UUID, user_id: uuid.UUID
    ) -> TaskResponse:
        raise NotImplementedError("Phase 2 — implement this")

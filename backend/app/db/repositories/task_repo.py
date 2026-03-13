"""
db/repositories/task_repo.py
─────────────────────────────
Data access layer for tasks and task_steps.

Phase 0: Signatures only.
Phase 2 (Member building DB layer): Fill in the implementations.
"""

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.task import Task, TaskStep
from app.schemas.task import TaskStatus


class TaskRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        user_id: uuid.UUID,
        title: str,
        description: str,
        priority: int = 5,
        config: dict | None = None,
    ) -> Task:
        raise NotImplementedError("Phase 2 — implement this")

    async def get_by_id(self, task_id: uuid.UUID) -> Task | None:
        raise NotImplementedError("Phase 2 — implement this")

    async def get_by_id_and_user(self, task_id: uuid.UUID, user_id: uuid.UUID) -> Task | None:
        raise NotImplementedError("Phase 2 — implement this")

    async def list_by_user(
        self,
        user_id: uuid.UUID,
        status: TaskStatus | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Task], int]:
        raise NotImplementedError("Phase 2 — implement this")

    async def update_status(
        self,
        task_id: uuid.UUID,
        status: TaskStatus,
        extra_fields: dict[str, Any] | None = None,
    ) -> None:
        raise NotImplementedError("Phase 2 — implement this")

    async def set_result(self, task_id: uuid.UUID, result: dict[str, Any]) -> None:
        raise NotImplementedError("Phase 2 — implement this")

    async def set_error(self, task_id: uuid.UUID, error: dict[str, Any]) -> None:
        raise NotImplementedError("Phase 2 — implement this")

    async def increment_retry(self, task_id: uuid.UUID) -> None:
        raise NotImplementedError("Phase 2 — implement this")


class TaskStepRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        task_id: uuid.UUID,
        step_index: int,
        step_type: str,
        agent_name: str,
        input_payload: dict,
    ) -> TaskStep:
        raise NotImplementedError("Phase 2 — implement this")

    async def list_by_task(self, task_id: uuid.UUID) -> list[TaskStep]:
        raise NotImplementedError("Phase 2 — implement this")

    async def complete_step(
        self,
        step_id: uuid.UUID,
        output_payload: dict,
        model_used: str | None = None,
        tokens_in: int = 0,
        tokens_out: int = 0,
        latency_ms: int = 0,
        confidence: float | None = None,
    ) -> None:
        raise NotImplementedError("Phase 2 — implement this")

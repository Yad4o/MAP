"""
db/repositories/task.py
──────────────────────
Data access layer for tasks and task_steps.

TaskRepository with async methods: create, get, get_all_by_user, update, delete.
TaskStepRepository with: create, get_by_task, delete.
"""

import uuid

from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.task import Task, TaskStep


class TaskRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, user_id: uuid.UUID, data: dict) -> Task:
        """Create a new task. Returns the created Task instance."""
        new_task = Task(
            user_id=user_id,
            title=data["title"],
            description=data.get("description"),
            status="pending"
        )
        self.db.add(new_task)
        await self.db.flush()
        await self.db.refresh(new_task)
        return new_task

    async def get(self, task_id: uuid.UUID) -> Task | None:
        """Fetch task by UUID. Returns None if not found."""
        result = await self.db.execute(
            select(Task).where(Task.id == task_id).options(selectinload(Task.steps))
        )
        return result.scalar_one_or_none()

    async def get_all_by_user(self, user_id: uuid.UUID) -> list[Task]:
        """Fetch all tasks for a user."""
        result = await self.db.execute(
            select(Task).where(Task.user_id == user_id).order_by(Task.created_at.desc())
        )
        return result.scalars().all()

    async def update(self, task_id: uuid.UUID, data: dict) -> Task | None:
        """Update task. Returns updated Task or None if not found."""
        stmt = (
            update(Task)
            .where(Task.id == task_id)
            .values(**data)
            .returning(Task)
        )
        result = await self.db.execute(stmt)
        await self.db.flush()
        return result.scalar_one_or_none()

    async def delete(self, task_id: uuid.UUID) -> bool:
        """Delete task. Returns True if deleted, False if not found."""
        stmt = delete(Task).where(Task.id == task_id)
        result = await self.db.execute(stmt)
        return result.rowcount > 0


class TaskStepRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, task_id: uuid.UUID, data: dict) -> TaskStep:
        """Create a new task step. Returns the created TaskStep instance."""
        new_step = TaskStep(
            task_id=task_id,
            title=data["title"],
            order=data["order"],
            step_index=data.get("step_index", 0),
            step_type=data.get("step_type", "generic")
        )
        self.db.add(new_step)
        await self.db.flush()
        await self.db.refresh(new_step)
        return new_step

    async def get_by_task(self, task_id: uuid.UUID) -> list[TaskStep]:
        """Fetch all steps for a task, ordered by order."""
        result = await self.db.execute(
            select(TaskStep).where(TaskStep.task_id == task_id).order_by(TaskStep.order)
        )
        return result.scalars().all()

    async def delete(self, step_id: uuid.UUID) -> bool:
        """Delete task step. Returns True if deleted, False if not found."""
        stmt = delete(TaskStep).where(TaskStep.id == step_id)
        result = await self.db.execute(stmt)
        return result.rowcount > 0

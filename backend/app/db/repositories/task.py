"""
db/repositories/task.py
─────────────────────────────
Data access layer for tasks and task_steps.
Consolidated from Phase 1 and Phase 2.
"""

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update, func
from sqlalchemy.orm import selectinload

from app.db.models.task import Task, TaskStep
from app.schemas.task import TaskStatus
from app.db.repositories.protocols import TaskRepositoryProtocol


class TaskRepository(TaskRepositoryProtocol):
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
        """Create a new task with individual parameters."""
        task = Task(
            user_id=user_id,
            title=title,
            description=description,
            priority=priority,
            config=config,
            status="PENDING"
        )
        self.db.add(task)
        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def get_by_id(self, task_id: uuid.UUID) -> Task | None:
        query = select(Task).options(selectinload(Task.steps)).where(Task.id == task_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_id_and_user(self, task_id: uuid.UUID, user_id: uuid.UUID) -> Task | None:
        query = select(Task).options(selectinload(Task.steps)).where(Task.id == task_id, Task.user_id == user_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_by_user(
        self,
        user_id: uuid.UUID,
        status: TaskStatus | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Task], int]:
        # Get total count first
        count_query = select(func.count()).select_from(Task).where(Task.user_id == user_id)
        if status is not None:
            count_query = count_query.where(Task.status == status)
        total = (await self.db.execute(count_query)).scalar_one()
        
        # Get paginated results
        query = select(Task).options(selectinload(Task.steps)).where(Task.user_id == user_id).order_by(Task.created_at.desc())
        if status is not None:
            query = query.where(Task.status == status)
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        tasks = result.scalars().all()
        
        return tasks, total

    async def update_status(
        self,
        task_id: uuid.UUID,
        status: TaskStatus,
        extra_fields: dict[str, Any] | None = None,
    ) -> None:
        values = {"status": status}
        if extra_fields is not None:
            values.update(extra_fields)
        await self.db.execute(update(Task).where(Task.id == task_id).values(**values))
        await self.db.commit()

    async def set_result(self, task_id: uuid.UUID, result: dict[str, Any]) -> None:
        query = update(Task).where(Task.id == task_id).values(result=result)
        await self.db.execute(query)
        await self.db.commit()

    async def set_error(self, task_id: uuid.UUID, error: dict[str, Any]) -> None:
        query = update(Task).where(Task.id == task_id).values(error=error)
        await self.db.execute(query)
        await self.db.commit()

    async def increment_retry(self, task_id: uuid.UUID) -> None:
        query = update(Task).where(Task.id == task_id).values(retry_count=Task.retry_count + 1)
        await self.db.execute(query)
        await self.db.commit()

    async def get(self, task_id: uuid.UUID) -> Any | None:
        """Get a task by ID."""
        return await self.get_by_id(task_id)

    async def get_all_by_user(self, user_id: uuid.UUID) -> list:
        """Get all tasks for a user."""
        tasks, _ = await self.list_by_user(user_id)
        return tasks

    async def update(self, task_id: uuid.UUID, data: Any) -> Any | None:
        """Update a task."""
        task = await self.get_by_id(task_id)
        if not task:
            return None
        
        update_data = data.model_dump(exclude_unset=True) if hasattr(data, 'model_dump') else data
        for field, value in update_data.items():
            setattr(task, field, value)
        
        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def update_owned(self, task_id: uuid.UUID, user_id: uuid.UUID, data: Any) -> Any | None:
        """Update a task with ownership check."""
        task = await self.get_by_id_and_user(task_id, user_id)
        if not task:
            return None
        
        update_data = data.model_dump(exclude_unset=True) if hasattr(data, 'model_dump') else data
        for field, value in update_data.items():
            setattr(task, field, value)
        
        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def delete(self, task_id: uuid.UUID) -> bool:
        """Delete a task."""
        task = await self.get_by_id(task_id)
        if not task:
            return False
        
        await self.db.delete(task)
        await self.db.commit()
        return True

    async def delete_owned(self, task_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """Delete a task with ownership check."""
        task = await self.get_by_id_and_user(task_id, user_id)
        if not task:
            return False
        
        await self.db.delete(task)
        await self.db.commit()
        return True


class TaskStepRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, task_id: uuid.UUID, data: dict) -> TaskStep:
        """Create a new task step. Returns the created TaskStep instance."""
        new_step = TaskStep(
            task_id=task_id,
            title=data.get("title", ""),
            order=data.get("order", 0),
            step_index=data.get("step_index", 0),
            step_type=data.get("step_type", "generic")
        )
        self.db.add(new_step)
        await self.db.commit()
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
        await self.db.commit()
        return result.rowcount > 0

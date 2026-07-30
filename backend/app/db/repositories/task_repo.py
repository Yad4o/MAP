"""
db/repositories/task_repo.py
─────────────────────────────
Data access layer for tasks and task_steps.
"""

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update, func
from sqlalchemy.orm import selectinload

from app.db.models.task import Task, TaskStep, TaskMessage
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
        """Create a new task."""
        task = Task(
            user_id=user_id,
            title=title,
            description=description,
            priority=priority,
            config=config,
            status=TaskStatus.PENDING.value
        )
        self.db.add(task)
        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def get_by_id(self, task_id: uuid.UUID) -> Task | None:
        query = select(Task).options(selectinload(Task.steps), selectinload(Task.messages)).where(Task.id == task_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_id_and_user(self, task_id: uuid.UUID, user_id: uuid.UUID) -> Task | None:
        query = select(Task).options(selectinload(Task.steps), selectinload(Task.messages)).where(Task.id == task_id, Task.user_id == user_id)
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
            count_query = count_query.where(Task.status == status.value if isinstance(status, TaskStatus) else status)
        total = (await self.db.execute(count_query)).scalar_one()
        
        # Get paginated results
        query = select(Task).options(selectinload(Task.steps)).where(Task.user_id == user_id).order_by(Task.created_at.desc())
        if status is not None:
            query = query.where(Task.status == status.value if isinstance(status, TaskStatus) else status)
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
        values = {"status": status.value if isinstance(status, TaskStatus) else status}
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

    async def get(self, task_id: uuid.UUID) -> Task | None:
        """Get a task by ID."""
        return await self.get_by_id(task_id)

    async def get_all_by_user(self, user_id: uuid.UUID) -> list[Task]:
        """Get all tasks for a user."""
        tasks, _ = await self.list_by_user(user_id, page_size=100)
        return tasks

    async def update(self, task_id: uuid.UUID, data: Any) -> Task | None:
        """Update a task."""
        task = await self.get_by_id(task_id)
        if not task:
            return None
        
        update_data = data.model_dump(exclude_unset=True) if hasattr(data, 'model_dump') else data
        for field, value in update_data.items():
            if hasattr(task, field):
                setattr(task, field, value)
        
        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def update_owned(self, task_id: uuid.UUID, user_id: uuid.UUID, data: Any) -> Task | None:
        """Update a task with ownership check."""
        task = await self.get_by_id_and_user(task_id, user_id)
        if not task:
            return None
        
        update_data = data.model_dump(exclude_unset=True) if hasattr(data, 'model_dump') else data
        for field, value in update_data.items():
            if hasattr(task, field):
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

    async def update_status_if_not_terminal(
        self,
        task_id: uuid.UUID,
        user_id: uuid.UUID,
        new_status: TaskStatus,
    ) -> Task | None:
        """Atomically update task status only if not in a terminal state."""
        terminal_states = [TaskStatus.COMPLETED.value, TaskStatus.FAILED.value, TaskStatus.CANCELLED.value]
        
        query = (
            update(Task)
            .where(
                Task.id == task_id,
                Task.user_id == user_id,
                Task.status.notin_(terminal_states)
            )
            .values(status=new_status.value if isinstance(new_status, TaskStatus) else new_status)
            .returning(Task)
        )
        
        result = await self.db.execute(query)
        updated_task = result.scalar_one_or_none()
        
        if updated_task:
            await self.db.commit()
            return updated_task
            
        return None


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
        title: str | None = None,
    ) -> TaskStep:
        """Create a new task step."""
        step = TaskStep(
            task_id=task_id,
            step_index=step_index,
            step_type=step_type,
            agent_name=agent_name,
            input_payload=input_payload,
            title=title or f"Step {step_index}",
            order=step_index, # Using step_index for order by default
            status="PENDING"
        )
        self.db.add(step)
        await self.db.commit()
        await self.db.refresh(step)
        return step

    async def list_by_task(self, task_id: uuid.UUID) -> list[TaskStep]:
        """List all steps for a task."""
        query = select(TaskStep).where(TaskStep.task_id == task_id).order_by(TaskStep.order)
        result = await self.db.execute(query)
        return result.scalars().all()

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
        """Complete a task step."""
        query = (
            update(TaskStep)
            .where(TaskStep.id == step_id)
            .values(
                status="COMPLETED",
                output_payload=output_payload,
                model_used=model_used,
                tokens_in=tokens_in,
                tokens_out=tokens_out,
                latency_ms=latency_ms,
                confidence=confidence,
                completed_at=func.now()
            )
        )
        await self.db.execute(query)
        await self.db.commit()

    async def delete(self, step_id: uuid.UUID) -> bool:
        """Delete a task step."""
        step = await self.db.get(TaskStep, step_id)
        if not step:
            return False
        await self.db.delete(step)
        await self.db.commit()
        return True


class TaskMessageRepository:
    """Data access for a task's follow-up conversation thread."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, task_id: uuid.UUID, role: str, content: str) -> TaskMessage:
        """Append a message to a task's thread."""
        message = TaskMessage(task_id=task_id, role=role, content=content)
        self.db.add(message)
        await self.db.commit()
        await self.db.refresh(message)
        return message

    async def list_by_task(self, task_id: uuid.UUID) -> list[TaskMessage]:
        """List all messages for a task, oldest first."""
        query = select(TaskMessage).where(TaskMessage.task_id == task_id).order_by(TaskMessage.created_at)
        result = await self.db.execute(query)
        return result.scalars().all()

"""
db/models/task.py
─────────────────
SQLAlchemy ORM models for tasks and task_steps tables.

Phase 0: Skeleton — all columns declared, no logic yet.
Phase 2 (Member building DB layer): Add foreign keys,
         relationships, and create the Alembic migration.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Task(Base):
    __tablename__ = "tasks"

    # ── Primary Key ───────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # ── Ownership ─────────────────────────────────────────────
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # ── Task Definition ───────────────────────────────────────
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="pending", index=True)

    # ── Timestamps ────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(),
        onupdate=func.now(), nullable=False
    )

    # ── Relationships ─────────────────────────────────────────
    steps: Mapped[list["TaskStep"]] = relationship("TaskStep", back_populates="task", cascade="all, delete-orphan")
    # user: Mapped["User"] = relationship("User", back_populates="tasks")  # Commented out for SQLite compatibility

    def __repr__(self) -> str:
        return f"<Task id={self.id} status={self.status} title={self.title[:30]}>"


class TaskStep(Base):
    __tablename__ = "task_steps"

    # ── Primary Key ───────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # ── Foreign Key ────────────────────────────────────────────
    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # ── Step Definition ───────────────────────────────────────
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False)

    # ── Timestamps ────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # ── Relationships ─────────────────────────────────────────
    task: Mapped["Task"] = relationship("Task", back_populates="steps")

    def __repr__(self) -> str:
        return f"<TaskStep task_id={self.task_id} order={self.order} title={self.title[:30]}>"

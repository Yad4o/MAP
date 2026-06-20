"""
schemas/task.py
───────────────
Request and response schemas for the Task module.

TaskStatus and TaskType are the single source of truth for valid values —
use these everywhere instead of raw strings.
"""

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


# ── Enums ─────────────────────────────────────────────────────

class TaskStatus(str, Enum):
    PENDING    = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED  = "COMPLETED"
    FAILED     = "FAILED"
    CANCELLED  = "CANCELLED"
    RETRYING   = "RETRYING"


class TaskType(str, Enum):
    RESEARCH  = "research"
    CODE      = "code"
    DATA      = "data"
    DOCUMENT  = "document"
    GENERAL   = "general"


class StepType(str, Enum):
    ROOT     = "ROOT"
    PLAN     = "PLAN"
    EXECUTE  = "EXECUTE"
    ANALYZE  = "ANALYZE"
    MEMORY   = "MEMORY"
    FALLBACK = "FALLBACK"


class StepStatus(str, Enum):
    PENDING   = "PENDING"
    RUNNING   = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED    = "FAILED"
    SKIPPED   = "SKIPPED"


# ── Requests ──────────────────────────────────────────────────

class TaskCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = Field(default=None, min_length=1)
    priority: int = Field(default=5, ge=1, le=10)
    config: dict[str, Any] | None = None


class TaskUpdateRequest(BaseModel):
    title: str | None = Field(None, min_length=3, max_length=500)
    description: str | None = None
    priority: int | None = Field(None, ge=1, le=10)
    config: dict[str, Any] | None = None


class TaskListParams(BaseModel):
    status: TaskStatus | None = None
    task_type: TaskType | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


# ── Responses ─────────────────────────────────────────────────

class StepRead(BaseModel):
    id: UUID
    step_index: int
    step_type: str
    agent_name: str | None
    status: StepStatus
    model_used: str | None
    tokens_in: int | None
    tokens_out: int | None
    latency_ms: int | None
    confidence: float | None
    input_payload: dict[str, Any] | None
    output_payload: dict[str, Any] | None
    created_at: datetime
    completed_at: datetime | None

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class TaskStepResponse(BaseModel):
    id: UUID
    step_index: int
    step_type: StepType
    agent_name: str
    status: StepStatus
    model_used: str | None
    tokens_in: int | None
    tokens_out: int | None
    latency_ms: int | None
    confidence: float | None
    input_payload: dict[str, Any] | None
    output_payload: dict[str, Any] | None
    created_at: datetime
    completed_at: datetime | None

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class TaskRead(BaseModel):
    """Task schema for service layer - includes user_id for ownership validation."""
    id: UUID
    user_id: UUID
    title: str
    description: str | None
    status: TaskStatus
    task_type: TaskType | None
    priority: int
    retry_count: int
    config: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime | None = None
    started_at: datetime | None
    completed_at: datetime | None
    result: dict[str, Any] | None
    error: dict[str, Any] | None

    model_config = {"from_attributes": True}


class TaskDetailRead(TaskRead):
    """Task detail schema including execution steps."""
    steps: list[StepRead] = []



class TaskResponse(BaseModel):
    """Lightweight task summary — used in list views."""
    id: UUID
    title: str
    status: TaskStatus
    task_type: TaskType | None
    priority: int
    retry_count: int
    created_at: datetime
    updated_at: datetime | None = None
    started_at: datetime | None
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class TaskDetailResponse(TaskResponse):
    """Full task detail including result and steps — used in detail view."""
    description: str
    config: dict[str, Any] | None
    result: dict[str, Any] | None
    error: dict[str, Any] | None
    steps: list[TaskStepResponse] = []


class TaskStatusResponse(BaseModel):
    """Lightweight status-only response for polling."""
    task_id: UUID = Field(..., validation_alias="id")
    status: TaskStatus

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

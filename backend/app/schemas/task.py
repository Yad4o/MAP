"""Pydantic schemas for Task and TaskStep — shared contracts for the Task System."""

from datetime import datetime
from enum import StrEnum
from typing import Optional

from pydantic import BaseModel, ConfigDict


class TaskStatus(StrEnum):
    pending = "pending"
    in_progress = "in_progress"
    done = "done"


class TaskStepCreate(BaseModel):
    title: str
    order: int


class TaskStepRead(TaskStepCreate):
    id: int
    task_id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.pending


class TaskRead(TaskCreate):
    id: int
    user_id: int
    steps: list[TaskStepRead] = []
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None

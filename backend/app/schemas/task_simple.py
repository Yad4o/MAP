"""
Simple task schemas for basic task management.
"""

from pydantic import BaseModel, Field
from typing import Optional


class TaskCreate(BaseModel):
    """Schema for creating a new task."""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    status: Optional[str] = Field("pending", pattern="^(pending|in_progress|completed|cancelled)$")
    priority: Optional[str] = Field("medium", pattern="^(low|medium|high|critical)$")


class TaskRead(BaseModel):
    """Schema for reading task data."""
    id: int
    user_id: int
    title: str
    description: Optional[str]
    status: str
    priority: str


class TaskUpdate(BaseModel):
    """Schema for updating a task."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    status: Optional[str] = Field(None, pattern="^(pending|in_progress|completed|cancelled)$")
    priority: Optional[str] = Field(None, pattern="^(low|medium|high|critical)$")

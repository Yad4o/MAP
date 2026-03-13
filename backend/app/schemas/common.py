"""
schemas/common.py
─────────────────
Shared Pydantic types reused across all schemas.
Import from here instead of re-defining in each file.
"""

from datetime import datetime
from typing import Any, Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel, Field

T = TypeVar("T")


class TimestampMixin(BaseModel):
    """Adds created_at and updated_at to any response schema."""
    created_at: datetime
    updated_at: datetime | None = None


class PaginationParams(BaseModel):
    """Standard query parameters for paginated list endpoints."""
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic wrapper for paginated list responses."""
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class ErrorResponse(BaseModel):
    """Standard error response returned by all error handlers."""
    error_code: str
    message: str
    request_id: str | None = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    details: dict[str, Any] | None = None


class MessageResponse(BaseModel):
    """Generic message response for simple confirmations."""
    message: str

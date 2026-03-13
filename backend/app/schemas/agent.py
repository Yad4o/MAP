"""
schemas/agent.py
────────────────
Request and response schemas for the Agent module.
Also contains the AgentMessage schema used for inter-agent communication.
"""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


# ── Inter-Agent Message ───────────────────────────────────────

class AgentMetadata(BaseModel):
    """Performance metadata attached to every agent message."""
    model_used: str | None = None
    tokens_in: int | None = None
    tokens_out: int | None = None
    latency_ms: int | None = None
    fallback_used: bool = False


class AgentMessage(BaseModel):
    """
    The contract for all inter-agent communication.
    Every agent sends and receives this format.
    Never pass raw dicts between agents — always use this class.
    """
    message_id: UUID
    task_id: UUID
    sender: str         # planner | executor | analyzer | memory | controller
    recipient: str      # agent name or 'controller'
    message_type: str   # plan | step_result | validation | memory_context | error
    payload: dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: AgentMetadata = Field(default_factory=AgentMetadata)


# ── Plan Schema (output of Planner) ──────────────────────────

class PlanStep(BaseModel):
    """A single step in the execution plan produced by the Planner."""
    step_id: str
    description: str
    assigned_agent: str         # executor | analyzer | memory
    tool_names: list[str]
    dependency_step_ids: list[str] = []
    expected_output_schema: dict[str, Any] | None = None
    estimated_duration_s: int | None = None


class PlanDocument(BaseModel):
    """Full execution plan produced by the Planner Agent."""
    task_id: UUID
    task_type: str
    steps: list[PlanStep]
    estimated_total_duration_s: int | None = None
    notes: str | None = None


# ── Step Result (output of Executor) ─────────────────────────

class StepResult(BaseModel):
    """Result produced by the Executor for a single plan step."""
    step_id: str
    task_id: UUID
    output: dict[str, Any]
    tool_calls: list[dict[str, Any]] = []
    tokens_in: int = 0
    tokens_out: int = 0
    latency_ms: int = 0
    is_complete: bool = True
    confidence: float | None = None


# ── API Schemas ───────────────────────────────────────────────

class AgentRunRequest(BaseModel):
    """Direct agent invocation — admin only."""
    agent_name: str
    task_id: UUID
    payload: dict[str, Any]


class AgentRunResponse(BaseModel):
    agent_name: str
    result: dict[str, Any]
    metadata: AgentMetadata


class MemorySearchRequest(BaseModel):
    query: str = Field(..., min_length=3)
    top_k: int = Field(default=3, ge=1, le=10)


class MemorySearchResult(BaseModel):
    content: str
    score: float
    task_id: UUID | None = None
    created_at: datetime | None = None

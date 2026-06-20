"""
agents/shared/message.py
─────────────────────────
AgentMessage — the contract for all inter-agent communication.

This file is the single source of truth for message structure.
Importing from here ensures all agents speak the same language.

Phase 0: Fully defined. Do not change field names after Phase 1 starts
         without updating all agents that use them.
"""

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class AgentMetadata:
    """Performance and model metadata attached to every message."""
    model_used: str | None = None
    tokens_in: int = 0
    tokens_out: int = 0
    latency_ms: int = 0
    fallback_used: bool = False


@dataclass
class AgentMessage:
    """
    Every message passed between agents uses this structure.

    message_type values:
      - "plan"            Planner → Controller: contains PlanDocument
      - "step_result"     Executor → Controller: contains StepResult
      - "validation"      Analyzer → Controller: contains validation report
      - "memory_context"  Memory → Executor: contains retrieved context
      - "error"           Any agent → Controller: contains error detail
    """
    message_id: uuid.UUID
    task_id: uuid.UUID
    sender: str
    recipient: str
    message_type: str
    payload: dict[str, Any]
    timestamp: datetime = field(default_factory=datetime.utcnow)
    metadata: AgentMetadata = field(default_factory=AgentMetadata)

    def to_dict(self) -> dict[str, Any]:
        """Serialize for Redis storage or logging."""
        return {
            "message_id": str(self.message_id),
            "task_id": str(self.task_id),
            "sender": self.sender,
            "recipient": self.recipient,
            "message_type": self.message_type,
            "payload": self.payload,
            "timestamp": self.timestamp.isoformat(),
            "metadata": {
                "model_used": self.metadata.model_used,
                "tokens_in": self.metadata.tokens_in,
                "tokens_out": self.metadata.tokens_out,
                "latency_ms": self.metadata.latency_ms,
                "fallback_used": self.metadata.fallback_used,
            },
        }

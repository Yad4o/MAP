"""
agents/shared/base_agent.py
────────────────────────────
Abstract base class that all agents inherit from.
Defines the interface every agent must implement.

Phase 0: Interface only. No LLM calls.
Phase 4: Each agent fills in its run() method.
"""

import uuid
from abc import ABC, abstractmethod
from datetime import datetime

from agents.shared.message import AgentMessage, AgentMetadata


class BaseAgent(ABC):
    """
    Every agent in MAP inherits this class.
    The agent's name, description, and run() method must be defined.
    """

    name: str = "base"          # Override in each subclass
    description: str = ""       # Human-readable description of what this agent does

    def __init__(self, task_id: uuid.UUID, config: dict | None = None):
        self.task_id = task_id
        self.config = config or {}

    @abstractmethod
    async def run(self, message: AgentMessage) -> AgentMessage:
        """
        Process an incoming AgentMessage and return a response AgentMessage.
        This is the only method routes and the AgentController call.
        """
        ...

    def build_response(
        self,
        recipient: str,
        message_type: str,
        payload: dict,
        metadata: AgentMetadata | None = None,
    ) -> AgentMessage:
        """
        Convenience method to build a properly formatted response message.
        Use this instead of constructing AgentMessage manually.
        """
        return AgentMessage(
            message_id=uuid.uuid4(),
            task_id=self.task_id,
            sender=self.name,
            recipient=recipient,
            message_type=message_type,
            payload=payload,
            timestamp=datetime.utcnow(),
            metadata=metadata or AgentMetadata(),
        )

    def build_error(self, error_message: str) -> AgentMessage:
        """Build a standardized error response message."""
        return self.build_response(
            recipient="controller",
            message_type="error",
            payload={"error": error_message, "agent": self.name},
        )

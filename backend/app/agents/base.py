"""
agents/base.py
──────────────
Base class for all agents.
"""

import uuid
from datetime import datetime
from typing import Any
from app.schemas.agent import AgentMessage, AgentMetadata

class BaseAgent:
    def __init__(self, name: str):
        self.name = name

    def build_response(
        self, 
        task_id: uuid.UUID | str, 
        message_type: str, 
        payload: dict[str, Any], 
        metadata: AgentMetadata,
        recipient: str = "controller"
    ) -> AgentMessage:
        """
        Constructs a standard AgentMessage for outward communication.
        """
        if isinstance(task_id, str):
            task_id = uuid.UUID(task_id)
            
        return AgentMessage(
            message_id=uuid.uuid4(),
            task_id=task_id,
            sender=self.name,
            recipient=recipient,
            message_type=message_type,
            payload=payload,
            timestamp=datetime.utcnow(),
            metadata=metadata
        )

    def build_error(
        self, 
        task_id: uuid.UUID | str, 
        error_message: str,
        metadata: AgentMetadata | None = None
    ) -> AgentMessage:
        """
        Constructs a standard AgentMessage with type 'error'.
        """
        return self.build_response(
            task_id=task_id,
            message_type="error",
            payload={"error": error_message},
            metadata=metadata or AgentMetadata()
        )

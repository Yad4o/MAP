"""
agents/memory/memory_agent.py
──────────────────────────────
Manages long-term FAISS-backed memory per user.

# ALREADY IMPLEMENTED: MemoryAgent skeleton exists — adding full run(),
#                       retrieve(), and store() implementations.

Phase 4: Dispatches on message_type:
  - "retrieve" → vector_store.search() → returns memory_context
  - "store"    → vector_store.add()    → returns memory_stored
  - unknown    → build_error()
"""

import logging
import uuid

from agents.memory.vector_store import vector_store
from agents.shared.base_agent import BaseAgent
from agents.shared.message import AgentMessage

logger = logging.getLogger(__name__)


class MemoryAgent(BaseAgent):
    """
    Two responsibilities:
    1. RETRIEVE: Before Executor steps — semantic search for relevant context
    2. STORE:    After task completion — embed and index task summary

    Uses FAISS via the module-level VectorStore singleton.
    Chroma is a drop-in alternative — swap vector_store import only.
    """

    name = "memory"
    description = "Stores and retrieves context using vector search."

    async def run(self, message: AgentMessage) -> AgentMessage:
        """
        Dispatch based on message_type:

          "retrieve":
            Input payload:  { "user_id": str, "query": str, "top_k": int (opt) }
            Output payload: { "memory_context": list[dict] }

          "store":
            Input payload:  { "user_id": str, "text": str, "metadata": dict (opt) }
            Output payload: { "memory_stored": True }

          unknown → build_error(...)
        """
        if message.message_type == "retrieve":
            return await self._handle_retrieve(message)

        if message.message_type == "store":
            return await self._handle_store(message)

        logger.warning(
            "MemoryAgent: unknown message_type=%s for task %s",
            message.message_type,
            message.task_id,
        )
        return self.build_error(
            f"Unknown memory message type: '{message.message_type}'. "
            "Expected 'retrieve' or 'store'."
        )

    # ── Retrieve ─────────────────────────────────────────────────────────────

    async def _handle_retrieve(self, message: AgentMessage) -> AgentMessage:
        user_id = str(message.payload.get("user_id", str(self.task_id)))
        query = message.payload.get("query", "")
        top_k = int(message.payload.get("top_k", 3))

        if not query:
            return self.build_error("MemoryAgent retrieve: 'query' is required in payload.")

        logger.info(
            "MemoryAgent.retrieve: user=%s query=%.80r top_k=%d",
            user_id,
            query,
            top_k,
        )

        results = await self.retrieve(user_id, query, top_k)

        return self.build_response(
            recipient="controller",
            message_type="memory_context",
            payload={"memory_context": results},
        )

    # ── Store ─────────────────────────────────────────────────────────────────

    async def _handle_store(self, message: AgentMessage) -> AgentMessage:
        user_id = str(message.payload.get("user_id", str(self.task_id)))
        text = message.payload.get("text", "")
        metadata = message.payload.get("metadata") or {}

        if not text:
            return self.build_error("MemoryAgent store: 'text' is required in payload.")

        logger.info(
            "MemoryAgent.store: user=%s text_len=%d",
            user_id,
            len(text),
        )

        await self.store(
            user_id,
            self.task_id,
            text,
            extra_metadata=metadata,
        )

        return self.build_response(
            recipient="controller",
            message_type="memory_stored",
            payload={"memory_stored": True},
        )

    # ── Public helpers (also callable directly) ───────────────────────────────

    async def retrieve(self, user_id: uuid.UUID | str, query: str, top_k: int = 3) -> list[dict]:
        """Semantic search over a user's long-term memory."""
        return await vector_store.search(str(user_id), query, top_k=top_k)

    async def store(
        self,
        user_id: uuid.UUID | str,
        task_id: uuid.UUID,
        content: str,
        extra_metadata: dict | None = None,
    ) -> None:
        """Embed content and upsert into the user's FAISS index."""
        metadata = {"task_id": str(task_id), **(extra_metadata or {})}
        await vector_store.add(str(user_id), content, metadata=metadata)




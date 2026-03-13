"""
agents/memory/memory_agent.py
──────────────────────────────
Manages short-term (Redis) and long-term (FAISS) memory.

Phase 0: Skeleton only.
Phase 4: Implement vector store operations and context retrieval.
"""

import uuid
from agents.shared.base_agent import BaseAgent
from agents.shared.message import AgentMessage


class MemoryAgent(BaseAgent):
    """
    Two responsibilities:
    1. RETRIEVE: Before Executor steps — semantic search for relevant context
    2. STORE:    After task completion — embed and index task summary

    Uses FAISS by default. Chroma is a drop-in alternative.
    """

    name = "memory"
    description = "Stores and retrieves context using vector search."

    async def run(self, message: AgentMessage) -> AgentMessage:
        """
        Dispatch based on message_type:
          - "retrieve": search vector store, return top-k results
          - "store":    embed and index the task results

        Input payload (retrieve):  { "query": str, "top_k": int }
        Output payload (retrieve): { "results": list[MemoryResult] }

        Input payload (store):     { "task_summary": str, "task_type": str }
        Output payload (store):    { "stored": bool, "embedding_ids": list[str] }

        Phase 4 — implement this
        """
        raise NotImplementedError("Phase 4 — implement this")

    async def retrieve(self, user_id: uuid.UUID, query: str, top_k: int = 3) -> list[dict]:
        """Semantic search over user's long-term memory."""
        raise NotImplementedError("Phase 4 — implement this")

    async def store(self, user_id: uuid.UUID, task_id: uuid.UUID, content: str) -> list[str]:
        """Embed content and upsert into user's FAISS index."""
        raise NotImplementedError("Phase 4 — implement this")

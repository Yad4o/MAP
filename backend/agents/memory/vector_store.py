"""
agents/memory/vector_store.py
──────────────────────────────
FAISS-backed vector store for per-user long-term memory.

Each user gets their own FAISS index (IndexFlatL2, dim=1536) backed by
OpenAI text-embedding-3-small embeddings.  The index and its metadata are
persisted to disk so they survive process restarts.

Storage layout:
    data/faiss/{user_id}/
        index.faiss      ← FAISS binary
        metadata.json    ← list[{text, score, ...metadata}]

Embedding model: text-embedding-3-small  (dimension = 1536)
"""

import asyncio
import json
import logging
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import faiss
import numpy as np
from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings

logger = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────────────────────
_EMBEDDING_MODEL = "text-embedding-3-small"
_DIM = 1536  # dimension for text-embedding-3-small

# Root path for all FAISS data.  Override via FAISS_DATA_DIR env var.
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
FAISS_DATA_DIR = Path(os.getenv("FAISS_DATA_DIR", str(_PROJECT_ROOT / "data" / "faiss")))

_MAX_CACHED_USERS = int(os.getenv("FAISS_CACHE_MAX_USERS", "100"))


class VectorStore:
    """
    Per-user FAISS vector store with async add / search operations.

    Usage:
        from agents.memory.vector_store import vector_store   # module singleton

        await vector_store.add(user_id, "some text", {"source": "task_123"})
        results = await vector_store.search(user_id, "query", top_k=3)
    """

    def __init__(self) -> None:
        self._initial_client: AsyncOpenAI | None = None
        self._locks: dict[str, asyncio.Lock] = {}

    @property
    def _client(self) -> AsyncOpenAI | None:
        if self._initial_client is not None:
            return self._initial_client
        if settings.OPENAI_API_KEY:
            self._initial_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            return self._initial_client
        return None

    @_client.setter
    def _client(self, value: AsyncOpenAI | None) -> None:
        self._initial_client = value

    def _get_lock(self, user_id: str) -> asyncio.Lock:
        if user_id not in self._locks:
            self._locks[user_id] = asyncio.Lock()
        return self._locks[user_id]

    # ── Internal helpers ─────────────────────────────────────────────────────

    def _user_dir(self, user_id: str) -> Path:
        return FAISS_DATA_DIR / str(user_id)

    def _index_path(self, user_id: str) -> Path:
        return self._user_dir(user_id) / "index.faiss"

    def _meta_path(self, user_id: str) -> Path:
        return self._user_dir(user_id) / "metadata.json"

    @lru_cache(maxsize=_MAX_CACHED_USERS)
    def _load_or_create(self, user_id: str) -> dict[str, Any]:
        """
        Load index + metadata from disk if they exist, otherwise create fresh.
        Result is cached via lru_cache.
        """

        index_path = self._index_path(user_id)
        meta_path = self._meta_path(user_id)

        if index_path.exists() and meta_path.exists():
            logger.debug("VectorStore: loading existing index for user %s", user_id)
            index = faiss.read_index(str(index_path))
            with open(meta_path, "r", encoding="utf-8") as f:
                metadata = json.load(f)
        else:
            logger.debug("VectorStore: creating new index for user %s", user_id)
            index = faiss.IndexFlatL2(_DIM)
            metadata = []

        entry = {"index": index, "metadata": metadata}
        return entry

    def _save(self, user_id: str) -> None:
        """Persist the in-memory index and metadata to disk."""
        entry = self._load_or_create(user_id)
        user_dir = self._user_dir(user_id)
        user_dir.mkdir(parents=True, exist_ok=True)

        faiss.write_index(entry["index"], str(self._index_path(user_id)))
        with open(self._meta_path(user_id), "w", encoding="utf-8") as f:
            json.dump(entry["metadata"], f, ensure_ascii=False, indent=2, default=str)

        logger.debug(
            "VectorStore: saved index for user %s (%d vectors)",
            user_id,
            entry["index"].ntotal,
        )

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8))
    async def _embed(self, text: str) -> np.ndarray:
        """Embed a single text string using OpenAI."""
        if self._client:
            response = await self._client.embeddings.create(
                input=text,
                model=_EMBEDDING_MODEL,
            )
            vector = np.array(response.data[0].embedding, dtype=np.float32)
        else:
            # Fallback for when no API key is available
            vector = np.zeros(_DIM, dtype=np.float32)
            
        return vector

    # ── Public API ───────────────────────────────────────────────────────────

    async def add(
        self,
        user_id: str,
        text: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        """
        Embed *text* and add it to the user's FAISS index.
        *metadata* is stored alongside for retrieval.

        Args:
            user_id:  identifies the user's personal index
            text:     the content to embed and store
            metadata: arbitrary key-value pairs stored with the vector
        """
        async with self._get_lock(user_id):
            vector = await self._embed(text)

            entry = self._load_or_create(user_id)
            entry["index"].add(vector.reshape(1, _DIM))
            entry["metadata"].append(
                {
                    "text": text,
                    **(metadata or {}),
                }
            )
            await asyncio.get_event_loop().run_in_executor(None, self._save, user_id)

        logger.info(
            "VectorStore.add: user=%s total_vectors=%d",
            user_id,
            entry["index"].ntotal,
        )

    async def search(
        self,
        user_id: str,
        query: str,
        top_k: int = 3,
    ) -> list[dict[str, Any]]:
        """
        Embed *query* and return the top-k nearest results from the user's index.

        Returns:
            List of dicts, each containing:
                - "text":   str   — the stored document text
                - "score":  float — L2 distance (lower = more similar)
                - plus any metadata keys stored during add()

        Returns an empty list when the user has no vectors yet.
        """
        entry = self._load_or_create(user_id)

        if entry["index"].ntotal == 0:
            logger.debug("VectorStore.search: user %s has no vectors", user_id)
            return []

        k = min(top_k, entry["index"].ntotal)
        query_vector = await self._embed(query)

        distances, indices = entry["index"].search(query_vector.reshape(1, _DIM), k)

        results: list[dict[str, Any]] = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx < 0:  # FAISS returns -1 for padding
                continue
            item = dict(entry["metadata"][idx])
            item["score"] = float(dist)
            results.append(item)

        logger.info(
            "VectorStore.search: user=%s query=%.50r top_k=%d returned=%d",
            user_id,
            query,
            top_k,
            len(results),
        )
        return results


# ── Module-level singleton ───────────────────────────────────────────────────
vector_store = VectorStore()

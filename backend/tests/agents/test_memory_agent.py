"""
backend/tests/agents/test_memory_agent.py
───────────────────────────────────
Unit tests for:
  - agents/memory/memory_agent.py  (MemoryAgent)
  - agents/memory/vector_store.py  (VectorStore)
"""

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import faiss
import numpy as np
import pytest

from agents.memory.memory_agent import MemoryAgent
from agents.memory.vector_store import VectorStore, _DIM
from agents.shared.message import AgentMessage, AgentMetadata


# ── Constants ─────────────────────────────────────────────────────────────────

_FAKE_EMBEDDING = [0.01] * _DIM  # deterministic fake embedding for all tests


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def tmp_faiss_dir(tmp_path, monkeypatch):
    """
    Redirect VectorStore to use a temporary directory so tests
    never write to the real data/faiss/ folder.
    """
    import agents.memory.vector_store as vs_module
    monkeypatch.setattr(vs_module, "FAISS_DATA_DIR", tmp_path)
    return tmp_path


@pytest.fixture
def fresh_vector_store(tmp_faiss_dir):
    """A VectorStore instance with a clean in-memory cache and tmp storage."""
    store = VectorStore()
    # Patch the OpenAI client so no real calls are made
    store._client = MagicMock()
    store._client.embeddings.create = AsyncMock(
        return_value=_mock_embedding_response(_FAKE_EMBEDDING)
    )
    return store


@pytest.fixture
def task_id():
    return uuid.uuid4()


@pytest.fixture
def user_id():
    return str(uuid.uuid4())


def _mock_embedding_response(embedding: list[float]):
    """Build a minimal mock OpenAI embedding response."""
    mock_data = MagicMock()
    mock_data.embedding = embedding
    mock_resp = MagicMock()
    mock_resp.data = [mock_data]
    return mock_resp


def _make_agent(task_id_val=None) -> MemoryAgent:
    return MemoryAgent(task_id=task_id_val or uuid.uuid4())


def _make_message(message_type: str, payload: dict[str, Any], task_id=None) -> AgentMessage:
    return AgentMessage(
        message_id=uuid.uuid4(),
        task_id=task_id or uuid.uuid4(),
        sender="controller",
        recipient="memory",
        message_type=message_type,
        payload=payload,
        timestamp=datetime.utcnow(),
        metadata=AgentMetadata(),
    )


# ── MemoryAgent tests ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestMemoryAgentRun:

    # 1. "store" → calls vector_store.add()
    async def test_store_calls_vector_store_add(self, user_id, task_id):
        agent = _make_agent(task_id)
        message = _make_message(
            "store",
            {"user_id": user_id, "text": "Task about climate data analysis"},
            task_id=task_id,
        )

        with patch("agents.memory.memory_agent.vector_store") as mock_vs:
            mock_vs.add = AsyncMock()
            result = await agent.run(message)

        mock_vs.add.assert_awaited_once()
        call_args = mock_vs.add.call_args
        assert call_args[0][0] == user_id                         # user_id
        assert call_args[0][1] == "Task about climate data analysis"  # text

    # 2. "retrieve" → calls vector_store.search()
    async def test_retrieve_calls_vector_store_search(self, user_id, task_id):
        agent = _make_agent(task_id)
        message = _make_message(
            "retrieve",
            {"user_id": user_id, "query": "climate data", "top_k": 3},
            task_id=task_id,
        )

        with patch("agents.memory.memory_agent.vector_store") as mock_vs:
            mock_vs.search = AsyncMock(return_value=[])
            result = await agent.run(message)

        mock_vs.search.assert_awaited_once_with(user_id, "climate data", top_k=3)

    # 3. "retrieve" returns message_type="memory_context"
    async def test_retrieve_returns_memory_context_type(self, user_id, task_id):
        agent = _make_agent(task_id)
        message = _make_message(
            "retrieve",
            {"user_id": user_id, "query": "something"},
            task_id=task_id,
        )

        with patch("agents.memory.memory_agent.vector_store") as mock_vs:
            mock_vs.search = AsyncMock(return_value=[{"text": "hello", "score": 0.1}])
            result = await agent.run(message)

        assert result.message_type == "memory_context"
        assert "memory_context" in result.payload
        assert result.payload["memory_context"] == [{"text": "hello", "score": 0.1}]

    # 4. "store" returns memory_stored=True
    async def test_store_returns_memory_stored(self, user_id, task_id):
        agent = _make_agent(task_id)
        message = _make_message(
            "store",
            {"user_id": user_id, "text": "completed task summary"},
            task_id=task_id,
        )

        with patch("agents.memory.memory_agent.vector_store") as mock_vs:
            mock_vs.add = AsyncMock()
            result = await agent.run(message)

        assert result.payload["memory_stored"] is True

    # 5. Unknown message_type → build_error
    async def test_unknown_message_type_returns_error(self, user_id, task_id):
        agent = _make_agent(task_id)
        message = _make_message(
            "explode",
            {"user_id": user_id},
            task_id=task_id,
        )
        result = await agent.run(message)

        assert result.message_type == "error"
        assert "error" in result.payload
        assert "explode" in result.payload["error"]

    # 6. Missing "query" in retrieve → error
    async def test_retrieve_missing_query_returns_error(self, user_id, task_id):
        agent = _make_agent(task_id)
        message = _make_message("retrieve", {"user_id": user_id}, task_id=task_id)

        result = await agent.run(message)
        assert result.message_type == "error"

    # 7. Missing "text" in store → error
    async def test_store_missing_text_returns_error(self, user_id, task_id):
        agent = _make_agent(task_id)
        message = _make_message("store", {"user_id": user_id}, task_id=task_id)

        result = await agent.run(message)
        assert result.message_type == "error"


# ── VectorStore tests ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestVectorStore:

    # 4. add() embeds text and adds to index without error
    async def test_add_embeds_and_inserts(self, fresh_vector_store, user_id):
        await fresh_vector_store.add(user_id, "Hello world", {"source": "test"})

        entry = fresh_vector_store._load_or_create(user_id)
        assert entry["index"].ntotal == 1
        assert entry["metadata"][0]["text"] == "Hello world"
        assert entry["metadata"][0]["source"] == "test"

    # 5. search() returns top-k results with scores
    async def test_search_returns_results_with_scores(self, fresh_vector_store, user_id):
        # Add 3 documents
        for i in range(3):
            await fresh_vector_store.add(user_id, f"Document {i}", {"idx": i})

        results = await fresh_vector_store.search(user_id, "Document 0", top_k=2)

        assert len(results) == 2
        for r in results:
            assert "score" in r
            assert isinstance(r["score"], float)
            assert "text" in r

    # 6. FAISS index is saved to data/faiss/{user_id}/index.faiss after add()
    async def test_add_saves_index_to_disk(self, fresh_vector_store, user_id, tmp_faiss_dir):
        await fresh_vector_store.add(user_id, "persist this", {})

        index_path = tmp_faiss_dir / user_id / "index.faiss"
        meta_path = tmp_faiss_dir / user_id / "metadata.json"

        assert index_path.exists(), "index.faiss was not saved"
        assert meta_path.exists(), "metadata.json was not saved"

    # 7. FAISS index is loaded from disk on next instantiation (persistence)
    async def test_persistence_across_instantiation(self, tmp_faiss_dir, user_id):
        # First store: add a vector and persist
        store_a = VectorStore()
        store_a._client = MagicMock()
        store_a._client.embeddings.create = AsyncMock(
            return_value=_mock_embedding_response(_FAKE_EMBEDDING)
        )

        await store_a.add(user_id, "persistent memory", {"task_id": "t1"})

        # Second store: fresh instance — must load from disk
        store_b = VectorStore()
        store_b._client = MagicMock()
        store_b._client.embeddings.create = AsyncMock(
            return_value=_mock_embedding_response(_FAKE_EMBEDDING)
        )

        entry = store_b._load_or_create(user_id)
        assert entry["index"].ntotal == 1
        assert entry["metadata"][0]["text"] == "persistent memory"

    # 8. search() on empty index returns []
    async def test_search_empty_index_returns_empty_list(self, fresh_vector_store, user_id):
        results = await fresh_vector_store.search(user_id, "anything", top_k=3)
        assert results == []

    # 9. Multi-user isolation: user A and user B have separate indexes
    async def test_multi_user_isolation(self, fresh_vector_store):
        user_a = str(uuid.uuid4())
        user_b = str(uuid.uuid4())

        await fresh_vector_store.add(user_a, "User A secret", {})
        await fresh_vector_store.add(user_b, "User B secret", {})

        results_a = await fresh_vector_store.search(user_a, "User A secret", top_k=5)
        results_b = await fresh_vector_store.search(user_b, "User B secret", top_k=5)

        texts_a = {r["text"] for r in results_a}
        texts_b = {r["text"] for r in results_b}

        # No cross-contamination
        assert "User B secret" not in texts_a
        assert "User A secret" not in texts_b

    # 10. add() calls OpenAI embeddings exactly once per text
    async def test_add_calls_embed_once(self, fresh_vector_store, user_id):
        await fresh_vector_store.add(user_id, "embed me", {})

        fresh_vector_store._client.embeddings.create.assert_awaited_once()

    # 11. search() respects top_k parameter
    async def test_search_respects_top_k(self, fresh_vector_store, user_id):
        for i in range(10):
            await fresh_vector_store.add(user_id, f"Entry number {i}", {})

        results_3 = await fresh_vector_store.search(user_id, "entry", top_k=3)
        results_5 = await fresh_vector_store.search(user_id, "entry", top_k=5)

        assert len(results_3) == 3
        assert len(results_5) == 5

    # 12. metadata.json content matches added items
    async def test_metadata_json_content(self, fresh_vector_store, user_id, tmp_faiss_dir):
        await fresh_vector_store.add(user_id, "check metadata", {"key": "value"})
        meta_path = tmp_faiss_dir / user_id / "metadata.json"
        with open(meta_path) as f:
            data = json.load(f)

        assert len(data) == 1
        assert data[0]["text"] == "check metadata"
        assert data[0]["key"] == "value"

"""
test_provider_keys_routes.py
─────────────────────────────
Integration tests for /api/v1/provider-keys: a user adding, listing,
and removing their own AI provider key.

Covers the things that actually matter for a secrets endpoint:
- the raw key is never present anywhere in a response
- a stored key round-trips correctly (decryptable later)
- unauthenticated requests are rejected
- an unknown provider is rejected
"""

import uuid
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi.testclient import TestClient

from app.core.crypto import decrypt_secret
from app.db.base import get_db
from app.dependencies import get_current_user
from app.main import app

mock_user = Mock()
mock_user.id = uuid.UUID("12345678-1234-5678-9abc-123456789abc")
mock_user.email = "test@example.com"
mock_user.role = "USER"
mock_user.metadata_ = {}


@pytest.fixture(autouse=True)
def reset_mock_user_metadata():
    mock_user.metadata_ = {}
    yield


@pytest.fixture
def override_dependencies():
    async def fake_get_db():
        db = AsyncMock()
        db.add = Mock()  # SQLAlchemy's Session.add() is sync, unlike commit()
        yield db

    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_db] = fake_get_db
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def test_client(override_dependencies):
    with TestClient(app) as client:
        yield client


class TestSetProviderKey:
    def test_set_key_returns_masked_value_only(self, test_client):
        response = test_client.put(
            "/api/v1/provider-keys", json={"provider": "anthropic", "api_key": "sk-ant-real-secret-value"}
        )

        assert response.status_code == 200
        body = response.json()
        assert body["provider"] == "anthropic"
        assert "sk-ant-real-secret-value" not in response.text
        assert body["masked_key"].endswith("alue")

    def test_stored_key_is_encrypted_and_round_trips(self, test_client):
        test_client.put("/api/v1/provider-keys", json={"provider": "openai", "api_key": "sk-my-openai-key"})

        stored = mock_user.metadata_["provider_keys"]["openai"]
        assert stored["key_encrypted"] != "sk-my-openai-key"
        assert decrypt_secret(stored["key_encrypted"]) == "sk-my-openai-key"

    def test_unknown_provider_rejected(self, test_client):
        response = test_client.put(
            "/api/v1/provider-keys", json={"provider": "not-a-real-provider", "api_key": "sk-whatever-key"}
        )
        assert response.status_code == 422

    def test_short_key_rejected(self, test_client):
        response = test_client.put("/api/v1/provider-keys", json={"provider": "openai", "api_key": "short"})
        assert response.status_code == 422

    def test_setting_key_twice_replaces_it(self, test_client):
        test_client.put("/api/v1/provider-keys", json={"provider": "openai", "api_key": "sk-first-key-value"})
        test_client.put("/api/v1/provider-keys", json={"provider": "openai", "api_key": "sk-second-key-value"})

        stored = mock_user.metadata_["provider_keys"]["openai"]
        assert decrypt_secret(stored["key_encrypted"]) == "sk-second-key-value"


class TestListProviderKeys:
    def test_empty_when_none_configured(self, test_client):
        response = test_client.get("/api/v1/provider-keys")
        assert response.status_code == 200
        assert response.json() == []

    def test_lists_configured_providers_masked_only(self, test_client):
        test_client.put("/api/v1/provider-keys", json={"provider": "anthropic", "api_key": "sk-ant-real-secret"})

        response = test_client.get("/api/v1/provider-keys")

        assert response.status_code == 200
        body = response.json()
        assert len(body) == 1
        assert body[0]["provider"] == "anthropic"
        assert "sk-ant-real-secret" not in response.text


class TestDeleteProviderKey:
    def test_delete_removes_key(self, test_client):
        test_client.put("/api/v1/provider-keys", json={"provider": "openai", "api_key": "sk-my-openai-key"})

        response = test_client.delete("/api/v1/provider-keys/openai")

        assert response.status_code == 204
        assert "openai" not in mock_user.metadata_["provider_keys"]

    def test_delete_nonexistent_key_404s(self, test_client):
        response = test_client.delete("/api/v1/provider-keys/openai")
        assert response.status_code == 404


class TestAuthRequired:
    def test_unauthenticated_request_rejected(self):
        app.dependency_overrides.clear()
        with TestClient(app) as client:
            response = client.get("/api/v1/provider-keys")
        assert response.status_code in (401, 403)

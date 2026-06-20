"""
test_fallback_engine.py
-----------------------
Tests for the simplified FallbackEngine (which no longer falls back, just calls Groq directly).
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.core.fallback_engine import FallbackEngine
from app.config import settings

class TestFallbackEngine:
    """Test the FallbackEngine class."""
    
    @pytest.fixture
    def mock_openai_client(self):
        """Mock OpenAI client."""
        return AsyncMock()
    
    @pytest.fixture
    def fallback_engine_with_mocks(self, mock_openai_client):
        """Create engine with mocked OpenAI client."""
        engine = FallbackEngine()
        engine._client = mock_openai_client
        return engine, mock_openai_client
    
    @pytest.mark.asyncio
    async def test_primary_model_success(self, fallback_engine_with_mocks):
        """Test successful call to primary model."""
        engine, mock_client = fallback_engine_with_mocks
        
        # Mock successful response with usage
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "Primary response"
        mock_response.usage = MagicMock()
        mock_response.usage.prompt_tokens = 10
        mock_response.usage.completion_tokens = 5
        mock_client.chat.completions.create.return_value = mock_response
        
        messages = [{"role": "user", "content": "Hello"}]
        content, fallback_used, tokens_in, tokens_out = await engine.chat_completion(
            messages=messages,
            model="gpt-4o",
            temperature=0.7
        )
        
        assert content == "Primary response"
        assert fallback_used is False
        assert tokens_in == 10
        assert tokens_out == 5
        
        # Verify primary client was called
        mock_client.chat.completions.create.assert_called_once_with(
            model="gpt-4o",
            messages=messages,
            temperature=0.7,
            max_tokens=None
        )

    @pytest.mark.asyncio
    async def test_model_failure(self, fallback_engine_with_mocks):
        """Test model failure raises error directly."""
        engine, mock_client = fallback_engine_with_mocks
        mock_client.chat.completions.create.side_effect = Exception("API Error")
        
        messages = [{"role": "user", "content": "Hello"}]
        with pytest.raises(Exception, match="API Error"):
            await engine.chat_completion(
                messages=messages,
                model="gpt-4o",
                temperature=0.7
            )

    @pytest.mark.asyncio
    async def test_max_tokens_parameter(self, fallback_engine_with_mocks):
        """Test that max_tokens parameter is passed correctly."""
        engine, mock_client = fallback_engine_with_mocks
        
        mock_client.chat.completions.create.return_value = MagicMock(
            choices=[MagicMock(message=MagicMock(content="Response"))],
            usage=MagicMock(prompt_tokens=5, completion_tokens=3)
        )
        
        messages = [{"role": "user", "content": "Hello"}]
        content, fallback_used, tokens_in, tokens_out = await engine.chat_completion(
            messages=messages,
            model="gpt-4o",
            temperature=0.7,
            max_tokens=100
        )
        
        assert content == "Response"
        assert fallback_used is False
        assert tokens_in == 5
        assert tokens_out == 3
        
        # Verify max_tokens was passed
        call_args = mock_client.chat.completions.create.call_args
        assert call_args[1]['max_tokens'] == 100

class TestFallbackEngineIntegration:
    """Integration tests for fallback engine."""
    
    @pytest.mark.asyncio
    async def test_fallback_engine_singleton(self):
        """Test that fallback_engine singleton is properly initialized."""
        from app.core.fallback_engine import fallback_engine
        
        # Should be instance of FallbackEngine
        assert isinstance(fallback_engine, FallbackEngine)
        assert hasattr(fallback_engine, 'chat_completion')

if __name__ == "__main__":
    pytest.main([__file__, "-v"])

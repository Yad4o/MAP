"""
test_fallback_engine.py
-----------------------
Tests for the fallback engine with circuit breaker functionality.
"""

import pytest
import asyncio
import time
from unittest.mock import AsyncMock, patch, MagicMock
from app.core.fallback_engine import FallbackEngine, CircuitBreaker
from app.config import settings


class TestCircuitBreaker:
    """Test the CircuitBreaker class."""
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_initial_state(self):
        """Test that circuit breaker starts in CLOSED state."""
        breaker = CircuitBreaker(failure_threshold=3)
        assert breaker.state == "CLOSED"
        assert breaker.failure_count == 0
        assert await breaker.is_available() is True
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_success(self):
        """Test that success keeps circuit closed."""
        breaker = CircuitBreaker(failure_threshold=3)
        await breaker.record_success()
        assert breaker.state == "CLOSED"
        assert breaker.failure_count == 0
        assert await breaker.is_available() is True
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_failure_threshold(self):
        """Test that circuit opens after failure threshold."""
        breaker = CircuitBreaker(failure_threshold=3)
        
        # Record failures up to threshold
        for i in range(3):
            await breaker.record_failure()
        
        assert breaker.state == "OPEN"
        assert breaker.failure_count == 3
        assert await breaker.is_available() is False
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_half_open_after_timeout(self):
        """Test that circuit transitions to HALF_OPEN after timeout."""
        breaker = CircuitBreaker(failure_threshold=2, timeout=1)
        
        # Trigger circuit open
        await breaker.record_failure()
        await breaker.record_failure()
        assert breaker.state == "OPEN"
        assert await breaker.is_available() is False
        
        # Wait for timeout
        time.sleep(1.1)
        
        # Should now be HALF_OPEN
        assert await breaker.is_available() is True
        assert breaker.state == "HALF_OPEN"
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_closes_on_success(self):
        """Test that circuit closes after success in HALF_OPEN state."""
        breaker = CircuitBreaker(failure_threshold=2, timeout=1)
        
        # Trigger circuit open
        await breaker.record_failure()
        await breaker.record_failure()
        assert breaker.state == "OPEN"
        
        # Wait for timeout
        time.sleep(1.1)
        assert await breaker.is_available() is True
        assert breaker.state == "HALF_OPEN"
        
        # Record success should close circuit
        await breaker.record_success()
        assert breaker.state == "CLOSED"
        assert breaker.failure_count == 0
        assert await breaker.is_available() is True


class TestFallbackEngine:
    """Test the FallbackEngine class."""
    
    @pytest.fixture
    def mock_openai_client(self):
        """Mock OpenAI client."""
        mock_client = AsyncMock()
        return mock_client
    
    @pytest.fixture
    def fallback_engine_with_mocks(self, mock_openai_client):
        """Create fallback engine with mocked OpenAI clients."""
        with patch('app.core.fallback_engine.AsyncOpenAI') as mock_async_openai:
            mock_async_openai.return_value = mock_openai_client
            engine = FallbackEngine()
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
        breaker = engine._get_breaker("gpt-4o")
        assert breaker.state == "CLOSED"
        
        # Verify primary client was called
        mock_client.chat.completions.create.assert_called_once_with(
            model="gpt-4o",
            messages=messages,
            temperature=0.7,
            max_tokens=None
        )
    
    @pytest.mark.asyncio
    async def test_primary_failure_fallback_success(self, fallback_engine_with_mocks):
        """Test that fallback works when primary fails."""
        engine, mock_client = fallback_engine_with_mocks
        
        def side_effect(*args, **kwargs):
            if kwargs.get("model") == "gpt-4o":
                raise Exception("Primary failed")
            return MagicMock(
                choices=[MagicMock(message=MagicMock(content="Fallback response"))],
                usage=MagicMock(prompt_tokens=8, completion_tokens=4)
            )
        
        # Mock primary failure, then fallback success
        mock_client.chat.completions.create.side_effect = side_effect
        
        messages = [{"role": "user", "content": "Hello"}]
        
        content, fallback_used, tokens_in, tokens_out = await engine.chat_completion(
            messages=messages,
            model="gpt-4o",
            temperature=0.7
        )
        
        assert content == "Fallback response"
        assert fallback_used is True
        assert tokens_in == 8
        assert tokens_out == 4
        
        # Verify both clients were called
        assert mock_client.chat.completions.create.call_count == 2
        
        # Verify circuit breaker recorded the primary failure
        breaker = engine._get_breaker("gpt-4o")
        assert breaker.failure_count == 1  # primary failure must have been recorded
        assert breaker.state == "CLOSED"   # one failure below threshold of 5
    
    @pytest.mark.asyncio
    async def test_circuit_open_uses_fallback(self, fallback_engine_with_mocks):
        """Test that open circuit bypasses primary and uses fallback directly."""
        engine, mock_client = fallback_engine_with_mocks
        
        # Force circuit open
        breaker = engine._get_breaker("gpt-4o")
        for i in range(5):
            await breaker.record_failure()
        
        assert breaker.state == "OPEN"
        assert await breaker.is_available() is False
        
        # Mock fallback response with usage
        mock_client.chat.completions.create.return_value = MagicMock(
            choices=[MagicMock(message=MagicMock(content="Fallback response"))],
            usage=MagicMock(prompt_tokens=6, completion_tokens=3)
        )
        
        messages = [{"role": "user", "content": "Hello"}]
        content, fallback_used, tokens_in, tokens_out = await engine.chat_completion(
            messages=messages,
            model="gpt-4o",
            temperature=0.7
        )
        
        assert content == "Fallback response"
        assert fallback_used is True
        assert tokens_in == 6
        assert tokens_out == 3
        
        # Verify only one call was made (fallback only)
        assert mock_client.chat.completions.create.call_count == 1
        
        # Verify fallback model was used
        call_args = mock_client.chat.completions.create.call_args
        assert call_args[1]['model'] == settings.FALLBACK_MODEL
    
    @pytest.mark.asyncio
    async def test_both_primary_and_fallback_fail(self, fallback_engine_with_mocks):
        """Test when both primary and fallback fail."""
        engine, mock_client = fallback_engine_with_mocks
        
        # Mock both primary and fallback failures
        mock_client.chat.completions.create.side_effect = Exception("All calls failed")
        
        messages = [{"role": "user", "content": "Hello"}]
        
        with pytest.raises(Exception, match=r"Primary:.*Fallback:"):
            await engine.chat_completion(
                messages=messages,
                model="gpt-4o",
                temperature=0.7,
            )
        
        # Get the breaker for the model being tested
        breaker = engine._get_breaker("gpt-4o")
        assert breaker.failure_count == 1  # only primary failure increments the breaker
    
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
        assert hasattr(fallback_engine, 'breakers')       # dict, not singular
        assert callable(fallback_engine._get_breaker)
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_state_persistence(self):
        """Test that circuit breaker state persists across instances."""
        # Create a fresh instance (not the singleton)
        engine = FallbackEngine()
        breaker = engine._get_breaker("gpt-4o")
        
        initial_failures = breaker.failure_count
        
        # Record failures
        for i in range(2):
            await breaker.record_failure()

        assert breaker.failure_count == initial_failures + 2
        assert breaker.state == "CLOSED"  # threshold is 5

        await breaker.record_success()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

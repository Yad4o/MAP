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
    
    def test_circuit_breaker_initial_state(self):
        """Test that circuit breaker starts in CLOSED state."""
        breaker = CircuitBreaker()
        assert breaker.state == "CLOSED"
        assert breaker.failure_count == 0
        assert asyncio.run(breaker.is_available()) is True
    
    def test_circuit_breaker_success(self):
        """Test that success keeps circuit closed."""
        breaker = CircuitBreaker(failure_threshold=3)
        breaker.record_success()
        assert breaker.state == "CLOSED"
        assert breaker.failure_count == 0
        assert asyncio.run(breaker.is_available()) is True
    
    def test_circuit_breaker_failure_threshold(self):
        """Test that circuit opens after failure threshold."""
        breaker = CircuitBreaker(failure_threshold=3)
        
        # Record failures up to threshold
        for i in range(3):
            breaker.record_failure()
        
        assert breaker.state == "OPEN"
        assert breaker.failure_count == 3
        assert asyncio.run(breaker.is_available()) is False
    
    def test_circuit_breaker_half_open_after_timeout(self):
        """Test that circuit transitions to HALF_OPEN after timeout."""
        breaker = CircuitBreaker(failure_threshold=2, timeout=1)
        
        # Trigger circuit open
        breaker.record_failure()
        breaker.record_failure()
        assert breaker.state == "OPEN"
        
        # Wait for timeout
        time.sleep(1.1)
        
        # Should now be HALF_OPEN
        assert asyncio.run(breaker.is_available()) is True
        assert breaker.state == "HALF_OPEN"
    
    def test_circuit_breaker_closes_on_success(self):
        """Test that circuit closes after success in HALF_OPEN state."""
        breaker = CircuitBreaker(failure_threshold=2, timeout=1)
        
        # Trigger circuit open
        breaker.record_failure()
        breaker.record_failure()
        assert breaker.state == "OPEN"
        
        # Wait for timeout
        time.sleep(1.1)
        assert asyncio.run(breaker.is_available()) is True
        assert breaker.state == "HALF_OPEN"
        
        # Record success should close circuit
        breaker.record_success()
        assert breaker.state == "CLOSED"
        assert breaker.failure_count == 0


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
        
        # Mock successful response
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "Primary response"
        mock_client.chat.completions.create.return_value = mock_response
        
        messages = [{"role": "user", "content": "Hello"}]
        content, fallback_used = await engine.chat_completion(
            messages=messages,
            model="gpt-4o",
            temperature=0.7
        )
        
        assert content == "Primary response"
        assert fallback_used is False
        assert engine.breaker.state == "CLOSED"
        
        # Verify primary client was called
        mock_client.chat.completions.create.assert_called_once_with(
            model="gpt-4o",
            messages=messages,
            temperature=0.7,
            max_tokens=None
        )
    
    @pytest.mark.asyncio
    async def test_primary_failure_fallback_success(self, fallback_engine_with_mocks):
        """Test fallback to gpt-4o-mini when primary fails."""
        engine, mock_client = fallback_engine_with_mocks
        
        # Mock primary failure and fallback success
        mock_client.chat.completions.create.side_effect = [
            Exception("Primary failed"),  # Primary call fails
            MagicMock(choices=[MagicMock(message=MagicMock(content="Fallback response"))])  # Fallback succeeds
        ]
        
        messages = [{"role": "user", "content": "Hello"}]
        content, fallback_used = await engine.chat_completion(
            messages=messages,
            model="gpt-4o",
            temperature=0.7
        )
        
        assert content == "Fallback response"
        assert fallback_used is True
        assert engine.breaker.failure_count == 1
        
        # Verify both clients were called
        assert mock_client.chat.completions.create.call_count == 2
    
    @pytest.mark.asyncio
    async def test_circuit_open_uses_fallback(self, fallback_engine_with_mocks):
        """Test that open circuit bypasses primary and uses fallback directly."""
        engine, mock_client = fallback_engine_with_mocks
        
        # Force circuit open
        for i in range(5):
            engine.breaker.record_failure()
        
        assert engine.breaker.state == "OPEN"
        assert await engine.breaker.is_available() is False
        
        # Mock fallback response
        mock_client.chat.completions.create.return_value = MagicMock(
            choices=[MagicMock(message=MagicMock(content="Fallback response"))]
        )
        
        messages = [{"role": "user", "content": "Hello"}]
        content, fallback_used = await engine.chat_completion(
            messages=messages,
            model="gpt-4o",
            temperature=0.7
        )
        
        assert content == "Fallback response"
        assert fallback_used is True
        
        # Verify only one call was made (fallback only)
        assert mock_client.chat.completions.create.call_count == 1
        
        # Verify fallback model was used
        call_args = mock_client.chat.completions.create.call_args
        assert call_args[1]['model'] == "gpt-4o-mini"
    
    @pytest.mark.asyncio
    async def test_both_primary_and_fallback_fail(self, fallback_engine_with_mocks):
        """Test when both primary and fallback fail."""
        engine, mock_client = fallback_engine_with_mocks
        
        # Mock both primary and fallback failures
        mock_client.chat.completions.create.side_effect = [
            Exception("Primary failed"),
            Exception("Fallback failed")
        ]
        
        messages = [{"role": "user", "content": "Hello"}]
        
        with pytest.raises(Exception, match="Fallback failed"):
            await engine.chat_completion(
                messages=messages,
                model="gpt-4o",
                temperature=0.7
            )
        
        assert engine.breaker.failure_count == 1
    
    @pytest.mark.asyncio
    async def test_max_tokens_parameter(self, fallback_engine_with_mocks):
        """Test that max_tokens parameter is passed correctly."""
        engine, mock_client = fallback_engine_with_mocks
        
        # Mock successful response
        mock_client.chat.completions.create.return_value = MagicMock(
            choices=[MagicMock(message=MagicMock(content="Response"))]
        )
        
        messages = [{"role": "user", "content": "Hello"}]
        await engine.chat_completion(
            messages=messages,
            model="gpt-4o",
            temperature=0.7,
            max_tokens=100
        )
        
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
        assert hasattr(fallback_engine, 'breaker')
    
    @pytest.mark.asyncio 
    async def test_circuit_breaker_state_persistence(self):
        """Test that circuit breaker state persists across calls."""
        from app.core.fallback_engine import fallback_engine
        
        # Get initial state
        initial_state = fallback_engine.breaker.state
        initial_failures = fallback_engine.breaker.failure_count
        
        # Record some failures
        for i in range(2):
            fallback_engine.breaker.record_failure()
        
        # Check state changed
        assert fallback_engine.breaker.failure_count == initial_failures + 2
        
        # Reset for other tests
        fallback_engine.breaker.record_success()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

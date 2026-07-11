"""
test_crypto.py
───────────────
Tests for core/crypto.py — the encryption used to store a user's own
AI provider API key at rest.
"""

import pytest

from app.core import crypto


class TestEncryptDecrypt:
    def test_round_trip(self):
        secret = "sk-ant-super-secret-key-12345"
        token = crypto.encrypt_secret(secret)
        assert token != secret
        assert crypto.decrypt_secret(token) == secret

    def test_encrypting_same_value_twice_gives_different_tokens(self):
        # Fernet includes a random nonce/timestamp, so ciphertext isn't
        # deterministic even for the same input — that's expected.
        secret = "sk-test-key"
        token1 = crypto.encrypt_secret(secret)
        token2 = crypto.encrypt_secret(secret)
        assert token1 != token2
        assert crypto.decrypt_secret(token1) == secret
        assert crypto.decrypt_secret(token2) == secret

    def test_decrypt_garbage_raises_value_error(self):
        with pytest.raises(ValueError):
            crypto.decrypt_secret("not-a-real-token")

    def test_decrypt_tampered_token_raises_value_error(self):
        token = crypto.encrypt_secret("sk-test-key")
        tampered = token[:-4] + "abcd"
        with pytest.raises(ValueError):
            crypto.decrypt_secret(tampered)

    def test_missing_encryption_key_raises(self, monkeypatch):
        monkeypatch.setattr(crypto.settings, "ENCRYPTION_KEY", "")
        with pytest.raises(RuntimeError):
            crypto.encrypt_secret("sk-test-key")


class TestMaskSecret:
    def test_masks_all_but_last_four_chars(self):
        assert crypto.mask_secret("sk-ant-abcd1234") == "******1234"

    def test_short_secret_fully_masked(self):
        assert crypto.mask_secret("abc") == "***"

    def test_masked_output_never_contains_the_secret(self):
        secret = "sk-ant-api03-verySecretValueHere"
        masked = crypto.mask_secret(secret)
        assert secret not in masked
        assert masked.endswith(secret[-4:])

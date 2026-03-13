"""
config.py
─────────
Central configuration loaded from environment variables.
All settings are validated by Pydantic at startup.
If a required variable is missing, the app will refuse to start with a clear error.

Usage:
    from app.config import settings
    print(settings.DATABASE_URL)
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ── Application ───────────────────────────────────────────
    APP_ENV: str = Field(default="development")
    DEBUG: bool = Field(default=False)
    LOG_LEVEL: str = Field(default="INFO")

    # ── Database ──────────────────────────────────────────────
    DATABASE_URL: str = Field(...)
    DB_POOL_SIZE: int = Field(default=20)
    DB_MAX_OVERFLOW: int = Field(default=10)

    # ── Redis ─────────────────────────────────────────────────
    REDIS_URL: str = Field(default="redis://localhost:6379/0")
    CELERY_BROKER_URL: str = Field(default="redis://localhost:6379/1")
    CELERY_RESULT_BACKEND: str = Field(default="redis://localhost:6379/2")

    # ── Auth ──────────────────────────────────────────────────
    JWT_PRIVATE_KEY: str = Field(...)
    JWT_PUBLIC_KEY: str = Field(...)
    JWT_ALGORITHM: str = Field(default="RS256")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=15)
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=30)

    # ── AI Providers ──────────────────────────────────────────
    OPENAI_API_KEY: str = Field(default="")
    GEMINI_API_KEY: str = Field(default="")
    PRIMARY_AI_PROVIDER: str = Field(default="openai")
    DEFAULT_MODEL: str = Field(default="gpt-4o")
    FALLBACK_MODEL: str = Field(default="mistral-7b-instruct")
    BENTOML_BASE_URL: str = Field(default="http://map-bentoml:3001/v1")

    # ── Agent Config ──────────────────────────────────────────
    PLANNER_TEMPERATURE: float = Field(default=0.7)
    EXECUTOR_TEMPERATURE: float = Field(default=0.2)
    ANALYZER_TEMPERATURE: float = Field(default=0.1)
    EXECUTOR_MAX_ITERATIONS: int = Field(default=10)
    ANALYZER_CONFIDENCE_THRESHOLD: float = Field(default=0.70)
    MAX_TASK_RETRY_COUNT: int = Field(default=3)
    TASK_TIMEOUT_SECONDS: int = Field(default=3600)

    # ── Rate Limiting ─────────────────────────────────────────
    RATE_LIMIT_FREE_RPM: int = Field(default=100)
    RATE_LIMIT_PRO_RPM: int = Field(default=500)
    RATE_LIMIT_ENTERPRISE_RPM: int = Field(default=2000)

    # ── Security ──────────────────────────────────────────────
    ENCRYPTION_KEY: str = Field(default="")
    CORS_ALLOWED_ORIGINS: str = Field(default="http://localhost:3000")

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        return [o.strip() for o in self.CORS_ALLOWED_ORIGINS.split(",")]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    @property
    def is_development(self) -> bool:
        return self.APP_ENV == "development"


# Single shared instance — import this everywhere
settings = Settings()

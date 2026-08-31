"""FastAPI application factory for MAP."""

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.core.db_logger import setup_database_logging
from app.core.redis_client import close_redis, get_redis, init_redis


# Configure logging at application startup.
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)

setup_database_logging()

# Suppress noisy third-party logs.
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.engine").setLevel(logging.CRITICAL)
logging.getLogger("sqlalchemy.pool").setLevel(logging.CRITICAL)
logging.getLogger("aiosqlite").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)
logger.info("MAP application starting (environment=%s)", settings.APP_ENV)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and clean up shared application resources."""
    await init_redis()
    yield
    await close_redis()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="MAP — Multi-Agent AI Automation Platform",
        description="Automates complex workflows using a multi-agent AI pipeline.",
        version="1.0.0",
        docs_url="/docs" if settings.is_development else None,
        redoc_url="/redoc" if settings.is_development else None,
        lifespan=lifespan,
        redirect_slashes=False,
    )

    # Development uses a wildcard; production uses the configured allowlist.
    if settings.is_production:
        cors_origins = settings.cors_origins_list
        import re

        escaped_origins = []
        for origin in cors_origins:
            origin = origin.rstrip("/")
            if not origin.startswith("http"):
                origin = "https://" + origin
            escaped_origins.append(re.escape(origin))
            if "vercel.app" in origin:
                escaped_origins.append(r"https://.*\.vercel\.app")
        cors_regex = "^(" + "|".join(escaped_origins) + ")$"
    else:
        cors_origins = ["*"]
        cors_regex = None

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_origin_regex=cors_regex,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

    @app.exception_handler(404)
    async def not_found_handler(request: Request, exc):
        """Return JSON for unknown routes while preserving custom details."""
        detail = getattr(exc, "detail", None) or "Not found"
        return JSONResponse(status_code=404, content={"detail": detail})

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        """Return a stable JSON response for unhandled application errors.

        The full exception is always logged server-side. The raw message is
        only echoed back to the client outside production, since it can leak
        internal details (DB URLs, file paths, third-party error bodies) to
        anyone who manages to trigger a 500.
        """
        logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
        content = {"detail": "Internal server error"}
        if not settings.is_production:
            content["error"] = str(exc)
        return JSONResponse(status_code=500, content=content)

    # Routers.
    from app.api.v1.admin import router as admin_router
    from app.api.v1.api_keys import router as api_keys_router
    from app.api.v1.auth import router as auth_router
    from app.api.v1.logs import router as logs_router
    from app.api.v1.provider_keys import router as provider_keys_router
    from app.routes.tasks import router as tasks_router

    app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
    app.include_router(tasks_router, prefix="/api/v1")
    app.include_router(logs_router, prefix="/api/v1/logs", tags=["logs"])
    app.include_router(admin_router, prefix="/api/v1/admin", tags=["admin"])
    app.include_router(api_keys_router, prefix="/api/v1")
    app.include_router(provider_keys_router, prefix="/api/v1")

    @app.get("/health", tags=["system"])
    async def health():
        """Report app liveness plus real DB/Redis connectivity.

        Still returns 200 with status="ok" for a plain liveness probe (so
        existing consumers/uptime pings keep working unchanged), but now
        also reports which dependency, if any, is actually down instead of
        only confirming the process itself is running.
        """
        checks = {}

        try:
            from sqlalchemy import text

            from app.db.base import engine

            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            checks["database"] = "ok"
        except Exception as exc:  # noqa: BLE001 - health check must not raise
            checks["database"] = f"error: {exc}" if not settings.is_production else "error"

        try:
            redis = await get_redis()
            await redis.ping()
            checks["redis"] = "ok"
        except Exception as exc:  # noqa: BLE001 - health check must not raise
            checks["redis"] = f"error: {exc}" if not settings.is_production else "error"

        return {"status": "ok", "env": settings.APP_ENV, "checks": checks}

    return app


app = create_app()

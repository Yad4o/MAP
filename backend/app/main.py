"""
main.py
───────
FastAPI application factory.

Phase 0: Returns a basic health check only.
Each phase adds more routers here as they are built.

Usage:
    uvicorn app.main:app --reload
"""

import logging
import sys

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from app.config import settings
from app.core.redis_client import init_redis, close_redis
from app.core.db_logger import setup_database_logging

# Configure logging at application startup
print("=== CONFIGURING LOGGING ===")
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)

# Setup database logging for frontend display
setup_database_logging()
# Suppress noisy third-party logs
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.engine").setLevel(logging.CRITICAL)
logging.getLogger("sqlalchemy.pool").setLevel(logging.CRITICAL)
logging.getLogger("aiosqlite").setLevel(logging.WARNING)

# Test logging to verify configuration
logger = logging.getLogger(__name__)
logger.info("=== MAP Application Starting ===")
logger.debug(f"Log level set to: {settings.LOG_LEVEL}")
logger.info(f"Environment: {settings.APP_ENV}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_redis()
    yield
    await close_redis()


# ── App Factory ───────────────────────────────────────────────

def create_app() -> FastAPI:
    app = FastAPI(
        title="MAP — Multi-Agent AI Automation Platform",
        description="Automates complex workflows using a multi-agent AI pipeline.",
        version="1.0.0",
        docs_url="/docs" if settings.is_development else None,
        redoc_url="/redoc" if settings.is_development else None,
        lifespan=lifespan,
        redirect_slashes=False,
    )

    # ── CORS ──────────────────────────────────────────────────
    # Development: wildcard for convenience.
    # Production: explicit allowlist from CORS_ALLOWED_ORIGINS env var.
    # allow_origin_regex is used as a belt-and-suspenders fallback so that
    # preflight OPTIONS requests always get an Allow-Origin header even
    # when the exact origin match misses due to trailing slashes etc.
    if settings.is_production:
        cors_origins = settings.cors_origins_list
        import re
        escaped_origins = []
        for o in cors_origins:
            o = o.rstrip('/')
            if not o.startswith('http'):
                o = 'https://' + o
            escaped_origins.append(re.escape(o))
            # If the origin is a vercel.app domain, also allow all Vercel preview subdomains
            if "vercel.app" in o:
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

    # ── 404 handler — ensures CORS headers are present on unknown routes ──
    @app.exception_handler(404)
    async def not_found_handler(request: Request, exc):
        return JSONResponse(status_code=404, content={"detail": "Not found"})

    # ── 500 handler — ensures CORS headers are present on crashes ──
    import traceback
    from fastapi.exceptions import RequestValidationError
    from starlette.exceptions import HTTPException as StarletteHTTPException

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error("Unhandled exception on %s %s: %s", request.method, request.url.path, traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "error": str(exc)},
        )

    # ── Routers ───────────────────────────────────────────────

    # Phase 1 — Auth
    from app.api.v1.auth import router as auth_router
    app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])

    # Phase 2 — Tasks
    from app.routes.tasks import router as tasks_router
    app.include_router(tasks_router, prefix="/api/v1")

    # Phase 3 — Logs (system event stream)
    from app.api.v1.logs import router as logs_router
    app.include_router(logs_router, prefix="/api/v1/logs", tags=["logs"])

    # Phase 3 — Admin
    from app.api.v1.admin import router as admin_router
    app.include_router(admin_router, prefix="/api/v1/admin", tags=["admin"])

    # ── Health Check ──────────────────────────────────────────
    @app.get("/health", tags=["system"])
    async def health():
        """Basic health check. Returns 200 if the app is running."""
        return {"status": "ok", "env": settings.APP_ENV}

    # Test Logging
    @app.get("/test-logging", tags=["system"])
    async def test_logging():
        """Test endpoint to verify logging is working."""
        logger = logging.getLogger(__name__)
        logger.info("=== Test log message ===")
        logger.debug("Debug level test")
        logger.warning("Warning level test")
        logger.error("Error level test")
        return {"message": "Check your terminal for log output"}

    return app


app = create_app()

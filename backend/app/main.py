"""
main.py
───────
FastAPI application factory.

Phase 0: Returns a basic health check only.
Each phase adds more routers here as they are built.

Usage:
    uvicorn app.main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.core.redis_client import init_redis, close_redis

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
    )

    # ── CORS ──────────────────────────────────────────────────
    # Flexible CORS for development
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

    # ── Routers ───────────────────────────────────────────────
    # Uncomment each router as it is built in the corresponding phase.

    # Phase 1 — Auth
    from app.api.v1.auth import router as auth_router
    app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])

    # Phase 2 - Tasks
    # Note: Router has prefix="/tasks" and tags=["tasks"] in routes/tasks.py
    # Combined with prefix="/api/v1" here results in /api/v1/tasks endpoint
    from app.routes.tasks import router as tasks_router
    app.include_router(tasks_router, prefix="/api/v1")

    # Phase 4 — Agents
    # from app.api.v1.agents import router as agents_router
    # app.include_router(agents_router, prefix="/api/v1/agents", tags=["agents"])

    # Phase 1+ — Admin, Configs, Logs
    # from app.api.v1.admin import router as admin_router
    # from app.api.v1.configs import router as configs_router
    # from app.api.v1.logs import router as logs_router
    # app.include_router(admin_router, prefix="/api/v1/admin", tags=["admin"])
    # app.include_router(configs_router, prefix="/api/v1/configs", tags=["configs"])
    # app.include_router(logs_router, prefix="/api/v1/logs", tags=["logs"])

    # ── Health Check ──────────────────────────────────────────
    @app.get("/health", tags=["system"])
    async def health():
        """Basic health check. Returns 200 if the app is running."""
        return {"status": "ok", "env": settings.APP_ENV}

    return app


app = create_app()

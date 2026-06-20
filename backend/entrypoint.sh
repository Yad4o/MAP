#!/bin/sh
# ─────────────────────────────────────────────────────────────
#  MAP — Docker entrypoint
#  Runs Alembic migrations then starts the app.
#  This removes the need for shell access on Render.
# ─────────────────────────────────────────────────────────────

set -e   # exit immediately on any error

# alembic env.py does `from app.config import settings`
# — PYTHONPATH must include the working dir so Python can find the app package.
export PYTHONPATH=/app

echo "=== Running database migrations ==="
alembic upgrade head
echo "=== Migrations complete ==="

echo "=== Starting uvicorn on port ${PORT:-8000} ==="
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"

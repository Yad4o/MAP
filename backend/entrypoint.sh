#!/bin/sh
# ─────────────────────────────────────────────────────────────
#  MAP — Docker entrypoint
#  1. Run Alembic migrations
#  2. Start uvicorn + celery via supervisord (single container)
# ─────────────────────────────────────────────────────────────

set -e

export PYTHONPATH=/app
export PORT="${PORT:-8000}"

echo "=== Running database migrations ==="
alembic upgrade head
echo "=== Migrations complete ==="

echo "=== Starting uvicorn + celery worker via supervisord ==="
exec supervisord -c /app/supervisord.conf

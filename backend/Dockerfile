# ─────────────────────────────────────────────────────────────
#  MAP — Backend Dockerfile
#  Multi-stage build: builder installs deps, final is slim.
# ─────────────────────────────────────────────────────────────

FROM python:3.12-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && rm -rf /var/lib/apt/lists/*

# Install Python dependencies into a virtual env
COPY requirements.txt .
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --upgrade pip && pip install -r requirements.txt

# ── Final stage ───────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Copy venv from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install runtime system deps + supervisord (manages uvicorn + celery in one container)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 supervisor && rm -rf /var/lib/apt/lists/*

# Copy application code
COPY . .

# Copy entrypoint + supervisord config, make entrypoint executable
COPY entrypoint.sh /entrypoint.sh
COPY supervisord.conf /app/supervisord.conf
RUN chmod +x /entrypoint.sh

# Run as non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# entrypoint.sh runs: alembic upgrade head → supervisord (uvicorn + celery)
CMD ["/entrypoint.sh"]

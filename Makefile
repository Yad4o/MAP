# ─────────────────────────────────────────────────────────────
#  MAP — Makefile
#  Run `make help` to see all available commands.
# ─────────────────────────────────────────────────────────────

.PHONY: help up down restart logs shell-backend shell-frontend \
        migrate migrate-create test test-backend test-e2e \
        lint format install-backend install-frontend seed

# ── Default ───────────────────────────────────────────────────
help:
	@echo ""
	@echo "  MAP — Available commands"
	@echo ""
	@echo "  Infrastructure"
	@echo "    make up              Start all active Docker services"
	@echo "    make down            Stop and remove containers"
	@echo "    make restart         Restart all services"
	@echo "    make logs            Follow logs for all services"
	@echo "    make logs-backend    Follow backend logs only"
	@echo "    make logs-worker     Follow worker logs only"
	@echo ""
	@echo "  Database"
	@echo "    make migrate         Run all pending Alembic migrations"
	@echo "    make migrate-create  Create a new migration (NAME=your_name)"
	@echo "    make seed            Seed development data"
	@echo ""
	@echo "  Development"
	@echo "    make install         Install all dependencies"
	@echo "    make shell-backend   Open a shell in the backend container"
	@echo "    make shell-db        Open psql in the postgres container"
	@echo "    make shell-redis     Open redis-cli in the redis container"
	@echo ""
	@echo "  Testing"
	@echo "    make test            Run all tests"
	@echo "    make test-backend    Run pytest for backend"
	@echo "    make test-e2e        Run Playwright E2E tests"
	@echo ""
	@echo "  Code Quality"
	@echo "    make lint            Run ruff + eslint"
	@echo "    make format          Run ruff format + prettier"
	@echo ""

# ── Infrastructure ────────────────────────────────────────────
up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

logs-worker:
	docker compose logs -f worker

# ── Database ──────────────────────────────────────────────────
migrate:
	docker compose exec backend alembic upgrade head

migrate-create:
	@if [ -z "$(NAME)" ]; then echo "Usage: make migrate-create NAME=your_migration_name"; exit 1; fi
	docker compose exec backend alembic revision --autogenerate -m "$(NAME)"

seed:
	docker compose exec backend python scripts/seed_data.py

# ── Development shells ────────────────────────────────────────
shell-backend:
	docker compose exec backend bash

shell-db:
	docker compose exec postgres psql -U $${DB_USER:-map_user} -d $${DB_NAME:-map_db}

shell-redis:
	docker compose exec redis redis-cli

# ── Install dependencies ──────────────────────────────────────
install: install-backend install-frontend

install-backend:
	cd backend && pip install -r requirements.txt

install-frontend:
	cd frontend && npm install

# ── Testing ───────────────────────────────────────────────────
test: test-backend test-e2e

test-backend:
	docker compose exec backend pytest tests/ -v --tb=short

test-e2e:
	cd frontend && npx playwright test

# ── Code Quality ──────────────────────────────────────────────
lint:
	cd backend && ruff check .
	cd frontend && npm run lint

format:
	cd backend && ruff format .
	cd frontend && npm run format

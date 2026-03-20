# MAP — Multi-Agent AI Automation Platform

> A production-grade distributed system that automates complex, multi-step intelligent workflows by decomposing them into discrete subtasks executed by specialized AI agents.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Modules](#modules)
- [Agent Pipeline](#agent-pipeline)
- [Database Design](#database-design)
- [Redis Architecture](#redis-architecture)
- [API Reference](#api-reference)
- [Docker Setup](#docker-setup)
- [BentoML Fallback](#bentoml-fallback)
- [Frontend](#frontend)
- [Security](#security)
- [Logging & Monitoring](#logging--monitoring)
- [Folder Structure](#folder-structure)
- [Development Plan](#development-plan)
- [Team](#team)
- [Environment Variables](#environment-variables)
- [Advanced Features](#advanced-features)

---

## Overview

MAP accepts high-level task requests — natural language descriptions of complex workflows — and routes them through a structured multi-agent pipeline. Each agent has a defined role, tool set, and communication protocol. Results are persisted, observable, and retrievable.

### Problem It Solves

| Problem | MAP's Solution |
|---|---|
| Single LLM call handling all cognitive tasks | Specialized agents with separated responsibilities |
| No persistent context across steps | Memory Agent with FAISS/Chroma vector store |
| Hard dependency on one AI API provider | BentoML local fallback with circuit breaker |
| No task observability or traceability | Per-agent logging, step records, and trace visualization |
| Resource contention under concurrent load | Redis-backed Celery queue with worker pool |
| No access control | JWT auth with role-based access and API key scoping |

### Real-World Use Cases

- **Automated Research Pipelines** — decompose a topic into search, summarize, compare, and conclude steps
- **Code Review & Refactoring** — analyze repositories for anti-patterns, security issues, and improvements
- **Document Processing** — extract, cross-reference, and flag compliance issues in legal/regulatory documents
- **Data Pipeline Monitoring** — parse logs, detect anomalies, correlate errors, and generate root cause reports
- **Customer Support Automation** — classify intent, retrieve from knowledge base, draft and escalate responses
- **Multi-Modal Content Generation** — research audiences, generate copy variants, analyze compliance

---

## Architecture

```
  ┌──────────────────────────────────────────────────┐
  │                  CLIENT LAYER                    │
  │   React Dashboard (port 3000)  │  API Consumers  │
  └─────────────────────┬────────────────────────────┘
                        │ HTTPS
  ┌─────────────────────▼────────────────────────────┐
  │              NGINX REVERSE PROXY                 │
  │     TLS Termination │ Rate Limiting │ CORS        │
  └─────────────────────┬────────────────────────────┘
                        │
  ┌─────────────────────▼────────────────────────────┐
  │           FASTAPI GATEWAY  :8000                 │
  │    JWT Auth │ Validation │ Route Dispatch         │
  └──────┬────────────┬────────────┬─────────────────┘
         │            │            │
  ┌──────▼───┐  ┌─────▼────┐  ┌───▼─────┐
  │ Task Mgr │  │  Agent   │  │  Admin  │
  └──────┬───┘  │ Control  │  └─────────┘
         │      └─────┬────┘
  ┌──────▼────────────▼──────┐   ┌────────────────────┐
  │      REDIS  :6379        │   │   POSTGRESQL :5432  │
  │  Queue │ Cache │ Locks   │◄──►  Tasks │ Users │ Logs│
  └──────┬───────────────────┘   └────────────────────┘
         │
  ┌──────▼────────────────────────────────────────────┐
  │             CELERY WORKER POOL                    │
  │    Worker-1  │  Worker-2  │  Worker-3             │
  └──────┬────────────────────────────────────────────┘
         │
  ┌──────▼────────────────────────────────────────────┐
  │           AGENT CONTROLLER                        │
  │   Planner → Executor → Analyzer → Memory          │
  └──────┬────────────────────────────────────────────┘
         │
  ┌──────▼─────────────┐   ┌──────────────────────────┐
  │  PRIMARY INFERENCE  │   │   FALLBACK: BentoML :3001│
  │  OpenAI / Gemini   │   │   Mistral-7B (local)     │
  └─────────────────────┘   └──────────────────────────┘
```

### Request Lifecycle

1. Client submits task via `POST /api/v1/tasks` with JWT
2. Gateway validates token, checks rate limit, validates body
3. Task Manager writes record to PostgreSQL (`status=PENDING`), pushes `task_id` to Redis queue
4. API returns `202 Accepted` with `task_id` immediately
5. Celery worker picks up task, acquires Redis distributed lock
6. Agent Controller orchestrates: `Planner → Executor → Analyzer → Memory`
7. Each agent calls LLM via Fallback Engine (primary or BentoML)
8. Results written to PostgreSQL; status updated to `COMPLETED`
9. Redis pub/sub notifies frontend; client receives result via poll or WebSocket

---

## Technology Stack

| Technology | Version | Role |
|---|---|---|
| **FastAPI** | 0.115+ | Async Python API gateway and HTTP layer |
| **PostgreSQL** | 16+ | Primary relational database |
| **Redis** | 7.2+ | Queue broker, cache, distributed locks |
| **Docker / Compose** | 25+ / 2.24+ | Containerization and service orchestration |
| **BentoML** | 1.3+ | Local LLM serving for fallback inference |
| **OpenAI API** | 1.x | Primary AI inference (GPT-4o) |
| **Google Gemini** | 0.8+ | Secondary AI provider (Gemini 1.5 Pro) |
| **LangChain** | 0.3+ | Tool integration and chain management |
| **LangGraph** | 0.2+ | Stateful agent graph with checkpointing |
| **React** | 18+ | Frontend single-page application |
| **SQLAlchemy** | 2.0+ | Async ORM with migration support |
| **Alembic** | 1.13+ | Database schema versioning |
| **Celery** | 5.4+ | Distributed async task queue |
| **FAISS** | 1.8+ | Vector store for agent memory retrieval |
| **PyJWT** | 2.8+ | RS256 JWT authentication |
| **Pydantic** | 2.x | Request/response validation and typing |
| **Nginx** | 1.26+ | Reverse proxy, TLS, static file serving |
| **Structlog** | 24+ | Structured JSON logging |
| **Prometheus + Grafana** | Latest | Metrics collection and dashboards |

---

## Modules

### API Gateway
Single entry point for all requests. Handles JWT validation, Pydantic schema enforcement, rate limiting via Redis sliding window, CORS policy, error normalization, and request logging.

### Task Manager
Manages the full task lifecycle: creation, status tracking (`PENDING → PROCESSING → COMPLETED / FAILED`), cancellation, retry, and priority-based queue routing.

### Agent Controller
Orchestrates the multi-agent pipeline. Initializes agents with task-specific configuration, manages sequential and parallel dispatch, enforces per-step timeouts, and aggregates results into a `TaskResult`.

### Planner Agent
Decomposes a high-level task into a structured `PlanDocument`: a JSON array of `PlanStep` objects with tool assignments, dependency graph, and expected output schemas. Uses high-temperature LLM calls.

### Executor Agent
Carries out individual plan steps via a **ReAct loop** (Reason → Act → Observe). Available tools: `WebSearchTool`, `CodeInterpreterTool`, `FileReaderTool`, `APICallTool`, `MemoryRetrievalTool`.

### Analyzer Agent
Quality gate for Executor outputs. Validates JSON schema conformance, checks completeness and cross-step consistency, scores confidence (0.0–1.0), and triggers re-execution for steps below the confidence threshold (default: 0.7).

### Memory Agent
- **Short-term**: Redis-backed context for the active task (TTL: 1 hour)
- **Long-term**: FAISS/Chroma vector store per user. Embeds task summaries and retrieves relevant context before each Executor step

### Fallback Engine
Circuit breaker wrapping all LLM API calls. States: `CLOSED` (normal) → `OPEN` (using BentoML) → `HALF_OPEN` (testing recovery). Triggers on HTTP 429, 503, timeout, or malformed response.

### Queue Worker
Celery worker pool consuming from three queues: `default`, `high_priority`, `long_running`. Late acknowledgment mode prevents task loss on worker crash. Heartbeat monitoring via Flower.

### Auth System
RS256 JWT with 15-minute access tokens and 30-day refresh tokens. Token revocation via Redis SET. bcrypt password hashing (cost factor 12). Role-based access: `USER`, `ADMIN`, `SYSTEM`.

---

## Agent Pipeline

```
  Task Submitted
       │
       ▼
  ┌─────────────────────────────────────────────────────┐
  │ PLANNER AGENT                                       │
  │ Input: task description                             │
  │ Output: PlanDocument (steps, tools, dependencies)   │
  └───────────────────────┬─────────────────────────────┘
                          │
       ┌──────────────────┼──────────────────┐
       │                  │                  │
       ▼                  ▼                  ▼
  ┌─────────┐       ┌─────────┐       ┌─────────┐
  │ Step 1  │       │ Step 2  │       │ Step N  │
  │Executor │  ...  │Executor │  ...  │Executor │   (parallel where no deps)
  └────┬────┘       └────┬────┘       └────┬────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
                         ▼
  ┌─────────────────────────────────────────────────────┐
  │ ANALYZER AGENT                                      │
  │ Validates all step results, scores confidence       │
  │ Requests re-execution if confidence < 0.7           │
  └───────────────────────┬─────────────────────────────┘
                          │
                          ▼
  ┌─────────────────────────────────────────────────────┐
  │ MEMORY AGENT                                        │
  │ Embeds task summary → FAISS/Chroma                  │
  │ Persists results → PostgreSQL                       │
  └─────────────────────────────────────────────────────┘
```

### Agent Message Format

```json
{
  "message_id": "uuid",
  "task_id": "uuid",
  "sender": "planner | executor | analyzer | memory",
  "recipient": "controller | agent_name",
  "message_type": "plan | step_result | validation | memory_context | error",
  "payload": {},
  "timestamp": "2025-01-15T14:30:22Z",
  "metadata": {
    "model_used": "gpt-4o",
    "tokens_in": 1847,
    "tokens_out": 312,
    "latency_ms": 2341
  }
}
```

---

## Database Design

All tables use UUID primary keys, `TIMESTAMPTZ` timestamps, and soft deletes. Core tables:

| Table | Purpose |
|---|---|
| `users` | Accounts with role, tier, bcrypt password hash |
| `sessions` | Refresh token hashes, JTI tracking, IP/UA logging |
| `tasks` | Full task lifecycle: status, config, result, error, retries |
| `task_steps` | Per-agent step records with token counts and confidence scores |
| `agent_results` | Structured outputs from each agent, with optional vector IDs |
| `logs` | High-volume structured log entries (BIGSERIAL PK) |
| `api_keys` | Hashed API keys with scopes and expiry |
| `configs` | Dynamic configuration store with optional AES-256 encryption |

### Key Indexes

```sql
CREATE UNIQUE INDEX idx_users_email       ON users(email);
CREATE INDEX idx_tasks_user_status        ON tasks(user_id, status);
CREATE INDEX idx_tasks_created_at         ON tasks(created_at DESC);
CREATE INDEX idx_task_steps_task_id       ON task_steps(task_id);
CREATE INDEX idx_logs_created_at          ON logs(created_at DESC);
CREATE INDEX idx_logs_task_id             ON logs(task_id) WHERE task_id IS NOT NULL;
```

---

## Redis Architecture

| Key Pattern | TTL | Purpose |
|---|---|---|
| `session:{user_id}` | 30 days | Cached session payload |
| `task:{task_id}:status` | 24 hours | Fast status polling |
| `task:{task_id}:lock` | 1 hour | Distributed lock against duplicate processing |
| `task:{task_id}:context` | 1 hour | Active task short-term memory |
| `rate:{user_id}:{window}` | 1 minute | Sliding window rate limit counter |
| `circuit:{provider}` | 10 minutes | Circuit breaker state |
| `revoked:{jti}` | 15 minutes | Revoked JWT tracking |

**Queue routing:**
- `default` — standard tasks, 3 workers
- `high_priority` — pro/enterprise tier, 2 workers
- `long_running` — document analysis, large file tasks, 4-hour max, 2 workers

---

## API Reference

### Auth
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Create new user account |
| `POST` | `/api/v1/auth/login` | Authenticate, receive JWT pair |
| `POST` | `/api/v1/auth/refresh` | Rotate refresh token |
| `POST` | `/api/v1/auth/logout` | Revoke session |
| `GET` | `/api/v1/auth/me` | Current user profile |

### Tasks
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/v1/tasks` | Submit task → `202 Accepted` + `task_id` |
| `GET` | `/api/v1/tasks` | Paginated task list with filters |
| `GET` | `/api/v1/tasks/{id}` | Full task detail and result |
| `GET` | `/api/v1/tasks/{id}/status` | Lightweight status poll |
| `GET` | `/api/v1/tasks/{id}/steps` | All agent steps for a task |
| `DELETE` | `/api/v1/tasks/{id}` | Cancel a pending task |
| `POST` | `/api/v1/tasks/{id}/retry` | Manually retry a failed task |
| `WS` | `/api/v1/tasks/{id}/ws` | WebSocket real-time stream |

### Agents
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/v1/agents` | List available agents |
| `POST` | `/api/v1/agents/run` | Direct single-agent invocation (admin) |
| `GET` | `/api/v1/agents/memory/search` | Semantic search user memory |
| `DELETE` | `/api/v1/agents/memory` | Clear user's long-term memory |

### Admin
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/v1/admin/users` | All users with filters |
| `GET` | `/api/v1/admin/metrics` | System-wide performance metrics |
| `GET` | `/api/v1/admin/workers` | Celery worker pool status |
| `GET` | `/api/v1/admin/circuit-breakers` | AI provider circuit breaker state |
| `POST` | `/api/v1/admin/circuit-breakers/reset` | Force-reset a circuit breaker |

### Standard Error Response

```json
{
  "error_code": "TASK_NOT_FOUND",
  "message": "Task with id {task_id} not found for the current user.",
  "request_id": "req_01HX9KBZYX3TNKP7Q2V4MWRCE",
  "timestamp": "2025-01-15T14:30:22Z",
  "details": {}
}
```

---

## Docker Setup

### Containers

| Container | Image | Port | Role |
|---|---|---|---|
| `map-backend` | python:3.12-slim | 8000 | FastAPI + uvicorn |
| `map-worker` | python:3.12-slim | — | Celery worker pool (3 replicas) |
| `map-frontend` | node:20-alpine | 3000 | React / Vite dev server |
| `map-postgres` | postgres:16-alpine | 5432 | PostgreSQL database |
| `map-redis` | redis:7.2-alpine | 6379 | Redis broker/cache |
| `map-bentoml` | python:3.12-slim | 3001 | BentoML local LLM service |
| `map-nginx` | nginx:1.26-alpine | 80/443 | Reverse proxy + TLS |
| `map-flower` | python:3.12-slim | 5555 | Celery monitoring UI |

### Quick Start

```bash
# Copy and fill environment variables
cp .env.example .env

# Start all services
docker compose up -d

# Run database migrations
docker compose exec backend alembic upgrade head

# Seed development data (optional)
docker compose exec backend python scripts/seed_data.py

# View logs
docker compose logs -f backend worker
```

### Service Communication

All services communicate over an internal `map-network` Docker bridge network. PostgreSQL, Redis, BentoML, and Flower are **not** exposed to the public internet — only Nginx (80/443) accepts external traffic.

---

## BentoML Fallback

The fallback service runs **Mistral-7B-Instruct-v0.3** (GGUF Q4_K_M, ~4.4 GB) and exposes an OpenAI-compatible API at `http://map-bentoml:3001/v1`. The Fallback Engine switches to it transparently — agent code uses the same OpenAI client library in both paths.

### Circuit Breaker States

```
  CLOSED ──(3 failures in 60s)──► OPEN ──(120s timeout)──► HALF_OPEN
    ▲                                                           │
    └──────────────(first success)──────────────────────────────┘
```

**Failure triggers:** HTTP 429, HTTP 503, connection timeout (>30s), malformed JSON response.

**Fallback model options** (configurable via `FALLBACK_MODEL` env var):
- `mistral-7b-instruct` (default)
- `llama-3-8b-instruct`
- `phi-3-mini-4k-instruct`
- `qwen2-7b-instruct`

---

## Frontend

Built with **React 18 + TypeScript + Vite**. Key libraries: TanStack Query, Zustand, Tailwind CSS, Shadcn/ui, Recharts, React Flow, React Hook Form + Zod.

### Pages

| Route | Page | Description |
|---|---|---|
| `/login` | LoginPage | JWT auth, redirect on success |
| `/tasks` | TaskListPage | Paginated list with status filters |
| `/tasks/new` | TaskCreatePage | Multi-step submission wizard |
| `/tasks/:id` | TaskDetailPage | Live status, step timeline, agent graph |
| `/history` | HistoryPage | Archived tasks with export |
| `/logs` | LogsPage | Real-time log stream viewer |
| `/admin` | AdminPage | User management, metrics, workers |
| `/settings` | SettingsPage | Profile, API keys, memory management |

### Real-Time Updates

- **React Query polling** — every 3 seconds on the task detail view
- **WebSocket** — `useTaskStream` hook with automatic reconnection and exponential backoff; updates are merged directly into the React Query cache

### Agent Trace Visualization

React Flow graph rendered from `task_steps` data. Nodes are color-coded by agent (blue=planner, green=executor, orange=analyzer, purple=memory), animated as steps complete, and clickable for full input/output inspection.

---

## Security

| Layer | Implementation |
|---|---|
| **Passwords** | bcrypt, cost factor 12 |
| **Access tokens** | RS256 JWT, 15-minute expiry |
| **Refresh tokens** | 30-day opaque tokens, bcrypt-hashed in DB |
| **Token revocation** | JTIs stored in Redis SET with matching TTL |
| **Rate limiting** | Redis sliding window per user and per IP |
| **CORS** | Strict origin whitelist, no wildcards in production |
| **Input validation** | Pydantic v2 on all request bodies and query params |
| **API key scoping** | Explicit scope lists enforced at middleware level |
| **Secrets** | Environment variables only — never committed to VCS |
| **Container security** | All containers run as non-root (UID 1000) |
| **Network isolation** | Internal services unexposed via Docker network policy |

---

## Logging & Monitoring

### Log Schema

Every log line is a JSON object:

```json
{
  "timestamp": "2025-01-15T14:30:22.456789Z",
  "level": "INFO",
  "event": "agent_step_completed",
  "logger": "map.agents.executor",
  "task_id": "...",
  "agent": "executor",
  "model_used": "gpt-4o",
  "tokens_in": 1847,
  "tokens_out": 312,
  "latency_ms": 2341,
  "confidence": 0.92
}
```

### Metrics (Prometheus + Grafana)

- Task throughput — tasks/minute by status
- Agent latency — P50/P95/P99 per agent type
- LLM token usage and estimated cost
- Queue depth per queue
- Worker utilization
- Error rates by type
- Circuit breaker state history

### Retry Strategy

| Attempt | Delay |
|---|---|
| 1st retry | 30 seconds |
| 2nd retry | 90 seconds |
| 3rd retry | 270 seconds |
| Max exceeded | Status → `FAILED`, user notified |

---

## Folder Structure

```
map/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app factory
│   │   ├── config.py               # Pydantic Settings
│   │   ├── api/v1/                 # Route handlers (auth, tasks, agents, admin)
│   │   ├── core/                   # security, rate_limiter, fallback_engine
│   │   ├── db/
│   │   │   ├── models/             # SQLAlchemy ORM models
│   │   │   ├── repositories/       # CRUD repository pattern
│   │   │   └── migrations/         # Alembic versions
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   ├── services/               # Business logic layer
│   │   └── worker/                 # Celery app and task definitions
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
│
├── agents/
│   ├── controller/                 # Agent Controller (pipeline orchestrator)
│   ├── planner/                    # PlanDocument generation
│   ├── executor/
│   │   └── tools/                  # web_search, code_interpreter, file_reader, api_call
│   ├── analyzer/                   # Validation and confidence scoring
│   ├── memory/                     # Vector store and embedding logic
│   └── shared/                     # AgentMessage schema, base agent class
│
├── frontend/
│   └── src/
│       ├── api/                    # Axios client + typed API calls
│       ├── components/             # UI, layout, task, agent components
│       ├── hooks/                  # useTaskStream, useAuth, useAdmin
│       ├── pages/                  # All route page components
│       ├── store/                  # Zustand state slices
│       └── types/                  # TypeScript definitions
│
├── bentoml/
│   ├── service.py                  # BentoML service (OpenAI-compatible)
│   ├── model_loader.py             # GGUF quantized model init
│   └── bentofile.yaml
│
├── nginx/
│   └── nginx.conf
│
├── docs/
│   └── README.md                   # ← You are here
│
├── .env.example
├── docker-compose.yml
├── docker-compose.dev.yml
└── Makefile
```

---

## Development Plan

| Week | Focus | Milestones |
|---|---|---|
| **1** | Setup & Foundations | Repo, Docker Compose base, DB schema, Alembic, React scaffold, LangGraph setup |
| **2** | Core Backend | Auth system (JWT, sessions), Task Manager CRUD, Redis integration, Planner Agent |
| **3** | Agents & Queue | Celery workers, Executor Agent (full ReAct loop + 5 tools), Analyzer, Memory + FAISS |
| **4** | Integration | Fallback Engine + BentoML, Agent Controller pipeline, full frontend API integration |
| **5** | Docker & Polish | Multi-stage builds, Nginx, production env hardening, E2E agent reliability testing |
| **6** | Testing & Deploy | Integration tests, load testing (Locust), Playwright E2E, CI/CD pipeline, UAT |

---

## Team

> All 5 members work as Full Stack AI Engineers — everyone contributes across backend, frontend, agents, and infrastructure equally. Responsibilities are divided by task and phase, not by specialization.

| Member | Role |
|---|---|
| **Om** | Full Stack AI Engineer |
| **Prajwal** | Full Stack AI Engineer |
| **Neha** | Full Stack AI Engineer |
| **Sanskruti** | Full Stack AI Engineer |
| **Shravni** | Full Stack AI Engineer |
---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql+asyncpg://map_user:password@postgres:5432/map_db

# Redis
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1

# Auth
JWT_PRIVATE_KEY=<RSA PEM>
JWT_PUBLIC_KEY=<RSA PEM>
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30

# AI Providers
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
PRIMARY_AI_PROVIDER=openai
DEFAULT_MODEL=gpt-4o
BENTOML_BASE_URL=http://map-bentoml:3001/v1

# Agent Config
PLANNER_TEMPERATURE=0.7
EXECUTOR_TEMPERATURE=0.2
ANALYZER_TEMPERATURE=0.1
ANALYZER_CONFIDENCE_THRESHOLD=0.70
EXECUTOR_MAX_ITERATIONS=10
MAX_TASK_RETRY_COUNT=3

# Rate Limiting
RATE_LIMIT_FREE_RPM=100
RATE_LIMIT_PRO_RPM=500
RATE_LIMIT_ENTERPRISE_RPM=2000

# App
APP_ENV=production
LOG_LEVEL=INFO
CORS_ALLOWED_ORIGINS=https://yourdomain.com
ENCRYPTION_KEY=<32-byte AES key>
```

See `.env.example` for the full list with descriptions.

---

## Advanced Features

- **Streaming responses** — SSE endpoint at `GET /api/v1/tasks/{id}/stream` for progressive result rendering
- **Role system** — `USER`, `ADMIN`, `SYSTEM` with per-endpoint enforcement and organization grouping in Phase 2
- **Plugin tool system** — Implement `BaseTool`, drop into `agents/executor/tools/`, auto-registered at startup
- **Document memory** — Upload PDFs, DOCX, CSV to personal knowledge base; auto-retrieved during task execution
- **Voice input** — Web Speech API in frontend; optional Whisper API server-side transcription
- **Agent visualization** — React Flow interactive execution graph with animated steps and clickable detail panels

---

*MAP Technical Specification v2.0 — Confidential, internal use only.*

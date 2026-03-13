# Team Rotation Tracker

Update this file each phase. Check off your task when complete.

---

## Phase 0 — Foundation (All Together)

| Task | Owner | Done |
|---|---|---|
| Create GitHub repo and push | Member A | [ ] |
| Set up Neon PostgreSQL | Member B | [ ] |
| Set up Upstash Redis | Member C | [ ] |
| Run Alembic migrations | Member A | [ ] |
| All three: install deps and run backend | All | [ ] |
| All three: install frontend and run dev server | All | [ ] |
| Create phase/01-auth branch | Member A | [ ] |

---

## Phase 1 — Auth System

| Task | Owner | Layer | Done |
|---|---|---|---|
| Auth API routes + JWT + security.py | Member A | API Routes | [ ] |
| User/Session DB models + repositories | Member B | Database | [ ] |
| Login/Register pages + Zustand store | Member C | Frontend | [ ] |
| Integration: wire A+B+C, test full login flow | All | Integration | [ ] |

---

## Phase 2 — Task System

| Task | Owner | Layer | Done |
|---|---|---|---|
| Task/Step DB models + repositories | Member A | Database | [ ] |
| Task API routes + Task service | Member B | API Routes | [ ] |
| Task list + Task create pages | Member C | Frontend | [ ] |
| Integration: submit task via UI, verify in DB | All | Integration | [ ] |

---

## Phase 3 — Queue & Workers

| Task | Owner | Layer | Done |
|---|---|---|---|
| Celery setup + agent runner stub | Member A | Queue | [ ] |
| Redis helpers + rate limiter + cache | Member B | Cache | [ ] |
| Task detail page + polling hook | Member C | Frontend | [ ] |
| Integration: submit task, see it process end-to-end | All | Integration | [ ] |

---

## Phase 4 — Agent Pipeline

| Task | Owner | Layer | Done |
|---|---|---|---|
| Planner Agent (LLM + structured output) | Member A | Agent | [ ] |
| Executor Agent (ReAct loop + 3 tools) | Member B | Agent | [ ] |
| Analyzer Agent + Memory Agent + FAISS | Member C | Agent | [ ] |
| Integration: submit a real task, see agent results | All | Integration | [ ] |

---

## Phase 5 — Fallback System

| Task | Owner | Layer | Done |
|---|---|---|---|
| Circuit breaker (Redis state machine) | Member A | Core | [ ] |
| Fallback Engine (wraps all LLM calls) | Member B | Core | [ ] |
| Agent Controller (full pipeline wired) | Member C | Orchestration | [ ] |
| Integration: break OpenAI key, verify fallback works | All | Integration | [ ] |

---

## Phase 6 — Frontend Completion

| Task | Owner | Layer | Done |
|---|---|---|---|
| Task detail page + React Flow agent graph | Member A | Frontend | [ ] |
| Admin page + Logs page | Member B | Frontend | [ ] |
| Settings page + API key management | Member C | Frontend | [ ] |
| Integration: full UI walkthrough, find bugs | All | Integration | [ ] |

---

## Phase 7 — Docker & Testing

| Task | Owner | Layer | Done |
|---|---|---|---|
| Docker production setup + docker-compose | Member A | DevOps | [ ] |
| API integration tests (pytest) | Member B | Testing | [ ] |
| Playwright E2E tests | Member C | Testing | [ ] |
| Integration: docker compose up, all tests pass | All | Integration | [ ] |

---

## Phase 8 — Final Polish (All Together)

| Task | Owner | Done |
|---|---|---|
| README polish + badges | All | [ ] |
| Docstrings and type hints | All | [ ] |
| Seed data script | All | [ ] |
| Error boundary + loading states | All | [ ] |
| Final repo review — no secrets | All | [ ] |
| **Project complete** | **All** | **[ ]** |

---

## Layer Experience Matrix

Track which layers each member has worked in. Goal: every member covers every layer.

| Layer | Member A | Member B | Member C |
|---|---|---|---|
| API Routes | Phase 1 | Phase 2 | — |
| Database | Phase 2 | Phase 1 | — |
| Frontend | Phase 6 | Phase 6 | Phase 1,2,3,6 |
| Agents | Phase 4 | Phase 4 | Phase 4 |
| Queue/Workers | Phase 3 | — | — |
| Cache/Redis | — | Phase 3 | — |
| Core/Security | Phase 1 | Phase 5 | — |
| Orchestration | — | — | Phase 5 |
| DevOps/Docker | Phase 7 | — | — |
| Testing (API) | — | Phase 7 | — |
| Testing (E2E) | — | — | Phase 7 |

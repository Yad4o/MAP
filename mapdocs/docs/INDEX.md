# MAP — Project Task Master Index

> Complete phase-by-phase task guide for all 3 members using Windsurf AI.
> Every task includes a Windsurf prompt, detailed explanation, and acceptance criteria.

---

## How To Use This

1. Open Windsurf in your project folder
2. Open the task file for your current phase and member
3. Copy the **Windsurf Prompt** exactly into Windsurf
4. Read the **How It Should Be Done** section to understand what Windsurf will build
5. Check the **Acceptance Criteria** to verify the task is complete before moving on
6. Only move to the next phase when all 3 members have completed their current task

---

## Team Rotation Overview

| Phase | Member A | Member B | Member C |
|---|---|---|---|
| **0** | Setup together | Setup together | Setup together |
| **1** | Auth API routes | Auth DB models | Auth Frontend |
| **2** | Task DB models | Task API routes | Task Frontend |
| **3** | Celery + Queue | Worker tasks | Redis helpers |
| **4** | Planner Agent | Executor Agent | Analyzer + Memory |
| **5** | Circuit Breaker | Fallback Engine | Agent Controller |
| **6** | Task Detail UI | Admin + Logs UI | Settings UI |
| **7** | Backend Docker | API Integration Tests | E2E Tests |
| **8** | Final Polish | Final Polish | Final Polish |

---

## Phase Index

- [Phase 0 — Foundation & Cloud Setup](./phase0/setup.md)
- [Phase 1 — Authentication System](./phase1/)
  - [Member A — Auth API Routes](./phase1/member-a-auth-routes.md)
  - [Member B — Auth Database](./phase1/member-b-auth-db.md)
  - [Member C — Auth Frontend](./phase1/member-c-auth-frontend.md)
- [Phase 2 — Task System](./phase2/)
  - [Member A — Task Database](./phase2/member-a-task-db.md)
  - [Member B — Task API Routes](./phase2/member-b-task-routes.md)
  - [Member C — Task Frontend](./phase2/member-c-task-frontend.md)
- [Phase 3 — Queue & Workers](./phase3/)
  - [Member A — Celery Setup](./phase3/member-a-celery.md)
  - [Member B — Worker Tasks](./phase3/member-b-worker.md)
  - [Member C — Redis Helpers](./phase3/member-c-redis.md)
- [Phase 4 — Agent Pipeline](./phase4/)
  - [Member A — Planner Agent](./phase4/member-a-planner.md)
  - [Member B — Executor Agent](./phase4/member-b-executor.md)
  - [Member C — Analyzer + Memory](./phase4/member-c-analyzer-memory.md)
- [Phase 5 — Fallback System](./phase5/)
  - [Member A — Circuit Breaker](./phase5/member-a-circuit-breaker.md)
  - [Member B — Fallback Engine](./phase5/member-b-fallback-engine.md)
  - [Member C — Agent Controller](./phase5/member-c-agent-controller.md)
- [Phase 6 — Frontend Completion](./phase6/)
  - [Member A — Task Detail Page](./phase6/member-a-task-detail.md)
  - [Member B — Admin and Logs Pages](./phase6/member-b-admin-logs.md)
  - [Member C — Settings Page](./phase6/member-c-settings.md)
- [Phase 7 — Docker + Testing](./phase7/)
  - [Member A — Docker Setup](./phase7/member-a-docker.md)
  - [Member B — API Tests](./phase7/member-b-api-tests.md)
  - [Member C — E2E Tests](./phase7/member-c-e2e-tests.md)
- [Phase 8 — Final Polish](./phase8/final-polish.md)

---

## Rules For The Team

1. **Never skip the acceptance criteria.** If a task is not passing its checks, it is not done.
2. **Read before you prompt.** Read the full task file before running the Windsurf prompt so you understand what is being built.
3. **One branch per phase.** Branch name: `phase/01-auth`, `phase/02-tasks`, etc. All three members push to the same branch.
4. **Review before merging.** All three members read each other's code before the phase branch merges to main.
5. **Ask before changing contracts.** If you need to change a schema field name or a function signature that another member depends on, discuss first.

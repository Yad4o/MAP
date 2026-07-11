# Contributing to MAP

Thanks for taking the time to contribute. This document covers the workflow
and conventions this repo actually uses, so PRs need fewer review rounds.

## Before You Start

- Read the [Code of Conduct](CODE_OF_CONDUCT.md) — participation in this
  project means agreeing to it.
- For anything beyond a small fix, open an issue first to discuss the
  approach before writing code.
- Found a security issue? Don't open a public issue — see
  [SECURITY.md](SECURITY.md) instead.

## Development Setup

See the [Docker Setup](README.md#docker-setup) and
[Environment Variables](README.md#environment-variables) sections of the
README to get backend + frontend running locally.

## Branch Naming

Branches follow `<type>/<short-description>`:

| Type | Use for |
|---|---|
| `feat/` | New functionality |
| `fix/` | Bug fixes |
| `refactor/` | Code changes with no behavior change |
| `chore/` | Tooling, dependencies, cleanup |
| `docs/` | Documentation only |

Example: `fix/sqlite-safe-tasks-migration`

## Commit Messages

Prefix with the same type used in the branch name, followed by a short
imperative summary, e.g.:

```
fix: make tasks nullable-columns migration dialect-agnostic
```

For anything non-trivial, add a body explaining *why*, not just *what* —
especially for bug fixes, note the root cause and how you verified the fix.

## Pull Requests

- Keep PRs scoped to one concern. Prefer several small PRs over one large one
  — it's easier to review and easier to revert if something's wrong.
- **Implementation and tests are committed together**, not as a follow-up.
- Include in the PR description:
  - What the problem was (root cause, not just symptoms)
  - What you changed and why
  - How you verified it (test output, manual steps, before/after)
- All checks must pass and all review feedback must be resolved before
  merging — no exceptions, even for "small" issues.

## Code Review

Reviews on this repo use severity tags so nothing gets lost in a wall of
comments:

| Tag | Meaning |
|---|---|
| 🔴 Critical | Must fix before merge — breaks functionality, security issue, data loss risk |
| 🟠 High | Should fix before merge — real bug, meaningfully wrong behavior |
| 🟡 Medium | Worth fixing — code quality, maintainability, minor bugs |
| 🟢 Low | Optional — style, nitpicks, ideas for later |

## Testing

- Backend: `pytest backend/tests` — new code needs new tests, not just a
  passing existing suite.
- Frontend: `npm test` (Vitest) for units, Playwright for E2E flows that
  touch multiple pages.
- Don't skip or delete a failing test to make CI green — root-cause it. If
  a test is genuinely wrong (asserting stale/incorrect behavior), say so
  explicitly in the PR description and explain why.

## Questions

Open a [discussion](../../discussions) or issue if anything here is unclear.

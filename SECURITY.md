# Security Policy

This document covers how to **report a vulnerability** in MAP. For the
security *architecture* already implemented (auth, rate limiting, secrets
handling, etc.), see the [Security section of the README](README.md#security).

## Supported Versions

MAP is under active development on `main`. Security fixes are applied to
`main` only; there are no maintained release branches yet.

| Branch | Supported |
|---|---|
| `main` | ✅ |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**
Publicly disclosing a vulnerability before it's fixed puts users at risk.

Instead, report it privately using one of these methods:

1. **GitHub Private Vulnerability Reporting (preferred):** go to the
   [Security tab](../../security/advisories/new) of this repository and
   click "Report a vulnerability." This opens a private advisory visible
   only to maintainers.
2. If that's unavailable, contact the maintainer directly via the email on
   the [GitHub profile](https://github.com/Yad4o).

When reporting, please include:

- A description of the vulnerability and its potential impact
- Steps to reproduce (a minimal example is ideal)
- The affected component (backend route, agent tool, frontend page, etc.)
- Any suggested fix, if you have one

### What to Expect

- Acknowledgement of your report as soon as possible after it's received
- An assessment of severity and a plan for a fix
- Credit in the fix's changelog/release notes, if you'd like it (optional —
  let us know your preference when reporting)

## Scope

Vulnerabilities in the backend (FastAPI, agent tools, Celery workers), the
frontend (React app), or the infrastructure config in this repo (Docker,
Alembic migrations) are in scope. Vulnerabilities in third-party dependencies
should generally be reported upstream, but flagging them here so we can pin/
patch is also welcome.

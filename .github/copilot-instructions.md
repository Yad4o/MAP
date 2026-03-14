# GitHub Copilot Instructions — MAP

## Project Overview

MAP (Multi-Agent AI Automation Platform) is a production-grade distributed system that automates complex multi-step workflows by decomposing them into discrete subtasks executed by specialized AI agents.

**Stack:** FastAPI · PostgreSQL · Redis · Celery · React · Docker · LangChain · LangGraph

## Repository Layout

```
MAP/
├── agents/          # Agent modules (planner, executor, analyzer, memory, controller)
├── backend/         # FastAPI application, Alembic migrations, Pydantic schemas
├── frontend/        # React + Vite single-page application
├── mapdocs/docs/    # Phase-by-phase task guides for each team member
├── docs/            # Technical specification
├── docker-compose.yml
└── .env.example
```

## Coding Conventions

- **Python:** async/await throughout; Pydantic v2 for all data shapes; when adding new modules, you may use `from __future__ import annotations` at the top if you need postponed evaluation of type hints, but stay consistent with nearby files
- **Imports:** absolute from the project root (e.g. `from agents.shared.message import AgentMessage`)
- **Config:** read exclusively from `app.config.settings`; never hard-code secrets
- **Agents:** every agent inherits `BaseAgent` (`agents/shared/base_agent.py`) and implements `async def run(self, message: AgentMessage) -> AgentMessage`
- **Error handling:** use `build_error()` helper from `BaseAgent` for all error responses
- **Frontend:** React functional components with hooks; Vite as build tool

## AI Model Selection in VS Code

This project is developed with GitHub Copilot in VS Code. To use a more capable model than Claude Haiku:

1. Open **GitHub Copilot Chat** (`Ctrl+Shift+I` / `Cmd+Shift+I`)
2. Click the **model name** shown at the top of the chat panel (it shows the currently active model)
3. Select your preferred model from the dropdown — for example **Claude Sonnet**, **GPT-4o**, or **o3-mini**

> **Note:** Model availability depends on your GitHub Copilot subscription tier.  
> - **Free** — Claude Haiku (limited requests per month), GPT-4o (limited)  
> - **Pro / Pro+** — Claude Sonnet, Claude Opus, GPT-4o, o3-mini, and more  
> - **Business / Enterprise** — all models, higher rate limits

If you only see Haiku, check your subscription at <https://github.com/settings/copilot> and upgrade to Copilot Pro for access to the full model roster.

## Preferred Model for This Codebase

Use **Claude Sonnet** (or GPT-4o) for complex, multi-file tasks such as implementing new agents or refactoring the pipeline. Haiku is suitable for quick completions and small edits.

The `.vscode/settings.json` in this repository sets `claude-sonnet-4-5` as the default chat model so that all team members start with the same experience.

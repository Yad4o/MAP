# Phase 0 — Foundation & Cloud Setup

> All 3 members do this together in one sitting. Takes about 2 hours.
> Goal: GitHub repo live, Neon database connected, Upstash Redis connected, backend health check returning OK.

---

## Task 0.1 — Create GitHub Repository

**Who does it:** Member A while others watch.

**Steps:**
1. Go to github.com and create a new repository named `map`
2. Set it to Public
3. Do NOT initialize with README (you already have the files)
4. Copy the repo URL

**In VS Code terminal:**
```powershell
cd C:\Users\Administrator\MAP\MAP
git init
git add .
git commit -m "chore: phase 0 scaffold"
git branch -M main
git remote add origin https://github.com/YOURNAME/map.git
git push -u origin main
```

**Other two members then:**
```powershell
git clone https://github.com/YOURNAME/map.git
cd map
```

**Acceptance Criteria:**
- All three can see the repo on GitHub
- All files are visible in the GitHub UI
- `.env` is NOT in the repo (only `.env.example` should be there)

---

## Task 0.2 — Set Up Neon PostgreSQL

**Who does it:** Member B while others watch.

**Steps:**
1. Go to **neon.tech**
2. Sign up with GitHub
3. Click **New Project** → name it `map` → click **Create Project**
4. On the dashboard you will see a **Connection String** — click **Copy**

It looks like this:
```
postgresql://map_user:AbCdEfGh@ep-cool-name-123456.us-east-1.aws.neon.tech/map_db?sslmode=require
```

5. Open your `.env` file and update these lines:

```env
DB_NAME=map_db
DB_USER=map_user
DB_PASSWORD=AbCdEfGh
DB_HOST=ep-cool-name-123456.us-east-1.aws.neon.tech
DB_PORT=5432
DATABASE_URL=postgresql+asyncpg://map_user:AbCdEfGh@ep-cool-name-123456.us-east-1.aws.neon.tech/map_db?ssl=require
```

> Note: Neon uses `?sslmode=require` but SQLAlchemy asyncpg needs `?ssl=require` — make sure to use `ssl=require` not `sslmode=require` in the DATABASE_URL.

**Share the connection string** with the other two members privately (WhatsApp, Discord — never commit it to git).

**Acceptance Criteria:**
- All three members have the Neon URL in their local `.env`
- Neon dashboard shows the project as active

---

## Task 0.3 — Set Up Upstash Redis

**Who does it:** Member C while others watch.

**Steps:**
1. Go to **upstash.com**
2. Sign up with GitHub
3. Click **Create Database** → name it `map` → pick closest region → click **Create**
4. On the database page, find **Redis URL** under the **Details** tab — click **Copy**

It looks like this:
```
rediss://default:AbCdEfGh@xyz-123.upstash.io:6379
```

5. Open your `.env` and update these lines:

```env
REDIS_URL=rediss://default:AbCdEfGh@xyz-123.upstash.io:6379
CELERY_BROKER_URL=rediss://default:AbCdEfGh@xyz-123.upstash.io:6379
CELERY_RESULT_BACKEND=rediss://default:AbCdEfGh@xyz-123.upstash.io:6379
```

**Share the Redis URL** with the other two members privately.

**Acceptance Criteria:**
- All three members have the Upstash URL in their `.env`
- Upstash dashboard shows the database as active

---

## Task 0.4 — Install Python Dependencies and Run Backend

**Who does it:** All three members independently on their own machines.

**Steps:**

1. Create a Python virtual environment:
```powershell
cd backend
python -m venv venv
venv\Scripts\activate
```

2. Install dependencies:
```powershell
pip install -r requirements.txt
```

3. Start the backend:
```powershell
uvicorn app.main:app --reload
```

4. Open your browser and go to:
```
http://localhost:8000/health
```

You should see:
```json
{"status": "ok", "env": "development"}
```

5. Also visit:
```
http://localhost:8000/docs
```
This shows the Swagger UI with all API routes.

**Acceptance Criteria:**
- `/health` returns `{"status": "ok"}`
- `/docs` loads without errors
- No errors in the terminal output

---

## Task 0.5 — Install Frontend Dependencies

**Who does it:** All three members independently.

**Steps:**

1. You need Node.js installed. Check:
```powershell
node --version
```
If not installed, download from **nodejs.org** (LTS version).

2. Install frontend dependencies:
```powershell
cd frontend
npm install
```

3. Create frontend `.env`:
```powershell
copy .env.example .env.local
```

Add this line to `frontend/.env.local`:
```
VITE_API_URL=http://localhost:8000
```

4. Start the frontend:
```powershell
npm run dev
```

5. Open browser at `http://localhost:5173`

**Acceptance Criteria:**
- Frontend loads in browser (even if it just shows placeholder pages)
- No npm errors in terminal

---

## Task 0.6 — Run Database Migrations

**Who does it:** Member A once. Others do not need to run this.

**Steps:**

In the backend folder with venv activated:
```powershell
alembic upgrade head
```

This creates all the tables in your Neon database.

To verify, go to **neon.tech dashboard** → your project → **Tables** tab. You should see:
- users
- sessions
- tasks
- task_steps
- agent_results
- logs
- api_keys
- configs

**Acceptance Criteria:**
- `alembic upgrade head` runs without errors
- All 8 tables visible in Neon dashboard

---

## Task 0.7 — Configure GitHub Copilot in VS Code

**Who does it:** All three members independently.

This repository includes a `.vscode/settings.json` that sets **Claude Sonnet** as the default GitHub Copilot chat model so every team member gets the same experience out of the box.

### Why you might only see Haiku

GitHub Copilot's model picker shows different options depending on your subscription:

| Tier | Available Models |
|---|---|
| **Free** | Claude Haiku (limited), GPT-4o (limited) |
| **Pro / Pro+** | Claude Sonnet, Claude Opus, GPT-4o, o3-mini, and more |
| **Business / Enterprise** | All models, higher rate limits |

If VS Code only shows Haiku, your account is on the Free tier.

### How to upgrade and unlock more models

1. Go to <https://github.com/settings/copilot>
2. Click **Upgrade to Copilot Pro**
3. After upgrading, restart VS Code

### How to switch models manually (any tier)

1. Open GitHub Copilot Chat from the Activity Bar (Copilot icon), or via the Command Palette: `Ctrl+Shift+P` / `Cmd+Shift+P` → “Copilot Chat: Focus on Chat View”
2. In the GitHub Copilot Chat panel, click the **model name** shown at the top
3. Choose the model you want — **Claude Sonnet** is recommended for complex agent work

The `.vscode/settings.json` committed in this repo sets `claude-sonnet-4-5` as the default, so after cloning you should see Sonnet selected automatically (Pro+ required).

**Acceptance Criteria:**
- GitHub Copilot Chat opens in VS Code
- The model picker shows at least one model beyond Haiku (after upgrading to Pro)

---

## Task 0.8 — Create Phase 1 Branch

**Who does it:** Member A.

```powershell
git checkout -b phase/01-auth
git push -u origin phase/01-auth
```

**Other members:**
```powershell
git fetch
git checkout phase/01-auth
```

**Phase 0 is complete. Start Phase 1.**

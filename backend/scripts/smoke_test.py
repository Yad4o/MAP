"""
Quick API smoke test:
- Login as yad4o (admin)
- Check /api/v1/logs → should return entries now
- Check /api/v1/tasks → should return task list
- Check /api/v1/tasks/{id} → should return steps
"""
import urllib.request
import urllib.parse
import json

BASE = "http://127.0.0.1:8000/api/v1"

# 1. Login
print("=== 1. Login ===")
login_data = json.dumps({"email": "omyadao1706@gmail.com", "password": "Omar1706@"}).encode()
req = urllib.request.Request(f"{BASE}/auth/login", data=login_data,
                              headers={"Content-Type": "application/json"}, method="POST")
try:
    with urllib.request.urlopen(req, timeout=5) as resp:
        auth = json.loads(resp.read())
        token = auth.get("access_token")
        print(f"Login OK — token prefix: {token[:20]}...")
except Exception as e:
    print(f"Login FAILED: {e}")
    exit(1)

headers = {"Authorization": f"Bearer {token}"}

def api_get(path):
    req = urllib.request.Request(f"{BASE}{path}", headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read()), resp.status
    except urllib.error.HTTPError as e:
        return {"error": str(e), "body": e.read().decode()}, e.code

# 2. Logs
print("\n=== 2. GET /logs ===")
data, status = api_get("/logs")
if isinstance(data, list):
    print(f"Status {status} — {len(data)} log entries")
    for log in data[:3]:
        print(f"  [{log.get('level')}] {log.get('logger')} — {log.get('event')[:60]}")
else:
    print(f"Status {status} — {data}")

# 3. Tasks list
print("\n=== 3. GET /tasks ===")
data, status = api_get("/tasks")
if isinstance(data, list):
    print(f"Status {status} — {len(data)} tasks")
    first_task_id = data[0]["id"] if data else None
    if data:
        t = data[0]
        print(f"  First task: {t.get('title')[:40]} | status={t.get('status')} | steps_field={'steps' in t}")
else:
    print(f"Status {status} — {data}")

# 4. Task detail (first task)
if first_task_id:
    print(f"\n=== 4. GET /tasks/{first_task_id} ===")
    data, status = api_get(f"/tasks/{first_task_id}")
    if isinstance(data, dict) and "id" in data:
        print(f"Status {status} — steps count: {len(data.get('steps', []))}")
        for s in data.get("steps", [])[:3]:
            print(f"  Step: {s.get('agent_name')} | type={s.get('step_type')} | status={s.get('status')}")
    else:
        print(f"Status {status} — {data}")

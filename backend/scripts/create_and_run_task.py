import urllib.request
import urllib.parse
import json
import time

BASE = "http://127.0.0.1:8000/api/v1"

# 1. Login
print("=== 1. Login ===")
login_data = json.dumps({"email": "omyadao1706@gmail.com", "password": "Omar1706@"}).encode()
req = urllib.request.Request(f"{BASE}/auth/login", data=login_data,
                              headers={"Content-Type": "application/json"}, method="POST")
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        auth = json.loads(resp.read())
        token = auth.get("access_token")
        print(f"Login OK — token prefix: {token[:20]}...")
except Exception as e:
    print(f"Login FAILED: {e}")
    exit(1)

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# 2. Submit a task
print("\n=== 2. Create Task ===")
task_data = json.dumps({
    "title": "Create a python function to reverse a string",
    "description": "Write a python function to reverse a string and return it",
    "priority": 5
}).encode()

req = urllib.request.Request(f"{BASE}/tasks", data=task_data, headers=headers, method="POST")
try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        task = json.loads(resp.read())
        task_id = task.get("id")
        print(f"Task created successfully. ID: {task_id}, Status: {task.get('status')}")
except Exception as e:
    print(f"Task creation failed: {e}")
    exit(1)

# 3. Wait for execution to progress
print("\n=== 3. Waiting 15 seconds for task execution... ===")
time.sleep(15)

# 4. Check Task Detail
print(f"\n=== 4. Fetching Task Detail for {task_id} ===")
req = urllib.request.Request(f"{BASE}/tasks/{task_id}", headers={"Authorization": f"Bearer {token}"})
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        detail = json.loads(resp.read())
        print(f"Task ID: {detail.get('id')}")
        print(f"Status: {detail.get('status')}")
        print(f"Steps count: {len(detail.get('steps', []))}")
        for s in detail.get('steps', []):
            print(f"  Step: {s.get('agent_name')} | type={s.get('step_type')} | status={s.get('status')} | latency={s.get('latency_ms')}ms")
        print(f"Result: {detail.get('result')}")
except Exception as e:
    print(f"Failed to fetch task detail: {e}")

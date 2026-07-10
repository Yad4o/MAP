import sqlite3
conn = sqlite3.connect('map_dev.db')
c = conn.cursor()

# Get the last task
c.execute("SELECT id, title, status, result, error FROM tasks ORDER BY created_at DESC LIMIT 1")
task = c.fetchone()
print("=== LAST TASK ===")
if task:
    task_id, title, status, result, error = task
    print(f"ID: {task_id}")
    print(f"Title: {title}")
    print(f"Status: {status}")
    print(f"Result: {result[:200] if result else 'None'}")
    print(f"Error: {error[:200] if error else 'None'}")
    
    # Get steps for this task
    c.execute("SELECT id, step_index, step_type, agent_name, status, latency_ms FROM task_steps WHERE task_id = ? ORDER BY step_index", (task_id,))
    steps = c.fetchall()
    print(f"\n=== STEPS ({len(steps)}) ===")
    for step in steps:
        print(step)
else:
    print("No tasks found.")

conn.close()

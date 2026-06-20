import sqlite3
conn = sqlite3.connect('map_dev.db')
c = conn.cursor()

print("=== TABLES ===")
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
print(c.fetchall())

print("\n=== TASKS ===")
c.execute("SELECT id, title, status, created_at FROM tasks LIMIT 5")
rows = c.fetchall()
for row in rows:
    print(row)

print("\n=== TASK_STEPS ===")
c.execute("SELECT id, task_id, step_type, status, agent_name FROM task_steps LIMIT 10")
rows = c.fetchall()
for row in rows:
    print(row)

print("\n=== LOGS (count by level) ===")
c.execute("SELECT COUNT(*), level FROM logs GROUP BY level")
print(c.fetchall())

print("\n=== LOGS (sample last 5) ===")
c.execute("SELECT id, level, logger, event, user_id, created_at FROM logs ORDER BY id DESC LIMIT 5")
rows = c.fetchall()
for row in rows:
    print(row)

conn.close()
print("Done")

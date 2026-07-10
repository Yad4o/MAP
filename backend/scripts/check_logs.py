import sqlite3
import json

conn = sqlite3.connect('map_dev.db')
c = conn.cursor()

# Get the last 10 logs with level ERROR or CRITICAL or WARNING
c.execute("SELECT id, level, logger, event, created_at FROM logs WHERE level IN ('ERROR', 'CRITICAL', 'WARNING') ORDER BY created_at DESC LIMIT 15")
logs = c.fetchall()

print("=== RECENT ERRORS & WARNINGS ===")
for log in logs:
    print(f"[{log[4]}] [{log[1]}] {log[2]}: {log[3][:200]}")

print("\n=== LAST 10 GENERAL LOGS ===")
c.execute("SELECT id, level, logger, event, created_at FROM logs ORDER BY created_at DESC LIMIT 10")
for log in c.fetchall():
    print(f"[{log[4]}] [{log[1]}] {log[2]}: {log[3][:200]}")

conn.close()

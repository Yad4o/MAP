import sqlite3

conn = sqlite3.connect('map_dev.db')
c = conn.cursor()

# Get recent error logs
c.execute("SELECT id, level, logger, event, error_type, error_detail, context FROM logs WHERE level='ERROR' OR event LIKE '%failed%' ORDER BY created_at DESC LIMIT 5")
rows = c.fetchall()

print("=== RECENT ERRORS & DETAILED CONTEXTS ===")
for r in rows:
    log_id, level, logger, event, err_type, err_detail, context = r
    print("-" * 60)
    print(f"Log ID: {log_id}")
    print(f"Level: {level} | Logger: {logger}")
    print(f"Event: {event}")
    print(f"Error Type: {err_type}")
    print(f"Error Detail: {err_detail}")
    print(f"Context: {context}")

conn.close()

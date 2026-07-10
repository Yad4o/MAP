import sqlite3
conn = sqlite3.connect('map_dev.db')
c = conn.cursor()

print("=== USERS ===")
c.execute("SELECT id, email, username, role, is_active FROM users")
rows = c.fetchall()
for row in rows:
    print(row)

conn.close()

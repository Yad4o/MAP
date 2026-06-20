"""
Promote omyadao1706@gmail.com to ADMIN role.
Run once from backend/ directory.
"""
import sqlite3

conn = sqlite3.connect('map_dev.db')
c = conn.cursor()

# Promote yad4o to ADMIN
c.execute(
    "UPDATE users SET role = 'ADMIN' WHERE email = 'omyadao1706@gmail.com'"
)
print(f"Rows updated: {c.rowcount}")

# Verify
c.execute("SELECT email, username, role FROM users WHERE email = 'omyadao1706@gmail.com'")
print("After update:", c.fetchone())

conn.commit()
conn.close()
print("Done.")

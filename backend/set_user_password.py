import sqlite3
import sys
import os

# Adjust path to import app.core.security
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.core.security import hash_password

conn = sqlite3.connect('map_dev.db')
c = conn.cursor()

email = 'omyadao1706@gmail.com'
password = 'Omar1706@'
pwd_hash = hash_password(password)

c.execute("UPDATE users SET password_hash = ?, role = 'ADMIN' WHERE email = ?", (pwd_hash, email))
conn.commit()

print(f"Updated user {email} with role=ADMIN and password={password}")
print(f"New hash: {pwd_hash}")

c.execute("SELECT email, password_hash, role FROM users WHERE email = ?", (email,))
print("After update:", c.fetchone())

conn.close()

import sqlite3
conn = sqlite3.connect('map_dev.db')
c = conn.cursor()
c.execute("SELECT email, password_hash, role FROM users WHERE email='omyadao1706@gmail.com'")
row = c.fetchone()
print("Email:", row[0])
print("Hash prefix:", row[1][:20] if row[1] else "None")
print("Role:", row[2])
conn.close()

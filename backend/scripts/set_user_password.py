"""
backend/scripts/set_user_password.py
─────────────────────────────────────
Dev utility: set a local user's password and promote them to ADMIN
against the local SQLite dev DB (map_dev.db).

Usage:
    cd backend
    python scripts/set_user_password.py <email> [--role ADMIN]

Password is prompted interactively (not passed as an arg / not
hardcoded) so it never ends up in shell history or committed source.
"""

import argparse
import getpass
import os
import sqlite3
import sys

# Add parent directory to sys.path to allow importing the app module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.security import hash_password


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("email", help="Email of the user to update")
    parser.add_argument("--role", default="ADMIN", help="Role to assign (default: ADMIN)")
    parser.add_argument("--db", default="map_dev.db", help="Path to the SQLite dev DB")
    args = parser.parse_args()

    password = getpass.getpass(f"New password for {args.email}: ")
    confirm = getpass.getpass("Confirm password: ")
    if password != confirm:
        print("Passwords do not match.", file=sys.stderr)
        sys.exit(1)

    pwd_hash = hash_password(password)

    conn = sqlite3.connect(args.db)
    c = conn.cursor()
    c.execute(
        "UPDATE users SET password_hash = ?, role = ? WHERE email = ?",
        (pwd_hash, args.role, args.email),
    )
    conn.commit()

    print(f"Updated user {args.email} with role={args.role}")

    c.execute("SELECT email, role FROM users WHERE email = ?", (args.email,))
    print("After update:", c.fetchone())

    conn.close()


if __name__ == "__main__":
    main()

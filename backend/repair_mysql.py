"""Repair the local development MySQL login using an administrator account."""

import getpass
from pathlib import Path
import subprocess
import sys

import pymysql
from sqlalchemy.engine import make_url


def main():
    # Load the same .env as the documented backend startup command.
    backend = Path(__file__).resolve().parent
    import os

    os.chdir(backend)
    from app.core.config import settings

    url = make_url(settings.database_url)
    if settings.environment != "development" or url.get_backend_name() != "mysql":
        raise SystemExit("This command requires a development MySQL configuration.")
    if url.host not in {"localhost", "127.0.0.1", "::1"}:
        raise SystemExit("This command only repairs a local MySQL server.")
    if not url.username or not url.password or not url.database:
        raise SystemExit("Set the application username, password and database in .env first.")
    if url.username.lower() == "root":
        raise SystemExit("Configure a separate application user in .env first.")

    admin = input("MySQL administrator username [root]: ").strip() or "root"
    password = getpass.getpass("MySQL administrator password (hidden): ")
    try:
        with pymysql.connect(
            host=url.host, port=url.port or 3306, user=admin,
            password=password, connect_timeout=5, autocommit=True,
        ) as connection:
            database = "`" + url.database.replace("`", "``") + "`"
            with connection.cursor() as cursor:
                cursor.execute(
                    f"CREATE DATABASE IF NOT EXISTS {database} "
                    "CHARACTER SET utf8mb4 COLLATE utf8mb4_bin"
                )
                cursor.execute(
                    "CREATE USER IF NOT EXISTS %s@'localhost' IDENTIFIED BY %s",
                    (url.username, url.password),
                )
                cursor.execute(
                    "ALTER USER %s@'localhost' IDENTIFIED BY %s",
                    (url.username, url.password),
                )
                cursor.execute(
                    f"GRANT ALL PRIVILEGES ON {database}.* TO %s@'localhost'",
                    (url.username,),
                )
    except pymysql.MySQLError as error:
        raise SystemExit(f"MySQL repair failed (error {error.args[0]}). Check the administrator login and privileges.") from None

    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], check=True, cwd=backend)
    print("MySQL login repaired and migrations applied. Restart the backend.")


if __name__ == "__main__":
    main()

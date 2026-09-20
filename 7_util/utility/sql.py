import subprocess
import time
import shutil
import os
import sys


SERVICE_NAME = "MySQL80"
MYSQL_USER = "root"
MYSQL_PASSWORD = "YOUR_PASSWORD"


def is_mysql_running():
    result = subprocess.run(
        ["sc", "query", SERVICE_NAME],
        capture_output=True,
        text=True
    )

    return "RUNNING" in result.stdout


def start_mysql():
    print("MySQL Server is not running. Requesting administrator permission...")

    # Ask Windows to run "net start MySQL80" as administrator.
    command = (
        "Start-Process "
        "-FilePath 'net.exe' "
        "-ArgumentList 'start MySQL80' "
        "-Verb RunAs "
        "-Wait"
    )

    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command", command]
    )

    if result.returncode != 0:
        print("Failed to start MySQL Server.")
        sys.exit(1)

    # Give the service a moment to become ready.
    for _ in range(15):
        if is_mysql_running():
            print("MySQL Server started.")
            return

        time.sleep(1)

    print("MySQL Server did not reach the RUNNING state.")
    sys.exit(1)


def find_mysqlsh():
    mysqlsh = shutil.which("mysqlsh")

    if mysqlsh:
        return mysqlsh

    default_path = os.path.join(
        os.environ.get("ProgramFiles", r"C:\Program Files"),
        "MySQL",
        "MySQL Shell 8.0",
        "bin",
        "mysqlsh.exe"
    )

    if os.path.exists(default_path):
        return default_path

    print("Could not find mysqlsh.exe.")
    print("Make sure MySQL Shell is installed.")
    sys.exit(1)


# --- START MYSQL IF NECESSARY ---

if not is_mysql_running():
    start_mysql()


# --- LAUNCH MYSQL SHELL ---

mysqlsh = find_mysqlsh()

subprocess.run([
    mysqlsh,
    "--sql",
    "--host=localhost",
    "--port=3306",
    "--user=" + MYSQL_USER,
    "--password=" + MYSQL_PASSWORD
])

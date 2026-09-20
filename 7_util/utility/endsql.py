import subprocess
import sys
import time


SERVICE_NAME = "MySQL80"


def is_mysql_running():
    result = subprocess.run(
        ["sc", "query", SERVICE_NAME],
        capture_output=True,
        text=True
    )

    return "RUNNING" in result.stdout


def stop_mysql():
    print("MySQL Server is running. Requesting administrator permission...")

    command = (
        "Start-Process "
        "-FilePath 'net.exe' "
        "-ArgumentList 'stop MySQL80' "
        "-Verb RunAs "
        "-Wait"
    )

    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command", command]
    )

    if result.returncode != 0:
        print("Failed to stop MySQL Server.")
        sys.exit(1)

    for _ in range(15):
        if not is_mysql_running():
            print("MySQL Server stopped.")
            return

        time.sleep(1)

    print("MySQL Server did not stop cleanly.")
    sys.exit(1)


if not is_mysql_running():
    print("MySQL Server is already stopped.")
    sys.exit(0)

stop_mysql()
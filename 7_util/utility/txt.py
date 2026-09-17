from pathlib import Path
from datetime import datetime
import subprocess
import sys


TEXT_FOLDER = Path(r"E:\Text_Files")


def main():
    if len(sys.argv) < 2:
        print("Usage: txt <title>")
        sys.exit(1)

    title = " ".join(sys.argv[1:]).strip()

    if not title:
        print("A title is required.")
        sys.exit(1)

    date = datetime.now().strftime("%d-%m-%Y")
    filepath = TEXT_FOLDER / f"{title} - {date}.txt"

    TEXT_FOLDER.mkdir(parents=True, exist_ok=True)

    if not filepath.exists():
        filepath.touch()

    subprocess.Popen(["notepad.exe", str(filepath)])


if __name__ == "__main__":
    main()
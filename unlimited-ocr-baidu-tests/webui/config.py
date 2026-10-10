from pathlib import Path
import os

APP_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = APP_DIR.parent

MODEL_SNAPSHOT_ROOT = (
    PROJECT_ROOT / "huggingface" / "hub" /
    "models--baidu--Unlimited-OCR" / "snapshots"
)
_override = os.environ.get("UNLIMITED_OCR_MODEL_PATH")
if _override:
    MODEL_PATH = Path(_override).expanduser().resolve()
else:
    _snapshots = sorted(
        (p for p in MODEL_SNAPSHOT_ROOT.iterdir() if p.is_dir()),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    ) if MODEL_SNAPSHOT_ROOT.is_dir() else []
    MODEL_PATH = _snapshots[0] if _snapshots else MODEL_SNAPSHOT_ROOT

JOBS_DIR = APP_DIR / "jobs"
TEMP_DIR = APP_DIR / "temp"
JOBS_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)

MAX_UPLOAD_MB = 100
MAX_PDF_PAGES = 250
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff", ".pdf"}
HOST = "127.0.0.1"
PORT = 8765

from __future__ import annotations
from pathlib import Path
from uuid import uuid4
from threading import Thread, Event, Lock
import shutil
import zipfile
import html
import re
import os
import subprocess

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from config import APP_DIR, JOBS_DIR, TEMP_DIR, MAX_UPLOAD_MB, ALLOWED_EXTENSIONS, HOST, PORT
from ocr_engine import engine, OCRCancelled
from output_processor import clean_ocr_output

app = FastAPI(title="Unlimited-OCR WebUI v2")
app.mount("/static", StaticFiles(directory=APP_DIR / "web"), name="static")
_jobs = {}
_jobs_lock = Lock()

def _update(job_id, stage, completed=None, total=None):
    with _jobs_lock:
        job = _jobs.get(job_id)
        if not job:
            return
        job["stage"] = stage
        if total and total > 0 and completed is not None:
            job["progress"] = max(0, min(100, int(completed * 100 / total)))
            job["progress_detail"] = f"{completed} / {total} pages"
        elif stage in ("Loading model", "Model ready"):
            job["progress"] = 0
        job["updated"] = __import__("time").time()


def _worker(job_id):
    with _jobs_lock:
        job = _jobs[job_id]
        job["status"] = "running"
        sources = [Path(p) for p in job.get("source_paths", [job["source_path"]])]
        settings = dict(job["settings"])
        cancel_event = job["cancel_event"]
    try:
        outputs = []
        metadata = {"files": [], "device": engine.device}
        for index, source in enumerate(sources):
            if cancel_event.is_set():
                raise OCRCancelled()
            label = source.name
            with _jobs_lock:
                _jobs[job_id]["stage"] = f"Processing file {index + 1} of {len(sources)}: {label}"
                _jobs[job_id]["progress_detail"] = f"File {index + 1} / {len(sources)}"
            # Engine reports per-document page progress; map it into an approximate
            # document-level display without pretending token inference is measurable.
            raw, file_metadata = engine.process(
                source, f"{job_id}_{index:03d}", settings, cancel_event,
                lambda stage, done=None, total=None, i=index, n=len(sources):
                    _update(job_id, f"File {i + 1}/{n}: {stage}", done, total)
            )
            outputs.append(f"===== {label} =====\n\n{raw.strip()}")
            metadata["files"].append({"filename": label, **file_metadata})
        if cancel_event.is_set():
            raise OCRCancelled()
        raw_all = "\n\n".join(outputs)
        with _jobs_lock:
            job = _jobs[job_id]
            job["raw_output"] = raw_all
            job["clean_output"] = None
            job["metadata"] = metadata
            job["status"] = "completed"
            job["stage"] = "OCR complete — ready to preview"
            job["progress"] = 100
            job["progress_detail"] = f"{len(sources)} file(s) completed"
    except OCRCancelled:
        with _jobs_lock:
            _jobs[job_id]["status"] = "cancelled"
            _jobs[job_id]["stage"] = "Cancelled"
    except Exception as exc:
        with _jobs_lock:
            _jobs[job_id]["status"] = "error"
            _jobs[job_id]["stage"] = "Failed"
            _jobs[job_id]["error"] = f"{type(exc).__name__}: {exc}"

@app.get("/")
def index():
    return FileResponse(APP_DIR / "web" / "index.html")

@app.get("/api/health")
def health():
    return {"status": "ok", "model_path": str(engine.model is not None and "loaded" or __import__("config").MODEL_PATH),
            "model_loaded": engine.model is not None, "device": engine.device}


@app.post("/api/jobs")
async def create_job(files: list[UploadFile] = File(...)):
    if not files:
        raise HTTPException(400, "Select at least one input file.")
    job_id = uuid4().hex
    target_dir = TEMP_DIR / job_id
    target_dir.mkdir(parents=True, exist_ok=True)
    source_paths = []
    total_size = 0
    try:
        for index, upload in enumerate(files):
            name = Path(upload.filename or f"input_{index + 1}").name
            ext = Path(name).suffix.lower()
            if ext not in ALLOWED_EXTENSIONS:
                raise HTTPException(400, f"Unsupported file type: {name}")
            # Prefix with an index to prevent duplicate filenames overwriting each other.
            source_path = target_dir / f"{index + 1:03d}_{name}"
            with source_path.open("wb") as out:
                while True:
                    chunk = await upload.read(1024 * 1024)
                    if not chunk:
                        break
                    total_size += len(chunk)
                    if total_size > MAX_UPLOAD_MB * 1024 * 1024:
                        raise HTTPException(413, f"Combined upload exceeds {MAX_UPLOAD_MB} MB.")
                    out.write(chunk)
            source_paths.append(str(source_path))
    except Exception:
        shutil.rmtree(target_dir, ignore_errors=True)
        raise
    with _jobs_lock:
        _jobs[job_id] = {
            "id": job_id,
            "filename": Path(source_paths[0]).name if len(source_paths) == 1 else f"{len(source_paths)} documents",
            "input_filenames": [Path(p).name for p in source_paths],
            "source_paths": source_paths,
            "source_path": source_paths[0],
            "status": "queued", "stage": "Queued", "progress": 0,
            "progress_detail": "", "settings": {}, "raw_output": None,
            "clean_output": None, "metadata": {}, "error": None,
            "cancel_event": Event(), "updated": __import__("time").time()
        }
    return {"job_id": job_id, "filenames": [Path(p).name for p in source_paths], "count": len(source_paths)}

class RunSettings(BaseModel):
    mode: str = "flow"
    prompt: str = "<image>document parsing."
    base_size: int = Field(1024, ge=256, le=2048)
    image_size: int = Field(640, ge=256, le=1536)
    crop_mode: bool = True
    max_length: int = Field(32768, ge=256, le=65536)
    no_repeat_ngram_size: int = Field(35, ge=0, le=100)
    ngram_window: int = Field(128, ge=0, le=4096)
    temperature: float = Field(0.0, ge=0.0, le=2.0)

@app.post("/api/jobs/{job_id}/run")
def run_job(job_id: str, settings: RunSettings):
    with _jobs_lock:
        job = _jobs.get(job_id)
        if not job:
            raise HTTPException(404, "Job not found.")
        if job["status"] not in ("queued",):
            raise HTTPException(409, "This job has already started.")
        job["settings"] = settings.model_dump()
        job["mode"] = settings.mode
        job["status"] = "starting"
    Thread(target=_worker, args=(job_id,), daemon=True).start()
    return {"job_id": job_id, "status": "starting"}

@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    with _jobs_lock:
        job = _jobs.get(job_id)
        if not job:
            raise HTTPException(404, "Job not found.")
        return {k: job.get(k) for k in (
            "id", "filename", "input_filenames", "status", "stage", "progress", "progress_detail",
            "error", "metadata", "mode"
        )}

@app.get("/api/jobs/{job_id}/result")
def get_result(job_id: str, view: str = "clean"):
    with _jobs_lock:
        job = _jobs.get(job_id)
        if not job:
            raise HTTPException(404, "Job not found.")
        if job["status"] != "completed":
            raise HTTPException(409, "OCR has not completed.")
        raw = job["raw_output"] or ""
        mode = job.get("mode", "flow")
    # Cleanup happens only after inference has fully completed.
    cleaned = clean_ocr_output(raw)
    if mode == "flow":
        cleaned = re.sub(r"(?m)^[ \t]*(?:<!-- PAGE \d+ -->)[ \t]*$", "", cleaned)
        cleaned = re.sub(r"(?m)^===== .+ =====[ \t]*$", "", cleaned)
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
    return {"raw": raw, "clean": cleaned, "mode": mode}

@app.post("/api/jobs/{job_id}/cancel")
def cancel_job(job_id: str):
    with _jobs_lock:
        job = _jobs.get(job_id)
        if not job:
            raise HTTPException(404, "Job not found.")
        if job["status"] in ("completed", "error", "cancelled"):
            return {"status": job["status"], "message": "Job is already finished."}
        job["cancel_event"].set()
        job["status"] = "cancelling"
        job["stage"] = "Cancelling — waiting for the current inference step to finish"
    return {"status": "cancelling"}


@app.post("/api/pick-folder")
def pick_folder():
    """Open the native Windows folder browser on the user's interactive desktop."""
    if os.name != "nt":
        raise HTTPException(501, "The native folder picker is currently supported on Windows only.")
    # Use a separate STA PowerShell process so the dialog is native and does not
    # block FastAPI's event loop. The selected path is returned as plain text.
    ps_script = r"""
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = 'Choose an output folder for Unlimited-OCR'
$dialog.ShowNewFolderButton = $true
$dialog.RootFolder = [System.Environment+SpecialFolder]::Desktop
$result = $dialog.ShowDialog()
if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    Write-Output $dialog.SelectedPath
}
$dialog.Dispose()
"""
    try:
        proc = subprocess.run(
            ["powershell.exe", "-NoProfile", "-STA", "-ExecutionPolicy", "Bypass", "-Command", ps_script],
            capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=180
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(504, "Folder selection timed out.")
    if proc.returncode != 0:
        detail = (proc.stderr or "Windows folder picker failed.").strip()
        raise HTTPException(500, detail[-1500:])
    selected = proc.stdout.strip()
    if not selected:
        return {"cancelled": True}
    return {"cancelled": False, "path": selected}

class SaveRequest(BaseModel):
    output_dir: str
    filename: str = "Document"
    formats: list[str] = ["md"]
    text: str
    overwrite: bool = False

def _safe_name(name):
    name = Path((name or "").strip() or "Document").name
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", name).strip(" .")
    return name or "Document"

def _render_html(title, text):
    escaped = html.escape(text)
    body = "<br>".join(html.escape(line) for line in text.splitlines())
    return ("<!doctype html><html><head><meta charset='utf-8'><title>" +
            html.escape(title) + "</title><style>body{max-width:900px;margin:3rem auto;"
            "font:16px/1.65 system-ui;white-space:normal;padding:0 1rem}</style></head><body><pre style='white-space:pre-wrap;font:inherit'>"
            + escaped + "</pre></body></html>")

@app.post("/api/jobs/{job_id}/save")
def save_result(job_id: str, req: SaveRequest):
    with _jobs_lock:
        job = _jobs.get(job_id)
        if not job or job["status"] != "completed":
            raise HTTPException(409, "No completed result to save.")
    out_dir = Path(req.output_dir).expanduser()
    if not out_dir.is_absolute():
        raise HTTPException(400, "Choose an absolute output folder path.")
    out_dir = out_dir.resolve()
    # Output folder is user-selected and created only on explicit Save.
    out_dir.mkdir(parents=True, exist_ok=True)
    filename = _safe_name(req.filename)
    allowed = {"txt", "md", "html", "pdf"}
    formats = list(dict.fromkeys(x.lower().lstrip(".") for x in req.formats))
    if not formats or any(x not in allowed for x in formats):
        raise HTTPException(400, "Choose one or more supported formats: TXT, Markdown, HTML, PDF.")
    targets = [out_dir / f"{filename}.{fmt}" for fmt in formats]
    conflicts = [p.name for p in targets if p.exists()]
    if conflicts and not req.overwrite:
        return JSONResponse(status_code=409, content={"detail": "Files already exist.", "conflicts": conflicts})
    # Build all outputs before writing, so conversion errors don't leave a partial set.
    payloads = {}
    for fmt in formats:
        if fmt == "txt":
            payloads[fmt] = req.text
        elif fmt == "md":
            payloads[fmt] = req.text
        elif fmt == "html":
            payloads[fmt] = _render_html(filename, req.text)
        elif fmt == "pdf":
            import fitz
            doc = fitz.open()
            page = doc.new_page()
            rect = fitz.Rect(50, 50, page.rect.width - 50, page.rect.height - 50)
            remaining = req.text
            while remaining:
                spare = page.insert_textbox(rect, remaining[:3500], fontsize=10, fontname="helv", lineheight=1.3)
                # PyMuPDF returns negative when text doesn't fit; chunk conservatively.
                if spare < 0 and len(remaining) > 1:
                    # Start fresh page and retry with smaller chunk.
                    page = doc.new_page()
                    rect = fitz.Rect(50, 50, page.rect.width - 50, page.rect.height - 50)
                    remaining = remaining[2500:]
                else:
                    remaining = remaining[3500:]
                    if remaining:
                        page = doc.new_page()
                        rect = fitz.Rect(50, 50, page.rect.width - 50, page.rect.height - 50)
            payloads[fmt] = doc.tobytes()
            doc.close()
    for fmt, content in payloads.items():
        path = out_dir / f"{filename}.{fmt}"
        if fmt == "pdf":
            path.write_bytes(content)
        else:
            path.write_text(content, encoding="utf-8")
    return {"saved": [str(out_dir / f"{filename}.{fmt}") for fmt in formats]}

@app.delete("/api/jobs/{job_id}")
def discard_job(job_id: str):
    with _jobs_lock:
        job = _jobs.pop(job_id, None)
    if not job:
        return {"status": "discarded"}
    shutil.rmtree(TEMP_DIR / job_id, ignore_errors=True)
    return {"status": "discarded"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host=HOST, port=PORT, app_dir=str(APP_DIR), reload=False)

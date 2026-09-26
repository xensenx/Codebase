from pathlib import Path
from datetime import datetime
import json
import threading
import uuid
import subprocess

from flask import Flask, jsonify, request, send_from_directory, send_file

from tts import MODEL_DIRS, VOICES, generate_audio
from document import extract_document

BASE_DIR = Path(__file__).resolve().parent.parent
WEB_DIR = BASE_DIR / "app" / "web"
jobs = {}

app = Flask(__name__, static_folder=str(WEB_DIR), static_url_path="")


@app.get("/")
def index():
    return send_from_directory(WEB_DIR, "index.html")


@app.get("/api/models")
def models():
    return jsonify([{"id": k, "name": v[0]} for k, v in MODEL_DIRS.items()])


@app.get("/api/voices")
def voices():
    return jsonify(VOICES)


@app.post("/api/document")
def document():
    if "file" not in request.files:
        return jsonify({"error": "No file supplied."}), 400
    f = request.files["file"]
    name = f.filename or ""
    ext = Path(name).suffix.lower()
    if ext not in {".pdf", ".epub", ".txt", ".md"}:
        return jsonify({"error": "Supported files: PDF, EPUB, TXT and Markdown."}), 400

    temp_dir = BASE_DIR / "app" / ".uploads"
    temp_dir.mkdir(exist_ok=True)
    temp = temp_dir / f"{uuid.uuid4().hex}{ext}"
    f.save(temp)
    try:
        return jsonify({"filename": name, "text": extract_document(temp)})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400
    finally:
        try:
            temp.unlink()
        except OSError:
            pass


@app.get("/api/pick-folder")
def pick_folder():
    import tkinter as tk
    from tkinter import filedialog
    root = tk.Tk()
    root.withdraw()
    root.attributes("-topmost", True)
    selected = filedialog.askdirectory(title="Choose KittenTTS output folder")
    root.destroy()
    return jsonify({"path": selected or ""})


def split_text(text, target_chars):
    """Split near interval-sized boundaries, preferring paragraph/sentence ends."""
    target_chars = max(500, int(target_chars))
    pieces = []
    pos = 0
    n = len(text)

    while pos < n:
        ideal = min(pos + target_chars, n)
        if ideal >= n:
            pieces.append(text[pos:].strip())
            break

        window_start = min(n, pos + int(target_chars * 0.75))
        window_end = min(n, pos + int(target_chars * 1.25))

        window = text[window_start:window_end]
        candidates = []
        for pat in [r"\n\s*\n", r"[.!?。！？]\s+", r"\n"]:
            for m in re.finditer(pat, window):
                candidates.append(window_start + m.end())

        if candidates:
            boundary = min(candidates, key=lambda x: abs(x - ideal))
        else:
            boundary = ideal

        if boundary <= pos:
            boundary = ideal

        chunk = text[pos:boundary].strip()
        if chunk:
            pieces.append(chunk)
        pos = boundary

    return pieces


def audio_seconds(path):
    import soundfile as sf
    info = sf.info(str(path))
    return info.frames / float(info.samplerate)


def merge_wavs(paths, output):
    import numpy as np
    import soundfile as sf

    arrays = []
    samplerate = None
    for p in paths:
        data, sr = sf.read(str(p), dtype="float32")
        if samplerate is None:
            samplerate = sr
        elif sr != samplerate:
            raise RuntimeError("Chunk sample rates do not match.")
        arrays.append(data)

    if not arrays:
        raise RuntimeError("No audio chunks were generated.")

    combined = np.concatenate(arrays)
    sf.write(str(output), combined, samplerate)
    return output


@app.post("/api/generate")
def generate():
    data = request.get_json(force=True)
    text = (data.get("text") or "").strip()
    model = data.get("model", "mini")
    voice = data.get("voice", "Jasper")
    speed = float(data.get("speed", 1.0))
    clean_text = bool(data.get("clean_text", True))
    output_root = (data.get("output_root") or "").strip()
    audio_name = (data.get("audio_name") or "").strip()
    chunk_enabled = bool(data.get("chunk_enabled", False))
    chunk_minutes = float(data.get("chunk_minutes", 10))

    if not text:
        return jsonify({"error": "No text supplied."}), 400
    if model not in MODEL_DIRS:
        return jsonify({"error": "Unknown model."}), 400
    if voice not in VOICES:
        return jsonify({"error": "Unknown voice."}), 400
    if not 0.5 <= speed <= 2.0:
        return jsonify({"error": "Speed must be between 0.5 and 2.0."}), 400
    if not audio_name:
        return jsonify({"error": "Enter an audio filename first."}), 400
    if chunk_enabled and not 1 <= chunk_minutes <= 120:
        return jsonify({"error": "Chunk interval must be between 1 and 120 minutes."}), 400

    audio_name = Path(audio_name).name
    if not audio_name.lower().endswith(".wav"):
        audio_name += ".wav"

    root = Path(output_root) if output_root else BASE_DIR / "outputs"
    root.mkdir(parents=True, exist_ok=True)

    stamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    job_dir = root / f"KittenTTS_{stamp}_{uuid.uuid4().hex[:6]}"
    job_dir.mkdir(parents=True, exist_ok=False)
    audio_path = job_dir / audio_name
    job_id = job_dir.name

    jobs[job_id] = {
        "status": "starting",
        "path": str(job_dir),
        "audio": str(audio_path),
        "error": None,
        "progress": 0,
        "chunks_done": 0,
        "chunks_total": 1,
        "current_chunk": 0,
        "segments_done": 0,
        "segments_total": 1,
        "current_segment": 0,
        "elapsed_audio": 0,
        "total_audio": 0,
        "started": datetime.now().isoformat(),
    }

    def worker():
        import time
        started = time.monotonic()
        try:
            # First establish the user-requested outer intervals.
            # KittenTTS itself then subdivides each interval into its own
            # sentence/text chunks. Those internal chunks are our real-time
            # progress boundaries.
            chars_per_second = 14.63 * speed
            target_chars = int(chunk_minutes * 60 * chars_per_second)
            chunks = split_text(text, target_chars) if chunk_enabled else [text]

            jobs[job_id]["chunks_total"] = len(chunks)
            jobs[job_id]["status"] = "generating"

            chunk_dir = job_dir / "chunks"
            if chunk_enabled:
                chunk_dir.mkdir()

            generated = []
            cumulative_audio = 0.0
            segment_global = 0

            for i, chunk in enumerate(chunks, 1):
                jobs[job_id]["current_chunk"] = i
                jobs[job_id]["chunks_done"] = i - 1

                if chunk_enabled:
                    chunk_path = chunk_dir / f"{i:04d}.wav"
                else:
                    chunk_path = audio_path

                def on_segments_start(total, chunk_index=i):
                    jobs[job_id]["segments_total"] += int(total)

                def on_segment(audio_array, local_index, local_total, chunk_index=i):
                    nonlocal segment_global, cumulative_audio
                    segment_global += 1

                    import numpy as np
                    samples = len(np.asarray(audio_array).reshape(-1))
                    duration = samples / 24000.0
                    cumulative_audio += duration

                    jobs[job_id]["current_segment"] = segment_global
                    jobs[job_id]["segments_done"] = segment_global
                    jobs[job_id]["elapsed_audio"] = cumulative_audio
                    jobs[job_id]["elapsed_seconds"] = time.monotonic() - started

                    total_segments = max(jobs[job_id]["segments_total"], 1)
                    # This is real progress: each increment is a completed
                    # KittenTTS internal chunk using the same chunk_text()
                    # boundaries as the package's normal generate() method.
                    jobs[job_id]["progress"] = (segment_global / total_segments) * 100

                generate_audio(
                    text=chunk,
                    model_id=model,
                    voice=voice,
                    speed=speed,
                    clean_text=clean_text,
                    output_path=chunk_path,
                    on_start=on_segments_start,
                    on_chunk=on_segment,
                )

                jobs[job_id]["chunks_done"] = i
                jobs[job_id]["elapsed_seconds"] = time.monotonic() - started

                # The file itself is already complete at this point.
                # Re-read duration only for the outer chunk statistic.
                duration = audio_seconds(chunk_path)
                generated.append(chunk_path)

            if chunk_enabled:
                jobs[job_id]["status"] = "merging"
                jobs[job_id]["progress"] = 99.5
                merge_wavs(generated, audio_path)

            total_audio = audio_seconds(audio_path)
            jobs[job_id]["total_audio"] = total_audio
            jobs[job_id]["elapsed_audio"] = total_audio
            jobs[job_id]["progress"] = 100
            jobs[job_id]["elapsed_seconds"] = time.monotonic() - started

            metadata = {
                "model": model,
                "voice": voice,
                "speed": speed,
                "clean_text": clean_text,
                "text_length": len(text),
                "created": datetime.now().isoformat(),
                "audio": str(audio_path),
                "chunking": chunk_enabled,
                "chunk_minutes": chunk_minutes if chunk_enabled else None,
                "chunks": len(chunks),
                "segments": segment_global,
                "duration_seconds": total_audio,
            }
            (job_dir / "metadata.json").write_text(
                json.dumps(metadata, indent=2), encoding="utf-8"
            )
            jobs[job_id]["status"] = "complete"

        except Exception as exc:
            jobs[job_id]["status"] = "error"
            jobs[job_id]["error"] = repr(exc)
            jobs[job_id]["elapsed_seconds"] = time.monotonic() - started

    threading.Thread(target=worker, daemon=True).start()
    return jsonify({"job_id": job_id, "path": str(job_dir)})


@app.get("/api/jobs/<job_id>")
def job_status(job_id):
    job = jobs.get(job_id)
    if not job:
        return jsonify({"error": "Unknown job."}), 404
    return jsonify(job)


@app.get("/api/audio/<job_id>")
def audio(job_id):
    job = jobs.get(job_id)
    if not job or job["status"] != "complete":
        return jsonify({"error": "Audio is not ready."}), 404
    path = Path(job["audio"])
    if not path.exists():
        return jsonify({"error": "Audio file not found."}), 404
    return send_file(path, mimetype="audio/wav")


@app.post("/api/open-folder")
def open_folder():
    data = request.get_json(force=True)
    path = Path(data.get("path", ""))
    if not path.is_dir():
        return jsonify({"error": "Folder does not exist."}), 400
    subprocess.Popen(["explorer.exe", str(path)])
    return jsonify({"ok": True})


if __name__ == "__main__":
    print("KittenTTS local interface: http://127.0.0.1:8765")
    app.run(host="127.0.0.1", port=8765, debug=False)

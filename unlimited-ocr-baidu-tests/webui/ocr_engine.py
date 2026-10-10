from __future__ import annotations
from pathlib import Path
import threading
import time
import torch
from PIL import Image
import fitz
from transformers import AutoModel, AutoTokenizer
from config import MODEL_PATH, TEMP_DIR, MAX_PDF_PAGES

class OCRCancelled(Exception):
    pass

class OCREngine:
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self._load_lock = threading.Lock()
        self._inference_lock = threading.Lock()

    def load(self, status_callback=None):
        if self.model is not None:
            return
        with self._load_lock:
            if self.model is not None:
                return
            if not (Path(MODEL_PATH) / "config.json").is_file():
                raise FileNotFoundError(
                    f"Model snapshot not found at: {MODEL_PATH}. "
                    "Check config.py or UNLIMITED_OCR_MODEL_PATH."
                )
            if status_callback:
                status_callback("Loading model", 0, None)
            dtype = torch.bfloat16 if self.device == "cuda" and torch.cuda.is_bf16_supported() else (
                torch.float16 if self.device == "cuda" else torch.float32
            )
            self.tokenizer = AutoTokenizer.from_pretrained(
                str(MODEL_PATH), trust_remote_code=True, local_files_only=True
            )
            self.model = AutoModel.from_pretrained(
                str(MODEL_PATH), trust_remote_code=True, use_safetensors=True,
                torch_dtype=dtype, local_files_only=True
            ).eval()
            if self.device == "cuda":
                self.model = self.model.cuda()
            if status_callback:
                status_callback("Model ready", 0, None)

    def _run_one(self, image_path: Path, settings: dict, output_dir: Path, cancel_event):
        if cancel_event.is_set():
            raise OCRCancelled()
        prompt = settings.get("prompt") or "<image>document parsing."
        kwargs = dict(
            tokenizer=self.tokenizer,
            prompt=prompt,
            image_file=str(image_path),
            output_path=str(output_dir),
            base_size=int(settings.get("base_size", 1024)),
            image_size=int(settings.get("image_size", 640)),
            crop_mode=bool(settings.get("crop_mode", True)),
            max_length=int(settings.get("max_length", 32768)),
            no_repeat_ngram_size=int(settings.get("no_repeat_ngram_size", 35)),
            ngram_window=int(settings.get("ngram_window", 128)),
            save_results=False,
            temperature=float(settings.get("temperature", 0.0)),
            eval_mode=True,
        )
        with self._inference_lock, torch.inference_mode():
            if cancel_event.is_set():
                raise OCRCancelled()
            result = self.model.infer(**kwargs)
        if isinstance(result, str):
            return result
        if result is None:
            return ""
        return str(result)

    def process(self, source_path: Path, job_id: str, settings: dict, cancel_event, update):
        self.load(lambda stage, done, total: update(stage, done, total))
        source_path = Path(source_path)
        job_dir = TEMP_DIR / job_id
        job_dir.mkdir(parents=True, exist_ok=True)
        try:
            if source_path.suffix.lower() == ".pdf":
                with fitz.open(source_path) as pdf:
                    total = len(pdf)
                    if total == 0:
                        raise ValueError("The PDF contains no pages.")
                    if total > MAX_PDF_PAGES:
                        raise ValueError(f"PDF has {total} pages; limit is {MAX_PDF_PAGES}.")
                    pieces = []
                    for index, page in enumerate(pdf):
                        if cancel_event.is_set():
                            raise OCRCancelled()
                        update("Rendering page", index, total)
                        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
                        page_img = job_dir / f"page_{index + 1:04d}.png"
                        pix.save(page_img)
                        update("Running OCR", index, total)
                        raw = self._run_one(page_img, settings, job_dir, cancel_event)
                        pieces.append(f"<!-- PAGE {index + 1} -->\n{raw.strip()}")
                        update("Running OCR", index + 1, total)
                    return "\n\n".join(pieces), {"pages": total, "device": self.device}
            else:
                update("Preparing image", 0, 1)
                with Image.open(source_path) as im:
                    im.verify()
                update("Running OCR", 0, 1)
                raw = self._run_one(source_path, settings, job_dir, cancel_event)
                update("Running OCR", 1, 1)
                return raw, {"pages": 1, "device": self.device}
        finally:
            # Keep job temp until app cleanup/discard so raw/model artifacts can be inspected if needed.
            pass

engine = OCREngine()

# Unlimited-OCR WebUI v2.1

Local-only web interface for the existing Baidu Unlimited-OCR snapshot.

## Install / run (PowerShell)
From `F:\Local_AI\Unlimited-OCR`:

```powershell
& ".\Scripts\python.exe" -m pip install -r ".\webui\requirements-web.txt"
& ".\Scripts\python.exe" -m uvicorn app:app --app-dir ".\webui" --host 127.0.0.1 --port 8765
```

Open http://127.0.0.1:8765. Keep the terminal open.

If PowerShell blocks `run_web.ps1`, the direct Uvicorn command above avoids changing execution policy.

## Notes
- Model path is resolved from the parent project directory, under `huggingface\hub`.
- Raw OCR is retained separately. Conservative cleanup is applied only after inference completes, when fetching the preview/export content.
- PDF pages are processed sequentially with real page-count progress. Inference is serialized because one GPU model instance is reused.
- Cancellation is cooperative: an active model inference call may need to return before cancellation takes effect.
- Saving writes directly to the selected absolute Windows output folder only after the Save action.
- Model-specific inference and GPU batching behavior should be benchmarked before enabling parallel inference; this v2 intentionally prioritizes correctness and VRAM safety.


## Native folder picker
On Windows, the output-folder Browse button opens the native Windows Forms folder browser via a local PowerShell STA process. It returns the selected absolute path to the page; it does not save anything until Save Output is pressed.


## Multi-file input
The upload picker supports selecting multiple images and PDFs. They are processed sequentially within one job and their cleaned results are combined into a single preview/export, with per-input separators retained in Structured mode.

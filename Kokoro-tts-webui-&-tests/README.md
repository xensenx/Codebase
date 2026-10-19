# Kokoro Speech Studio v3

Local-first FastAPI + HTML/CSS/JavaScript UI for Kokoro-82M. The app expects the project model layout to contain `models/kokoro-v1_0.pth`, `models/config.json`, and `models/voices/*.pt`.

## v3 updates
- Does not display a specific GPU model name in the UI; reports only CUDA availability / inference device.
- Shows elapsed generation time and Kokoro phoneme-string character count labelled as **phoneme tokens** (this is a useful pipeline-level count, not a tokenizer's model-token count).
- Actual percentage progress updates from Kokoro's yielded text/audio units and completed user-configured chunks; no indeterminate animation.
- Chunking is optional. When disabled, the text is sent as one application-level segment and Kokoro handles its own internal segmentation.
- Multiple files can be selected or dropped together (PDF, EPUB, TXT, Markdown); extracted text is combined and remains editable.
- Native Windows folder picker for output destination, with a text path field as a fallback.
- Final WAV, optional chunk WAVs, and metadata are written to the chosen output directory.

## Install / run
From the project root in PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
python -m pip install -r .\app\requirements-webui.txt
.\app\run-webui.ps1
```

Open http://127.0.0.1:8765. The launcher binds to localhost only.

The native folder picker is intended for a locally running Windows instance, not a remotely hosted server. PDF extraction cannot OCR scanned pages. Japanese and Mandarin may require `misaki[ja]` and `misaki[zh]` respectively.

$ErrorActionPreference = 'Stop'
$Project = Split-Path $PSScriptRoot -Parent
$AppDir = Join-Path $PSScriptRoot 'app'
$Python = Join-Path $Project '.venv\Scripts\python.exe'
if (-not (Test-Path $Python)) { throw "Virtual environment Python not found: $Python" }
if (-not (Test-Path (Join-Path $Project 'models\kokoro-v1_0.pth'))) { throw 'Kokoro model weights not found in project models folder.' }
if (-not (Test-Path (Join-Path $AppDir 'app.py'))) { throw "Application not found: $(Join-Path $AppDir 'app.py')" }
Set-Location $Project
& $Python -m uvicorn app:app --app-dir $AppDir --host 127.0.0.1 --port 8765

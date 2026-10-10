$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Python = Join-Path $ProjectRoot "Scripts\python.exe"
if (-not (Test-Path $Python)) { throw "Python environment not found: $Python" }
Set-Location $ProjectRoot
& $Python -m uvicorn app:app --app-dir (Join-Path $ProjectRoot "webui") --host 127.0.0.1 --port 8765

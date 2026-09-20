@echo off
powershell -NoProfile -Command "(New-Object -ComObject Shell.Application).Namespace(0x0a).Items() | ForEach-Object { $_.InvokeVerb('delete') }"

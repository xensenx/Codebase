@echo off

powershell -NoProfile -Command "if (Get-Process brave -ErrorAction SilentlyContinue) { Start-Process brave.exe -ArgumentList '--new-tab','https://github.com/xensenx' } else { Start-Process brave.exe -ArgumentList '--new-window','https://github.com/xensenx' }"
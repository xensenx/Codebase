@echo off

powershell -NoProfile -Command "if (Get-Process brave -ErrorAction SilentlyContinue) { Start-Process brave.exe -ArgumentList '--new-tab','https://music.youtube.com' } else { Start-Process brave.exe -ArgumentList '--new-window','https://music.youtube.com' }"
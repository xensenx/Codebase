@echo off
powershell -NoProfile -Command "Get-Location; Get-ChildItem -Directory | Select-Object Name, FullName"

@echo off
color 0A
title Windows Temp Cleanup Script
echo ==========================================
echo Starting System Cleanup...
echo ==========================================
echo.

echo [1/3] Cleaning User Temp files...
del /q /f /s "%TEMP%\*" >nul 2>&1
for /d %%p in ("%TEMP%\*") do rd /s /q "%%p" >nul 2>&1

echo.
echo [2/3] Cleaning System Temp files...
del /q /f /s "%WINDIR%\Temp\*" >nul 2>&1
for /d %%p in ("%WINDIR%\Temp\*") do rd /s /q "%%p" >nul 2>&1

echo.
echo [3/3] Cleaning Prefetch files...
del /q /f /s "%WINDIR%\Prefetch\*" >nul 2>&1
for /d %%p in ("%WINDIR%\Prefetch\*") do rd /s /q "%%p" >nul 2>&1

echo.
echo ==========================================
echo Cleanup Complete! 
echo Note: Some files may be skipped if they are currently in use by Windows.
echo ==========================================
echo.
pause
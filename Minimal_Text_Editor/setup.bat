@echo off
echo ========================================
echo Minimal Text Editor - Setup Script
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js is installed
node --version
echo.

REM Check if Neutralino CLI is installed
where neu >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Neutralino CLI not found. Installing...
    npm install -g @neutralinojs/neu
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install Neutralino CLI
        pause
        exit /b 1
    )
)

echo [OK] Neutralino CLI is installed
neu --version
echo.

REM Download Neutralino binaries
echo [INFO] Downloading Neutralino binaries...
neu update
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to download binaries
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Setup complete!
echo.
echo What would you like to do?
echo.
echo 1. Run the app in development mode
echo 2. Build the executable
echo 3. Exit
echo.
set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" (
    echo.
    echo [INFO] Starting application...
    neu run
) else if "%choice%"=="2" (
    echo.
    echo [INFO] Building application...
    neu build
    echo.
    echo [SUCCESS] Build complete!
    echo Executable location: dist\minimal-text-editor\minimal-text-editor.exe
    echo.
    pause
) else (
    echo.
    echo Goodbye!
    pause
    exit /b 0
)

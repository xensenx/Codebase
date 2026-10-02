@echo off
echo Building Minimal Text Editor...
neu build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Build complete!
    echo.
    echo Executable location:
    echo %CD%\dist\minimal-text-editor\minimal-text-editor.exe
    echo.
    set /p open="Open build folder? (Y/N): "
    if /i "%open%"=="Y" (
        explorer dist\minimal-text-editor
    )
)

pause

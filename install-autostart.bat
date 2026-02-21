@echo off
title ChefFlow Auto-Start Setup

echo.
echo  ============================================
echo    ChefFlow Persistent Auto-Start Setup
echo  ============================================
echo.

:: Copy the silent launcher to the Windows Startup folder
set STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
copy /y "%~dp0chefflow-launcher.vbs" "%STARTUP%\chefflow-launcher.vbs" >nul

if %errorlevel% equ 0 (
    echo  [OK] Added to Windows Startup folder.
    echo       ChefFlow will now start automatically on every login.
) else (
    echo  [FAIL] Could not copy to Startup folder.
    pause
    exit /b 1
)

echo.
echo  Starting ChefFlow now...
wscript.exe "%STARTUP%\chefflow-launcher.vbs"

echo.
echo  [OK] ChefFlow is starting in the background.
echo       Wait a few seconds then open: http://localhost:3100
echo.
echo  To stop ChefFlow intentionally: double-click stop-chefflow.bat
echo.
pause

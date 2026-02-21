@echo off
title Stop ChefFlow

echo.
echo  ============================================
echo    Stopping ChefFlow
echo  ============================================
echo.

:: Kill the watchdog PowerShell process (matches by script name in command line)
wmic process where "Name='powershell.exe' and CommandLine like '%%chefflow-watchdog%%'" delete >nul 2>&1
if %errorlevel% equ 0 (
    echo  [OK] Watchdog stopped.
) else (
    echo  [--] Watchdog was not running.
)

:: Kill any Node process still listening on port 3100
set found=0
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3100 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
    echo  [OK] Killed server process (PID %%a^).
    set found=1
)
if %found%==0 echo  [--] No process found on port 3100.

echo.
echo  ChefFlow is fully stopped.
echo  To restart manually:     double-click start-chefflow.bat
echo  To re-enable auto-start: double-click install-autostart.bat
echo.
pause

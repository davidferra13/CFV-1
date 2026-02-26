@echo off
REM ═══════════════════════════════════════════════════════════════
REM  ChefFlow Mission Control — Open Dashboard
REM  Opens in Chrome app mode (no browser chrome, feels native)
REM ═══════════════════════════════════════════════════════════════

REM Start the server if not already running
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:41937' -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop | Out-Null } catch { Start-Process 'node' -ArgumentList 'scripts/launcher/server.mjs' -WorkingDirectory '%~dp0..\..' -WindowStyle Hidden }"

REM Wait a moment for the server to start
timeout /t 2 /nobreak >nul

REM Try Chrome first, fall back to Edge, then default browser
where chrome >nul 2>&1
if %ERRORLEVEL%==0 (
    start "" chrome --app=http://localhost:41937 --window-size=1100,750 --window-position=2560,100
    exit /b
)

where msedge >nul 2>&1
if %ERRORLEVEL%==0 (
    start "" msedge --app=http://localhost:41937 --window-size=1100,750 --window-position=2560,100
    exit /b
)

REM Fallback: default browser
start http://localhost:41937

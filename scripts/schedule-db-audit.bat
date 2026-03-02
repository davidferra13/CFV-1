@echo off
REM ── ChefFlow DB Integrity Audit — Scheduled Launcher ──
REM This batch file is called by Windows Task Scheduler.
REM It cd's into the project, runs the audit, and logs output.

cd /d "C:\Users\david\Documents\CFv1"

REM Ensure node is on PATH (use full path as fallback)
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found on PATH. Aborting. >> reports\scheduler-error.log
    exit /b 1
)

REM Create reports dir if missing
if not exist reports mkdir reports

REM Run the audit, pipe stdout+stderr to a log file
echo [%date% %time%] Starting DB integrity audit... >> reports\scheduler.log
node scripts/db-integrity-audit.mjs >> reports\scheduler.log 2>&1
echo [%date% %time%] DB integrity audit finished (exit code: %errorlevel%) >> reports\scheduler.log

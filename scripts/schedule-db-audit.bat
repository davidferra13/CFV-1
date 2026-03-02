@echo off
REM ── ChefFlow Scheduled Audits — DB Integrity + GOLDMINE Validation ──
REM Called by Windows Task Scheduler at 10:00 AM.
REM Runs DB integrity audit then GOLDMINE validation audit.

cd /d "C:\Users\david\Documents\CFv1"

REM Ensure node is on PATH
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found on PATH. Aborting. >> reports\scheduler-error.log
    exit /b 1
)

REM Create reports dir if missing
if not exist reports mkdir reports

REM ── Phase 1: DB Integrity Audit ──
echo [%date% %time%] Starting DB integrity audit... >> reports\scheduler.log
node scripts/db-integrity-audit.mjs >> reports\scheduler.log 2>&1
echo [%date% %time%] DB integrity audit finished (exit code: %errorlevel%) >> reports\scheduler.log

REM ── Phase 2: GOLDMINE Validation Audit ──
echo [%date% %time%] Starting GOLDMINE validation audit... >> reports\scheduler.log
node --import tsx scripts/goldmine-audit.mjs >> reports\scheduler.log 2>&1
echo [%date% %time%] GOLDMINE validation audit finished (exit code: %errorlevel%) >> reports\scheduler.log

echo [%date% %time%] All scheduled audits complete. >> reports\scheduler.log

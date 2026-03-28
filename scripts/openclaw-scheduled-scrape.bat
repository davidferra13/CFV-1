@echo off
REM OpenClaw Scheduled Scrape - Windows Task Scheduler
REM Schedule: Monday + Thursday at 2 AM
REM
REM To set up:
REM   1. Open Task Scheduler (taskschd.msc)
REM   2. Create Basic Task > "OpenClaw Price Scrape"
REM   3. Trigger: Weekly, Mon + Thu, 2:00 AM
REM   4. Action: Start a program
REM   5. Program: C:\Users\david\Documents\CFv1\scripts\openclaw-scheduled-scrape.bat
REM   6. Start in: C:\Users\david\Documents\CFv1

cd /d C:\Users\david\Documents\CFv1

echo [%date% %time%] Starting OpenClaw scheduled scrape >> scripts\openclaw-scrape.log
node scripts\openclaw-deep-scraper.mjs >> scripts\openclaw-scrape.log 2>&1
echo [%date% %time%] Scrape complete >> scripts\openclaw-scrape.log

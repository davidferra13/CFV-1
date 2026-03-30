#!/bin/bash
# Auto-capture Instacart session cookies and deploy to Pi
# Run via Windows Task Scheduler daily at 6:00 AM
#
# Task Scheduler setup:
#   Program: "C:\Program Files\Git\bin\bash.exe"
#   Arguments: -c "cd /c/Users/david/Documents/CFv1/.openclaw-deploy && bash auto-capture-session.sh"
#   Trigger: Daily at 6:00 AM
#   Conditions: Start only if network available

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

LOG="$SCRIPT_DIR/auto-capture.log"
PI_HOST="davidferra@10.0.0.177"
PI_DEST="~/openclaw-prices/data/captured-session.json"

echo "=== Session capture started at $(date) ===" >> "$LOG"

# Run the capture script
node capture-instacart-v3.mjs >> "$LOG" 2>&1
CAPTURE_EXIT=$?

if [ $CAPTURE_EXIT -ne 0 ]; then
  echo "[ERROR] Capture script failed with exit code $CAPTURE_EXIT" >> "$LOG"
  exit 1
fi

# Check that the file was created and has cookies
if [ ! -f "../captured-session.json" ]; then
  echo "[ERROR] captured-session.json not found after capture" >> "$LOG"
  exit 1
fi

COOKIE_COUNT=$(node -e "const d = JSON.parse(require('fs').readFileSync('../captured-session.json','utf8')); console.log((d.cookies||'').split(';').length)")
echo "[INFO] Captured $COOKIE_COUNT cookies" >> "$LOG"

if [ "$COOKIE_COUNT" -lt 10 ]; then
  echo "[ERROR] Too few cookies ($COOKIE_COUNT), session likely invalid" >> "$LOG"
  exit 1
fi

# SCP to Pi
scp ../captured-session.json "$PI_HOST:$PI_DEST" >> "$LOG" 2>&1
SCP_EXIT=$?

if [ $SCP_EXIT -ne 0 ]; then
  echo "[ERROR] SCP to Pi failed with exit code $SCP_EXIT" >> "$LOG"
  exit 1
fi

echo "[SUCCESS] Session deployed to Pi ($COOKIE_COUNT cookies)" >> "$LOG"
echo "=== Session capture complete at $(date) ===" >> "$LOG"

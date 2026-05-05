#!/bin/bash
# Hermes Job: OpenClaw Delta Sync
# Runs every 6 hours. Pulls fresh price data from Pi via delta sync.
# Full sync weekly (Sundays at 3am handled separately).
# Output: logs only (sync-all.mjs handles its own logging)

CHEFFLOW="/mnt/c/Users/david/Documents/CFv1"
ALERTS="$CHEFFLOW/docs/hermes/ALERTS.md"
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

PI_HOST="10.0.0.177"

# Check Pi alive first
if ! ping -c 1 -W 3 "$PI_HOST" > /dev/null 2>&1; then
  echo "- **$TS** - OpenClaw sync skipped: Pi unreachable" >> "$ALERTS"
  exit 0
fi

# Determine sync type: full on Sundays, delta otherwise
DOW=$(date +%u)  # 7 = Sunday
HOUR=$(date +%H)

if [ "$DOW" -eq 7 ] && [ "$HOUR" -lt 6 ]; then
  SYNC_TYPE="full"
  SYNC_ARGS=""
else
  SYNC_TYPE="delta"
  SYNC_ARGS="--delta"
fi

cd "$CHEFFLOW" || exit 1

# Run sync via Windows node (WSL can't run .mjs with Windows postgres easily)
# Use cmd.exe to invoke node on the Windows side
SUMMARY_FILE="$CHEFFLOW/docs/hermes/last-sync-result.json"
export OPENCLAW_SYNC_SUMMARY_FILE="$SUMMARY_FILE"

cmd.exe /C "cd /d C:\\Users\\david\\Documents\\CFv1 && node scripts/openclaw-pull/sync-all.mjs $SYNC_ARGS" 2>&1 | tail -20

# Check result
if [ $? -eq 0 ]; then
  echo "[${TS}] OpenClaw $SYNC_TYPE sync completed successfully" >> "$CHEFFLOW/docs/hermes/openclaw-sync.log"
else
  echo "- **$TS** - OpenClaw $SYNC_TYPE sync FAILED" >> "$ALERTS"
  echo "[${TS}] OpenClaw $SYNC_TYPE sync FAILED" >> "$CHEFFLOW/docs/hermes/openclaw-sync.log"
fi

# Rotate log
if [ -f "$CHEFFLOW/docs/hermes/openclaw-sync.log" ]; then
  tail -100 "$CHEFFLOW/docs/hermes/openclaw-sync.log" > "$CHEFFLOW/docs/hermes/openclaw-sync.log.tmp"
  mv "$CHEFFLOW/docs/hermes/openclaw-sync.log.tmp" "$CHEFFLOW/docs/hermes/openclaw-sync.log"
fi

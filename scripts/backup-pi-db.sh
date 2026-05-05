#!/bin/bash
# ============================================
# Pi prices.db Daily Backup via rsync
# ============================================
# Copies the 2.8GB SQLite DB from Pi to local PC over gigabit ethernet.
# ~4 seconds for full copy, near-instant for incremental (rsync delta).
#
# Prerequisites:
#   - SSH key auth to Pi (davidferra@10.0.0.177)
#   - Pi running and reachable on local network
#
# Usage:
#   bash scripts/backup-pi-db.sh
#
# Windows Task Scheduler setup:
#   Program: C:\Program Files\Git\bin\bash.exe
#   Arguments: -c "cd /c/Users/david/Documents/CFv1 && bash scripts/backup-pi-db.sh"
#   Trigger: Daily at 4:00 AM
#   Run whether user is logged on or not
# ============================================
set -euo pipefail

PI_HOST="davidferra@10.0.0.177"
PI_DB_PATH="/home/davidferra/openclaw-prices/data/prices.db"
LOCAL_BACKUP_DIR="/c/Users/david/Documents/CFv1/backups/pi"
LOG_FILE="$LOCAL_BACKUP_DIR/backup.log"
TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)

mkdir -p "$LOCAL_BACKUP_DIR"

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
  echo "$msg" | tee -a "$LOG_FILE"
}

# Trim log if over 1MB
if [ -f "$LOG_FILE" ]; then
  log_size=$(wc -c < "$LOG_FILE" 2>/dev/null | tr -d ' ')
  if [ "${log_size:-0}" -gt 1048576 ]; then
    tail -200 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
  fi
fi

log "Starting Pi DB backup"

# Check Pi is reachable (1s timeout)
if ! ssh -o ConnectTimeout=2 -o BatchMode=yes "$PI_HOST" "test -f $PI_DB_PATH" 2>/dev/null; then
  log "ERROR: Pi unreachable or DB not found at $PI_DB_PATH"
  exit 1
fi

# Get remote DB size for verification
REMOTE_SIZE=$(ssh -o ConnectTimeout=2 "$PI_HOST" "stat -c%s $PI_DB_PATH" 2>/dev/null || echo "0")
log "Remote DB size: ${REMOTE_SIZE} bytes ($(echo "scale=1; $REMOTE_SIZE / 1024 / 1024 / 1024" | bc 2>/dev/null || echo '?') GB)"

# rsync with delta transfer (only changed blocks sent over wire)
START_TIME=$(date +%s)
rsync -az --partial --info=progress2 \
  -e "ssh -o ConnectTimeout=5" \
  "$PI_HOST:$PI_DB_PATH" \
  "$LOCAL_BACKUP_DIR/prices.db"
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

# Verify local copy
LOCAL_SIZE=$(wc -c < "$LOCAL_BACKUP_DIR/prices.db" 2>/dev/null | tr -d ' ')

if [ "$LOCAL_SIZE" -lt 1000000 ]; then
  log "ERROR: Local copy suspiciously small (${LOCAL_SIZE} bytes). Backup may be corrupt."
  exit 1
fi

log "Backup complete in ${ELAPSED}s. Local size: ${LOCAL_SIZE} bytes"

# Keep a dated snapshot once per week (Sundays)
DOW=$(date +%u)
if [ "$DOW" = "7" ]; then
  SNAPSHOT="$LOCAL_BACKUP_DIR/prices-${TIMESTAMP}.db"
  cp "$LOCAL_BACKUP_DIR/prices.db" "$SNAPSHOT"
  log "Weekly snapshot: $(basename "$SNAPSHOT")"

  # Prune snapshots older than 4 weeks
  find "$LOCAL_BACKUP_DIR" -name "prices-*.db" -mtime +28 -delete 2>/dev/null || true
  REMAINING=$(ls -1 "$LOCAL_BACKUP_DIR"/prices-*.db 2>/dev/null | wc -l | tr -d ' ')
  log "Weekly snapshots on disk: ${REMAINING}"
fi

log "Done"

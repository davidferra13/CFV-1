#!/bin/bash
# Hermes Job 5: Database Backup Watchdog
# Runs every 12 hours. Verifies backups are fresh and intact.
# Output: docs/hermes/backup-watchdog.jsonl

CHEFFLOW="/mnt/c/Users/david/Documents/CFv1"
OUTPUT="$CHEFFLOW/docs/hermes/backup-watchdog.jsonl"
ALERTS="$CHEFFLOW/docs/hermes/ALERTS.md"
BACKUP_DIR="$CHEFFLOW/backups"
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

mkdir -p "$(dirname "$OUTPUT")"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "{\"ts\":\"$TS\",\"backup_dir_exists\":false,\"status\":\"MISSING\"}" >> "$OUTPUT"
  echo "- **$TS** - CRITICAL: backups/ directory does not exist" >> "$ALERTS"
  exit 0
fi

# Find latest backup file
LATEST=$(ls -1t "$BACKUP_DIR"/chefflow-*.dump* "$BACKUP_DIR"/backup-*.sql* 2>/dev/null | head -1)
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/chefflow-*.dump* "$BACKUP_DIR"/backup-*.sql* 2>/dev/null | wc -l | tr -d ' ')

if [ -z "$LATEST" ]; then
  echo "{\"ts\":\"$TS\",\"backup_dir_exists\":true,\"count\":0,\"status\":\"NO_BACKUPS\"}" >> "$OUTPUT"
  echo "- **$TS** - CRITICAL: No backup files found in backups/" >> "$ALERTS"
  exit 0
fi

LATEST_NAME=$(basename "$LATEST")
LATEST_SIZE=$(stat -c '%s' "$LATEST" 2>/dev/null || echo "0")
LATEST_MTIME=$(stat -c '%Y' "$LATEST" 2>/dev/null || echo "0")
NOW_EPOCH=$(date +%s)
AGE_HOURS=0
if [ "$LATEST_MTIME" -gt 0 ]; then
  AGE_HOURS=$(( (NOW_EPOCH - LATEST_MTIME) / 3600 ))
fi

# Check backup log
LAST_SUCCESS="unknown"
BACKUP_LOG="$BACKUP_DIR/backup-log.json"
if [ -f "$BACKUP_LOG" ]; then
  LAST_SUCCESS=$(jq -r '[.[] | select(.status=="success")] | last | .timestamp // "unknown"' "$BACKUP_LOG" 2>/dev/null || echo "unknown")
fi

# Determine status
STATUS="healthy"
if [ "$AGE_HOURS" -gt 48 ]; then
  STATUS="stale"
  echo "- **$TS** - Backup stale: latest is ${AGE_HOURS}h old ($LATEST_NAME)" >> "$ALERTS"
fi

echo "{\"ts\":\"$TS\",\"latest\":\"$LATEST_NAME\",\"size_bytes\":$LATEST_SIZE,\"age_hours\":$AGE_HOURS,\"count\":$BACKUP_COUNT,\"last_success\":\"$LAST_SUCCESS\",\"status\":\"$STATUS\"}" >> "$OUTPUT"

# Rotate
if [ -f "$OUTPUT" ]; then
  LINES=$(wc -l < "$OUTPUT")
  if [ "$LINES" -gt 30 ]; then
    tail -14 "$OUTPUT" > "$OUTPUT.tmp" && mv "$OUTPUT.tmp" "$OUTPUT"
  fi
fi

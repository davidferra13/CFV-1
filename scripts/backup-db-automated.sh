#!/bin/bash
# ============================================
# ChefFlow Automated Database Backup
# ============================================
# Runs daily via Windows Task Scheduler or cron.
# Dumps, compresses, encrypts, verifies, prunes.
# Sends alert email on failure via curl to the app's alert endpoint.
#
# Prerequisites:
#   - gpg installed (comes with Git for Windows)
#   - BACKUP_PASSPHRASE env var set (or in .env.local)
#   - Docker container chefflow_postgres running
#
# Usage:
#   bash scripts/backup-db-automated.sh
#
# Windows Task Scheduler setup:
#   Program: C:\Program Files\Git\bin\bash.exe
#   Arguments: -c "cd /c/Users/david/Documents/CFv1 && bash scripts/backup-db-automated.sh"
#   Trigger: Daily at 3:00 AM
#   Run whether user is logged on or not
# ============================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups"
RETENTION_DAYS=14
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DUMP_FILE="$BACKUP_DIR/backup-${TIMESTAMP}.sql"
ENCRYPTED_FILE="$DUMP_FILE.gpg"
MIN_BACKUP_SIZE=1000  # bytes - anything smaller is suspicious
LOG_FILE="$BACKUP_DIR/backup.log"
MAX_LOG_SIZE=1048576  # 1MB

# Load env vars (for BACKUP_PASSPHRASE and alert endpoint)
if [ -f "$PROJECT_ROOT/.env.local" ]; then
  set -a
  source "$PROJECT_ROOT/.env.local" 2>/dev/null || true
  set +a
fi

PASSPHRASE="${BACKUP_PASSPHRASE:-}"

# Truncate log if over 1MB
if [ -f "$LOG_FILE" ]; then
  LOG_SIZE=$(wc -c < "$LOG_FILE" 2>/dev/null | tr -d ' ')
  if [ "${LOG_SIZE:-0}" -gt "$MAX_LOG_SIZE" ]; then
    tail -500 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
  fi
fi

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
  echo "$msg" >> "$LOG_FILE"
  echo "$msg"
}

alert_failure() {
  local message="$1"
  log "ALERT: $message"

  # Try to hit the app's developer alert endpoint
  # This is a best-effort alert; if the app is down, the cron monitor catches it
  curl -s -X POST "http://localhost:3000/api/admin/backup-alert" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${CRON_SECRET:-}" \
    -d "{\"error\": \"$message\", \"timestamp\": \"$(date -Iseconds)\"}" \
    > /dev/null 2>&1 || true
}

cleanup() {
  # Remove unencrypted dump if encrypted version exists
  if [ -f "$ENCRYPTED_FILE" ] && [ -f "$DUMP_FILE" ]; then
    rm -f "$DUMP_FILE"
  fi
}
trap cleanup EXIT

# ---- Start ----
mkdir -p "$BACKUP_DIR"
log "Starting automated backup"

# Step 1: Dump database
log "Dumping database..."
docker exec chefflow_postgres pg_dump -U postgres postgres > "$DUMP_FILE" 2>> "$LOG_FILE"

if [ ! -f "$DUMP_FILE" ]; then
  alert_failure "pg_dump failed - no output file created"
  exit 1
fi

DUMP_SIZE=$(wc -c < "$DUMP_FILE" | tr -d ' ')
if [ "$DUMP_SIZE" -lt "$MIN_BACKUP_SIZE" ]; then
  alert_failure "Backup suspiciously small: ${DUMP_SIZE} bytes (min: ${MIN_BACKUP_SIZE})"
  rm -f "$DUMP_FILE"
  exit 1
fi

log "Dump complete: ${DUMP_SIZE} bytes"

# Step 2: Encrypt (if passphrase available)
if [ -n "$PASSPHRASE" ]; then
  log "Encrypting backup..."
  echo "$PASSPHRASE" | gpg --batch --yes --passphrase-fd 0 --symmetric \
    --cipher-algo AES256 -o "$ENCRYPTED_FILE" "$DUMP_FILE" 2>> "$LOG_FILE"

  if [ ! -f "$ENCRYPTED_FILE" ]; then
    alert_failure "Encryption failed - gpg produced no output"
    exit 1
  fi

  ENCRYPTED_SIZE=$(wc -c < "$ENCRYPTED_FILE" | tr -d ' ')
  log "Encrypted: ${ENCRYPTED_SIZE} bytes -> $(basename "$ENCRYPTED_FILE")"

  # Remove unencrypted dump
  rm -f "$DUMP_FILE"
else
  log "WARNING: BACKUP_PASSPHRASE not set. Backup saved unencrypted."
fi

# Step 3: Prune old backups
log "Pruning backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "backup-*.sql.gpg" -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "backup-*.sql" -mtime "+${RETENTION_DAYS}" -not -name "*.gpg" -delete 2>/dev/null || true

REMAINING=$(ls -1 "$BACKUP_DIR"/backup-*.sql* 2>/dev/null | wc -l | tr -d ' ')
log "Backups on disk: ${REMAINING}"

# Step 4: Record heartbeat (call the app's cron heartbeat endpoint)
curl -s -X POST "http://localhost:3000/api/cron/backup-heartbeat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CRON_SECRET:-}" \
  -d "{\"status\": \"success\", \"size\": ${DUMP_SIZE}, \"encrypted\": $([ -n "$PASSPHRASE" ] && echo true || echo false), \"remaining\": ${REMAINING}}" \
  > /dev/null 2>&1 || log "WARNING: Could not record heartbeat (app may be offline)"

log "Backup complete"

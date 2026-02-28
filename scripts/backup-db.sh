#!/bin/bash
# ============================================
# ChefFlow Database Backup
# ============================================
# Creates a timestamped Supabase database backup.
# Keeps the last 7 backups (configurable via RETENTION).
#
# Can be run manually or via cron/Task Scheduler.
#
# Usage:
#   bash scripts/backup-db.sh           # interactive
#   bash scripts/backup-db.sh --quiet   # cron-friendly (no output on success)
#
# Cron example (daily at 3 AM):
#   0 3 * * * cd /c/Users/david/Documents/CFv1 && bash scripts/backup-db.sh --quiet >> backups/cron.log 2>&1
#
# Windows Task Scheduler:
#   Action: bash
#   Arguments: scripts/backup-db.sh --quiet
#   Start in: C:\Users\david\Documents\CFv1
# ============================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups"
RETENTION=7
QUIET=false
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
FILENAME="backup-${TIMESTAMP}.sql"

# Parse args
if [ "$1" = "--quiet" ] || [ "$1" = "-q" ]; then
  QUIET=true
fi

log() {
  if [ "$QUIET" = false ]; then
    echo "$1"
  fi
}

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

log ""
log "=========================================="
log "  ChefFlow Database Backup"
log "=========================================="
log "  File: backups/$FILENAME"
log "=========================================="
log ""

# Run the dump
log "  Dumping database..."
cd "$PROJECT_ROOT"
npx supabase db dump --linked > "$BACKUP_DIR/$FILENAME" 2>/dev/null

# Verify the dump is not empty
FILESIZE=$(wc -c < "$BACKUP_DIR/$FILENAME" 2>/dev/null | tr -d ' ')
if [ "$FILESIZE" -lt 100 ] 2>/dev/null; then
  echo "  ERROR: Backup file is suspiciously small (${FILESIZE} bytes)"
  echo "  The dump may have failed. Check Supabase connectivity."
  rm -f "$BACKUP_DIR/$FILENAME"
  exit 1
fi

log "  Backup saved: backups/$FILENAME ($(du -h "$BACKUP_DIR/$FILENAME" | cut -f1))"

# Retention — keep last N backups, delete older ones
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/backup-*.sql 2>/dev/null | wc -l | tr -d ' ')
if [ "$BACKUP_COUNT" -gt "$RETENTION" ]; then
  DELETE_COUNT=$((BACKUP_COUNT - RETENTION))
  ls -1t "$BACKUP_DIR"/backup-*.sql | tail -n "$DELETE_COUNT" | while read -r OLD_FILE; do
    rm -f "$OLD_FILE"
    log "  Removed old backup: $(basename "$OLD_FILE")"
  done
fi

log ""
log "  Backups on disk: $(ls -1 "$BACKUP_DIR"/backup-*.sql 2>/dev/null | wc -l | tr -d ' ')/$RETENTION"
log "  Retention: $RETENTION most recent"
log ""

# Quiet mode: only output on failure (cron-friendly)
if [ "$QUIET" = true ]; then
  exit 0
fi

echo "=========================================="
echo "  Backup complete"
echo "=========================================="

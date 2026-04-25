#!/bin/bash
# ============================================
# ChefFlow Database Restore
# ============================================
# Previews or restores a PostgreSQL backup file.
# Supports custom-format .dump files and legacy plain-SQL .sql files.
# Handles encrypted .gpg files when BACKUP_PASSPHRASE is set.
#
# Safety: this script never restores unless --confirm is present.
#
# Usage:
#   bash scripts/restore-backup.sh backups/chefflow-2026-04-24-030000.dump
#   bash scripts/restore-backup.sh backups/chefflow-2026-04-24-030000.dump --confirm
#   bash scripts/restore-backup.sh
#   bash scripts/restore-backup.sh --confirm
#
# WARNING: Restoring drops and recreates objects contained in the backup.
# Back up the current database before running with --confirm.
# ============================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups"

if [ -f "$PROJECT_ROOT/.env.local" ]; then
  set -a
  source "$PROJECT_ROOT/.env.local" 2>/dev/null || true
  set +a
fi

is_custom_dump() {
  [ "$(head -c 5 "$1" 2>/dev/null || true)" = "PGDMP" ]
}

CONFIRM=false
TARGET=""
EXPLICIT_TARGET=false
for arg in "$@"; do
  if [ "$arg" = "--confirm" ]; then
    CONFIRM=true
  elif [ -f "$arg" ]; then
    TARGET="$arg"
    EXPLICIT_TARGET=true
  fi
done

if [ -z "$TARGET" ]; then
  TARGET=$(ls -1t "$BACKUP_DIR"/chefflow-*.dump* "$BACKUP_DIR"/backup-*.sql* 2>/dev/null | head -1 || true)
fi

if [ -z "${TARGET:-}" ] || [ ! -f "$TARGET" ]; then
  echo "ERROR: No backup file found."
  echo ""
  echo "Usage:"
  echo "  bash scripts/restore-backup.sh <backup-file> [--confirm]"
  echo "  bash scripts/restore-backup.sh"
  echo ""
  echo "Available backups:"
  ls -1t "$BACKUP_DIR"/chefflow-*.dump* "$BACKUP_DIR"/backup-*.sql* 2>/dev/null | head -10 || echo "  (none)"
  exit 1
fi

if [ "$CONFIRM" = true ] && [ "$EXPLICIT_TARGET" = false ]; then
  echo "ERROR: --confirm requires an explicit backup file path."
  echo ""
  echo "Preview the latest backup first:"
  echo "  bash scripts/restore-backup.sh"
  echo ""
  echo "Then restore the exact file:"
  echo "  bash scripts/restore-backup.sh \"$TARGET\" --confirm"
  exit 1
fi

echo "============================================"
echo "  ChefFlow Database Restore"
echo "============================================"
echo ""
echo "  File: $(basename "$TARGET")"
echo "  Path: $TARGET"
echo "  Size: $(du -h "$TARGET" | cut -f1)"

TEMP_FILE=""
RESTORE_FILE="$TARGET"

if [[ "$TARGET" == *.gpg ]]; then
  if [ -z "${BACKUP_PASSPHRASE:-}" ]; then
    echo ""
    echo "  ERROR: Backup is encrypted but BACKUP_PASSPHRASE is not set."
    echo "  Set it in .env.local and try again."
    exit 1
  fi

  TEMP_FILE=$(mktemp)
  trap 'rm -f "$TEMP_FILE"' EXIT

  echo "  Encrypted: yes"
  echo "  Decrypting..."
  if ! echo "$BACKUP_PASSPHRASE" | gpg --batch --yes --passphrase-fd 0 -d "$TARGET" > "$TEMP_FILE" 2>/dev/null; then
    echo "  ERROR: Could not decrypt backup."
    exit 1
  fi
  RESTORE_FILE="$TEMP_FILE"
  echo "  Decrypted: OK"
else
  echo "  Encrypted: no"
fi

echo ""
IS_CUSTOM=false
if is_custom_dump "$RESTORE_FILE"; then
  IS_CUSTOM=true
  echo "  Format: custom (compressed)"
  if ! TABLE_LIST=$(docker exec -i chefflow_postgres pg_restore --list < "$RESTORE_FILE" 2>/dev/null); then
    echo "  ERROR: pg_restore --list could not read this backup."
    exit 1
  fi
  TABLE_COUNT=$(printf '%s\n' "$TABLE_LIST" | grep -c "TABLE" || true)
  INDEX_COUNT=$(printf '%s\n' "$TABLE_LIST" | grep -c "INDEX" || true)
  TOTAL_ENTRIES=$(printf '%s\n' "$TABLE_LIST" | wc -l | tr -d ' ')
  echo "  Tables: $TABLE_COUNT"
  echo "  Indexes: $INDEX_COUNT"
  echo "  Total entries: $TOTAL_ENTRIES"
elif head -5 "$RESTORE_FILE" | grep -q "PostgreSQL database dump"; then
  echo "  Format: plain SQL"
  TABLE_COUNT=$(grep -c "CREATE TABLE" "$RESTORE_FILE" || true)
  echo "  Tables: $TABLE_COUNT"
else
  echo "  ERROR: Backup is not a recognizable PostgreSQL dump."
  exit 1
fi

echo ""

if [ "$CONFIRM" = false ]; then
  echo "============================================"
  echo "  PREVIEW ONLY (no changes made)"
  echo "============================================"
  echo ""
  echo "  To execute the restore, run:"
  echo "  bash scripts/restore-backup.sh \"$TARGET\" --confirm"
  echo ""
  echo "  WARNING: Restoring will drop existing objects contained in the backup."
  echo "  Back up your current database first:"
  echo "  bash scripts/backup-db-automated.sh"
  exit 0
fi

echo "============================================"
echo "  RESTORING DATABASE"
echo "============================================"
echo ""
echo "  This will drop and recreate objects contained in the backup."
echo "  Container: chefflow_postgres"
echo ""

if [ "$IS_CUSTOM" = true ]; then
  echo "  Restoring from custom-format dump..."
  set +e
  RESTORE_OUTPUT=$(docker exec -i chefflow_postgres pg_restore \
    --clean --if-exists \
    --no-owner --no-privileges \
    -U postgres -d postgres \
    < "$RESTORE_FILE" 2>&1)
  RESTORE_STATUS=$?
  set -e

  printf '%s\n' "$RESTORE_OUTPUT" | tail -5
  if [ "$RESTORE_STATUS" -ne 0 ]; then
    echo ""
    echo "  ERROR: pg_restore failed with exit code $RESTORE_STATUS"
    exit "$RESTORE_STATUS"
  fi
else
  echo "  Restoring from SQL dump..."
  set +e
  RESTORE_OUTPUT=$(docker exec -i chefflow_postgres psql -U postgres postgres < "$RESTORE_FILE" 2>&1)
  RESTORE_STATUS=$?
  set -e

  printf '%s\n' "$RESTORE_OUTPUT" | tail -5
  if [ "$RESTORE_STATUS" -ne 0 ]; then
    echo ""
    echo "  ERROR: psql restore failed with exit code $RESTORE_STATUS"
    exit "$RESTORE_STATUS"
  fi
fi

ROW_CHECK=$(docker exec chefflow_postgres psql -U postgres -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null | tr -d ' ')

echo ""
echo "  Tables in database after restore: $ROW_CHECK"
echo ""
echo "============================================"
echo "  Restore complete"
echo "============================================"

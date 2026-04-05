#!/bin/bash
# ============================================
# ChefFlow Backup Verification
# ============================================
# Verify the most recent backup can be decrypted and has valid SQL.
#
# Usage:
#   bash scripts/verify-backup.sh
#
# Requires BACKUP_PASSPHRASE for encrypted backups.
# ============================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="$(cd "$SCRIPT_DIR/../backups" && pwd)"

# Load env vars
if [ -f "$SCRIPT_DIR/../.env.local" ]; then
  set -a
  source "$SCRIPT_DIR/../.env.local" 2>/dev/null || true
  set +a
fi

LATEST=$(ls -1t "$BACKUP_DIR"/backup-*.sql* 2>/dev/null | head -1)

if [ -z "$LATEST" ]; then
  echo "ERROR: No backups found in $BACKUP_DIR"
  exit 1
fi

echo "Verifying: $(basename "$LATEST")"

TEMP_FILE=""
if [[ "$LATEST" == *.gpg ]]; then
  if [ -z "${BACKUP_PASSPHRASE:-}" ]; then
    echo "ERROR: BACKUP_PASSPHRASE not set. Cannot decrypt."
    exit 1
  fi

  TEMP_FILE=$(mktemp)
  echo "$BACKUP_PASSPHRASE" | gpg --batch --yes --passphrase-fd 0 -d "$LATEST" > "$TEMP_FILE" 2>/dev/null
  VERIFY_FILE="$TEMP_FILE"
else
  VERIFY_FILE="$LATEST"
fi

# Check file has SQL content
if head -5 "$VERIFY_FILE" | grep -q "PostgreSQL database dump"; then
  SIZE=$(wc -c < "$VERIFY_FILE" | tr -d ' ')
  TABLES=$(grep -c "CREATE TABLE" "$VERIFY_FILE" || true)
  echo "VALID: $(basename "$LATEST") - ${SIZE} bytes, ${TABLES} tables"
else
  echo "INVALID: $(basename "$LATEST") - does not appear to be a PostgreSQL dump"
  [ -n "$TEMP_FILE" ] && rm -f "$TEMP_FILE"
  exit 1
fi

[ -n "$TEMP_FILE" ] && rm -f "$TEMP_FILE"
echo "Verification passed."

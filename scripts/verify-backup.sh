#!/bin/bash
# ============================================
# ChefFlow Backup Verification
# ============================================
# Verify that a backup can be decrypted and read as a PostgreSQL dump.
# Supports custom-format .dump files and legacy plain-SQL .sql files.
#
# Usage:
#   bash scripts/verify-backup.sh
#   bash scripts/verify-backup.sh backups/chefflow-2026-04-24-030000.dump
#
# Requires BACKUP_PASSPHRASE for encrypted .gpg backups.
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

verify_manifest() {
  local target="$1"
  local manifest="$target.manifest.json"

  if [ ! -f "$manifest" ]; then
    if [[ "$(basename "$target")" == chefflow-* ]]; then
      echo "  WARNING: No checksum manifest found for $(basename "$target")"
    fi
    return 0
  fi

  if ! BACKUP_VERIFY_TARGET="$target" BACKUP_VERIFY_MANIFEST="$manifest" node <<'NODE'
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const target = process.env.BACKUP_VERIFY_TARGET
const manifestPath = process.env.BACKUP_VERIFY_MANIFEST
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const file = fs.readFileSync(target)
const actualSize = file.length
const actualSha = crypto.createHash('sha256').update(file).digest('hex')
const expectedName = manifest.fileName
const actualName = path.basename(target)

const failures = []
if (expectedName && expectedName !== actualName) failures.push(`fileName ${expectedName} != ${actualName}`)
if (Number(manifest.sizeBytes) !== actualSize) failures.push(`size ${manifest.sizeBytes} != ${actualSize}`)
if (manifest.sha256 !== actualSha) failures.push('sha256 mismatch')

if (failures.length > 0) {
  console.error(`INVALID manifest: ${failures.join('; ')}`)
  process.exit(1)
}

console.log(`  Manifest: OK (${actualSha})`)
NODE
  then
    echo "INVALID: Checksum manifest failed for $(basename "$target")"
    exit 1
  fi
}

if [ -n "${1:-}" ] && [ -f "$1" ]; then
  TARGET="$1"
else
  TARGET=$(ls -1t "$BACKUP_DIR"/chefflow-*.dump* "$BACKUP_DIR"/backup-*.sql* 2>/dev/null | head -1 || true)
fi

if [ -z "${TARGET:-}" ]; then
  echo "ERROR: No backups found in $BACKUP_DIR"
  exit 1
fi

echo "Verifying: $(basename "$TARGET")"
echo "  Path: $TARGET"
echo "  Size: $(wc -c < "$TARGET" | tr -d ' ') bytes"
verify_manifest "$TARGET"

TEMP_FILE=""
VERIFY_FILE="$TARGET"

if [[ "$TARGET" == *.gpg ]]; then
  if [ -z "${BACKUP_PASSPHRASE:-}" ]; then
    echo "ERROR: BACKUP_PASSPHRASE not set. Cannot decrypt."
    exit 1
  fi

  TEMP_FILE=$(mktemp)
  trap 'rm -f "$TEMP_FILE"' EXIT

  echo "  Decrypting..."
  if ! echo "$BACKUP_PASSPHRASE" | gpg --batch --yes --passphrase-fd 0 -d "$TARGET" > "$TEMP_FILE" 2>/dev/null; then
    echo "INVALID: Could not decrypt $(basename "$TARGET")"
    exit 1
  fi
  VERIFY_FILE="$TEMP_FILE"
  echo "  Decrypted OK"
fi

if is_custom_dump "$VERIFY_FILE"; then
  echo "  Format: custom (compressed)"
  if ! TABLE_LIST=$(docker exec -i chefflow_postgres pg_restore --list < "$VERIFY_FILE" 2>/dev/null); then
    echo "INVALID: pg_restore --list could not read $(basename "$TARGET")"
    exit 1
  fi

  TABLE_COUNT=$(printf '%s\n' "$TABLE_LIST" | grep -c "TABLE" || true)
  TOTAL_ENTRIES=$(printf '%s\n' "$TABLE_LIST" | wc -l | tr -d ' ')
  if [ "$TABLE_COUNT" -lt 1 ]; then
    echo "INVALID: No table entries found in $(basename "$TARGET")"
    exit 1
  fi

  echo "  Tables: $TABLE_COUNT"
  echo "  Total entries: $TOTAL_ENTRIES"
  echo "VALID: $(basename "$TARGET") - $(wc -c < "$VERIFY_FILE" | tr -d ' ') bytes, ${TABLE_COUNT} table entries"
elif head -5 "$VERIFY_FILE" | grep -q "PostgreSQL database dump"; then
  echo "  Format: plain SQL"
  SIZE=$(wc -c < "$VERIFY_FILE" | tr -d ' ')
  TABLES=$(grep -c "CREATE TABLE" "$VERIFY_FILE" || true)
  if [ "$SIZE" -lt 1 ]; then
    echo "INVALID: $(basename "$TARGET") is empty"
    exit 1
  fi
  echo "VALID: $(basename "$TARGET") - ${SIZE} bytes, ${TABLES} tables"
else
  echo "INVALID: $(basename "$TARGET") is not a recognizable PostgreSQL dump"
  exit 1
fi

echo "Verification passed."

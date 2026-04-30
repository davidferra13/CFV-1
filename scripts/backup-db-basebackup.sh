#!/bin/bash
# ============================================
# ChefFlow PostgreSQL Physical Base Backup
# ============================================
# Creates an encrypted physical base backup for point-in-time recovery.
# Requires WAL archiving to be enabled in docker-compose.yml and a controlled
# PostgreSQL restart before PITR is fully available.
#
# Usage:
#   bash scripts/backup-db-basebackup.sh
# ============================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups"
BASEBACKUP_DIR="$BACKUP_DIR/basebackups"
TEXT_LOG="$BACKUP_DIR/basebackup.log"
TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)
CONTAINER_DIR="/tmp/chefflow-basebackup-${TIMESTAMP}"
CONTAINER_NAME="chefflow-basebackup-${TIMESTAMP}"
ARCHIVE_FILE="$BASEBACKUP_DIR/${CONTAINER_NAME}.tar.gz"
ENCRYPTED_FILE="$ARCHIVE_FILE.gpg"
MIN_BACKUP_SIZE=1000
KEEP_BASEBACKUPS=8

if [ -f "$PROJECT_ROOT/.env.local" ]; then
  set -a
  source "$PROJECT_ROOT/.env.local" 2>/dev/null || true
  set +a
fi

PASSPHRASE="${BACKUP_PASSPHRASE:-}"

log_text() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
  mkdir -p "$BACKUP_DIR"
  echo "$msg" >> "$TEXT_LOG"
  echo "$msg"
}

write_manifest() {
  local backup_path="$1"
  local manifest_path="${backup_path}.manifest.json"
  local final_size
  local git_commit
  local created_at

  final_size=$(wc -c < "$backup_path" | tr -d ' ')
  git_commit=$(git -C "$PROJECT_ROOT" rev-parse --short HEAD 2>/dev/null || echo "unknown")
  created_at="$(date -Iseconds 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S')"

  BACKUP_MANIFEST_PATH="$manifest_path" \
  BACKUP_FILE_PATH="$backup_path" \
  BACKUP_FILE_NAME="$(basename "$backup_path")" \
  BACKUP_CREATED_AT="$created_at" \
  BACKUP_SIZE_BYTES="$final_size" \
  BACKUP_GIT_COMMIT="$git_commit" \
    node <<'NODE'
const crypto = require('crypto')
const fs = require('fs')

const filePath = process.env.BACKUP_FILE_PATH
const manifestPath = process.env.BACKUP_MANIFEST_PATH
const file = fs.readFileSync(filePath)
const manifest = {
  version: 1,
  createdAt: process.env.BACKUP_CREATED_AT,
  fileName: process.env.BACKUP_FILE_NAME,
  sizeBytes: Number(process.env.BACKUP_SIZE_BYTES || '0'),
  sha256: crypto.createHash('sha256').update(file).digest('hex'),
  encrypted: true,
  gitCommit: process.env.BACKUP_GIT_COMMIT || 'unknown',
  format: 'postgres-physical-basebackup',
}

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
NODE
}

cleanup() {
  docker exec chefflow_postgres rm -rf "$CONTAINER_DIR" >/dev/null 2>&1 || true
  rm -f "$ARCHIVE_FILE"
}
trap cleanup EXIT

mkdir -p "$BASEBACKUP_DIR"

if [ -z "$PASSPHRASE" ]; then
  log_text "FAIL: BACKUP_PASSPHRASE is required for physical base backups"
  exit 1
fi

log_text "Starting physical base backup"

if ! docker exec chefflow_postgres pg_isready -U postgres >/dev/null 2>&1; then
  log_text "FAIL: chefflow_postgres is not ready"
  exit 1
fi

log_text "Running pg_basebackup inside chefflow_postgres"
docker exec chefflow_postgres rm -rf "$CONTAINER_DIR" >/dev/null 2>&1 || true
if ! docker exec chefflow_postgres pg_basebackup -U postgres -D "$CONTAINER_DIR" -Fp -Xs -P >> "$TEXT_LOG" 2>&1; then
  log_text "FAIL: pg_basebackup failed"
  exit 1
fi

log_text "Streaming base backup archive to host"
if ! docker exec chefflow_postgres tar -C /tmp -czf - "$CONTAINER_NAME" > "$ARCHIVE_FILE"; then
  log_text "FAIL: Could not archive base backup"
  exit 1
fi

ARCHIVE_SIZE=$(wc -c < "$ARCHIVE_FILE" | tr -d ' ')
if [ "$ARCHIVE_SIZE" -lt "$MIN_BACKUP_SIZE" ]; then
  log_text "FAIL: Physical base backup suspiciously small: ${ARCHIVE_SIZE} bytes"
  exit 1
fi

log_text "Encrypting physical base backup"
if ! echo "$PASSPHRASE" | gpg --batch --yes --passphrase-fd 0 --symmetric \
  --cipher-algo AES256 -o "$ENCRYPTED_FILE" "$ARCHIVE_FILE" 2>> "$TEXT_LOG"; then
  log_text "FAIL: Physical base backup encryption failed"
  exit 1
fi

ENCRYPTED_SIZE=$(wc -c < "$ENCRYPTED_FILE" | tr -d ' ')
if [ "$ENCRYPTED_SIZE" -lt "$MIN_BACKUP_SIZE" ]; then
  log_text "FAIL: Encrypted physical base backup suspiciously small: ${ENCRYPTED_SIZE} bytes"
  exit 1
fi

rm -f "$ARCHIVE_FILE"
write_manifest "$ENCRYPTED_FILE"

mapfile -t old_basebackups < <(ls -1t "$BASEBACKUP_DIR"/chefflow-basebackup-*.tar.gz.gpg 2>/dev/null | tail -n +$((KEEP_BASEBACKUPS + 1)) || true)
for old_file in "${old_basebackups[@]}"; do
  rm -f "$old_file" "$old_file.manifest.json"
  log_text "Pruned old physical base backup: $(basename "$old_file")"
done

log_text "Physical base backup complete: $(basename "$ENCRYPTED_FILE") (${ENCRYPTED_SIZE} bytes)"

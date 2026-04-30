#!/bin/bash
# ============================================
# ChefFlow Automated Database Backup
# ============================================
# Runs daily via Windows Task Scheduler or cron.
# Dumps in PostgreSQL custom format, verifies, encrypts when configured,
# prunes generated backups with tiered retention, and logs to backup-log.json.
#
# Prerequisites:
#   - gpg installed (comes with Git for Windows)
#   - BACKUP_PASSPHRASE env var set in .env.local for encrypted backups
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
TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)
DUMP_FILE="$BACKUP_DIR/chefflow-${TIMESTAMP}.dump"
ENCRYPTED_FILE="$DUMP_FILE.gpg"
MIN_BACKUP_SIZE=1000
LOG_FILE="$BACKUP_DIR/backup-log.json"
TEXT_LOG="$BACKUP_DIR/backup.log"
MAX_LOG_ENTRIES=500

# Retention policy for generated chefflow-*.dump backups.
DAILY_KEEP=30
WEEKLY_KEEP=12
MONTHLY_KEEP=6

# Load env vars for BACKUP_PASSPHRASE and CRON_SECRET.
if [ -f "$PROJECT_ROOT/.env.local" ]; then
  set -a
  source "$PROJECT_ROOT/.env.local" 2>/dev/null || true
  set +a
fi

PASSPHRASE="${BACKUP_PASSPHRASE:-}"
REQUIRE_ENCRYPTION="${REQUIRE_BACKUP_ENCRYPTION:-false}"
APP_BASE_URL="${BACKUP_APP_BASE_URL:-http://localhost:3300}"
APP_BASE_URL="${APP_BASE_URL%/}"

log_text() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
  echo "$msg" >> "$TEXT_LOG"
  echo "$msg"
}

json_escape() {
  printf '%s' "$1" | tr '\n\r' '  ' | sed 's/\\/\\\\/g; s/"/\\"/g'
}

log_json_fallback() {
  local status="$1"
  local size="${2:-0}"
  local encrypted="${3:-false}"
  local file="${4:-}"
  local error_msg="${5:-}"
  local remaining="${6:-0}"
  local timestamp
  local entry

  timestamp="$(date -Iseconds 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S')"
  entry=$(printf '{"timestamp":"%s","status":"%s","file":"%s","size":%s,"encrypted":%s,"remaining":%s,"error":"%s"}' \
    "$timestamp" \
    "$(json_escape "$status")" \
    "$(json_escape "$file")" \
    "$size" \
    "$encrypted" \
    "$remaining" \
    "$(json_escape "$error_msg")")

  echo "$entry" >> "$LOG_FILE"
}

log_json() {
  local status="$1"
  local size="${2:-0}"
  local encrypted="${3:-false}"
  local file="${4:-}"
  local error_msg="${5:-}"
  local remaining="${6:-0}"
  local timestamp

  timestamp="$(date -Iseconds 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S')"

  if command -v node >/dev/null 2>&1; then
    if ! BACKUP_LOG_PATH="$LOG_FILE" \
    BACKUP_LOG_MAX="$MAX_LOG_ENTRIES" \
    BACKUP_LOG_TIMESTAMP="$timestamp" \
    BACKUP_LOG_STATUS="$status" \
    BACKUP_LOG_FILE_NAME="$file" \
    BACKUP_LOG_SIZE="$size" \
    BACKUP_LOG_ENCRYPTED="$encrypted" \
    BACKUP_LOG_REMAINING="$remaining" \
    BACKUP_LOG_ERROR="$error_msg" \
      node <<'NODE'
const fs = require('fs')

const logPath = process.env.BACKUP_LOG_PATH
const maxEntries = Number(process.env.BACKUP_LOG_MAX || '500')
const entry = {
  timestamp: process.env.BACKUP_LOG_TIMESTAMP,
  status: process.env.BACKUP_LOG_STATUS || 'unknown',
  file: process.env.BACKUP_LOG_FILE_NAME || '',
  size: Number(process.env.BACKUP_LOG_SIZE || '0'),
  encrypted: process.env.BACKUP_LOG_ENCRYPTED === 'true',
  remaining: Number(process.env.BACKUP_LOG_REMAINING || '0'),
  error: process.env.BACKUP_LOG_ERROR || '',
}

let entries = []
if (fs.existsSync(logPath)) {
  const raw = fs.readFileSync(logPath, 'utf8').trim()
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      entries = Array.isArray(parsed) ? parsed : [parsed]
    } catch {
      entries = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          try {
            return JSON.parse(line)
          } catch {
            return null
          }
        })
        .filter(Boolean)
    }
  }
}

entries.push(entry)
fs.writeFileSync(logPath, `${JSON.stringify(entries.slice(-maxEntries), null, 2)}\n`)
NODE
    then
      log_json_fallback "$status" "$size" "$encrypted" "$file" "$error_msg" "$remaining"
    fi
  else
    log_json_fallback "$status" "$size" "$encrypted" "$file" "$error_msg" "$remaining"
  fi
}

write_manifest() {
  local backup_path="$1"
  local encrypted="$2"
  local raw_size="$3"
  local table_count="$4"
  local manifest_path="${backup_path}.manifest.json"
  local final_size
  local git_commit
  local created_at

  final_size=$(wc -c < "$backup_path" | tr -d ' ')
  git_commit=$(git -C "$PROJECT_ROOT" rev-parse --short HEAD 2>/dev/null || echo "unknown")
  created_at="$(date -Iseconds 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S')"

  if ! BACKUP_MANIFEST_PATH="$manifest_path" \
  BACKUP_FILE_PATH="$backup_path" \
  BACKUP_FILE_NAME="$(basename "$backup_path")" \
  BACKUP_CREATED_AT="$created_at" \
  BACKUP_SIZE_BYTES="$final_size" \
  BACKUP_RAW_SIZE_BYTES="$raw_size" \
  BACKUP_ENCRYPTED="$encrypted" \
  BACKUP_TABLE_COUNT="$table_count" \
  BACKUP_GIT_COMMIT="$git_commit" \
    node <<'NODE'
const crypto = require('crypto')
const fs = require('fs')

const filePath = process.env.BACKUP_FILE_PATH
const manifestPath = process.env.BACKUP_MANIFEST_PATH
const hash = crypto.createHash('sha256')
hash.update(fs.readFileSync(filePath))

const manifest = {
  version: 1,
  createdAt: process.env.BACKUP_CREATED_AT,
  fileName: process.env.BACKUP_FILE_NAME,
  sizeBytes: Number(process.env.BACKUP_SIZE_BYTES || '0'),
  sha256: hash.digest('hex'),
  encrypted: process.env.BACKUP_ENCRYPTED === 'true',
  rawDumpSizeBytes: Number(process.env.BACKUP_RAW_SIZE_BYTES || '0'),
  tableCount: Number(process.env.BACKUP_TABLE_COUNT || '0'),
  gitCommit: process.env.BACKUP_GIT_COMMIT || 'unknown',
  format: 'postgres-custom-dump',
}

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
NODE
  then
    alert_failure "Backup manifest generation failed"
    return 1
  fi

  log_text "Manifest written: $(basename "$manifest_path")"
}

alert_failure() {
  local message="$1"
  log_text "ALERT: $message"
  log_json "failure" "0" "false" "" "$message" "0"

  curl -s -X POST "$APP_BASE_URL/api/admin/backup-alert" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${CRON_SECRET:-}" \
    -d "{\"error\": \"$(json_escape "$message")\", \"timestamp\": \"$(date -Iseconds 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S')\"}" \
    >/dev/null 2>&1 || true
}

cleanup() {
  if [ -f "$ENCRYPTED_FILE" ] && [ -f "$DUMP_FILE" ]; then
    rm -f "$DUMP_FILE"
  fi
}
trap cleanup EXIT

apply_retention() {
  local -a all_backups=()
  local f
  local basename_f
  local date_part
  local day_num
  local dow
  local month_key
  local keep_this
  local daily_count=0
  local weekly_count=0
  local monthly_count=0

  mapfile -t all_backups < <(ls -1t "$BACKUP_DIR"/chefflow-*.dump* 2>/dev/null || true)
  [ "${#all_backups[@]}" -eq 0 ] && return

  declare -A keep_map=()
  declare -A daily_seen=()
  declare -A weekly_seen=()
  declare -A monthly_seen=()

  for f in "${all_backups[@]}"; do
    basename_f=$(basename "$f")
    if [[ ! "$basename_f" =~ ^chefflow-([0-9]{4}-[0-9]{2}-[0-9]{2})-[0-9]{6}\.dump(\.gpg)?$ ]]; then
      continue
    fi

    date_part="${BASH_REMATCH[1]}"
    day_num="${date_part:8:2}"
    month_key="${date_part:0:7}"
    dow=$(date -d "$date_part" +%u 2>/dev/null || date -j -f "%Y-%m-%d" "$date_part" +%u 2>/dev/null || echo "")
    keep_this=false

    if [ -z "${daily_seen[$date_part]:-}" ] && [ "$daily_count" -lt "$DAILY_KEEP" ]; then
      daily_seen["$date_part"]=1
      daily_count=$((daily_count + 1))
      keep_this=true
    fi

    if { [ "$dow" = "7" ] || [ "$dow" = "0" ]; } && [ -z "${weekly_seen[$date_part]:-}" ] && [ "$weekly_count" -lt "$WEEKLY_KEEP" ]; then
      weekly_seen["$date_part"]=1
      weekly_count=$((weekly_count + 1))
      keep_this=true
    fi

    if [ "$day_num" = "01" ] && [ -z "${monthly_seen[$month_key]:-}" ] && [ "$monthly_count" -lt "$MONTHLY_KEEP" ]; then
      monthly_seen["$month_key"]=1
      monthly_count=$((monthly_count + 1))
      keep_this=true
    fi

    if [ "$keep_this" = true ]; then
      keep_map["$f"]=1
    fi
  done

  for f in "${all_backups[@]}"; do
    if [ -z "${keep_map[$f]:-}" ]; then
      rm -f "$f"
      log_text "Pruned: $(basename "$f")"
    fi
  done
}

mkdir -p "$BACKUP_DIR"

if [ "$REQUIRE_ENCRYPTION" = "true" ] && [ -z "$PASSPHRASE" ]; then
  alert_failure "BACKUP_PASSPHRASE is required when REQUIRE_BACKUP_ENCRYPTION=true"
  exit 1
fi

if [ -f "$TEXT_LOG" ]; then
  text_size=$(wc -c < "$TEXT_LOG" 2>/dev/null | tr -d ' ')
  if [ "${text_size:-0}" -gt 1048576 ]; then
    tail -500 "$TEXT_LOG" > "$TEXT_LOG.tmp" && mv "$TEXT_LOG.tmp" "$TEXT_LOG"
  fi
fi

log_text "Starting automated backup"

log_text "Dumping database (custom format)..."
if ! docker exec chefflow_postgres pg_dump -U postgres --format=custom postgres > "$DUMP_FILE" 2>> "$TEXT_LOG"; then
  rm -f "$DUMP_FILE"
  alert_failure "pg_dump failed"
  exit 1
fi

if [ ! -f "$DUMP_FILE" ]; then
  alert_failure "pg_dump failed, no output file created"
  exit 1
fi

DUMP_SIZE=$(wc -c < "$DUMP_FILE" | tr -d ' ')
if [ "$DUMP_SIZE" -lt "$MIN_BACKUP_SIZE" ]; then
  rm -f "$DUMP_FILE"
  alert_failure "Backup suspiciously small: ${DUMP_SIZE} bytes (min: ${MIN_BACKUP_SIZE})"
  exit 1
fi

log_text "Dump complete: ${DUMP_SIZE} bytes"

log_text "Verifying dump integrity..."
if ! RESTORE_LIST=$(docker exec -i chefflow_postgres pg_restore --list < "$DUMP_FILE" 2>> "$TEXT_LOG"); then
  rm -f "$DUMP_FILE"
  alert_failure "Dump verification failed: pg_restore --list could not read the dump"
  exit 1
fi

TABLE_COUNT=$(printf '%s\n' "$RESTORE_LIST" | grep -c "TABLE" || true)
if [ "$TABLE_COUNT" -lt 1 ]; then
  rm -f "$DUMP_FILE"
  alert_failure "Dump verification failed: no table entries found"
  exit 1
fi

log_text "Verified: ${TABLE_COUNT} table entries in dump"

IS_ENCRYPTED=false
FINAL_PATH="$DUMP_FILE"
if [ -n "$PASSPHRASE" ]; then
  log_text "Encrypting backup..."
  if ! echo "$PASSPHRASE" | gpg --batch --yes --passphrase-fd 0 --symmetric \
    --cipher-algo AES256 -o "$ENCRYPTED_FILE" "$DUMP_FILE" 2>> "$TEXT_LOG"; then
    alert_failure "Encryption failed"
    exit 1
  fi

  if [ ! -f "$ENCRYPTED_FILE" ]; then
    alert_failure "Encryption failed, gpg produced no output"
    exit 1
  fi

  ENCRYPTED_SIZE=$(wc -c < "$ENCRYPTED_FILE" | tr -d ' ')
  if [ "$ENCRYPTED_SIZE" -lt "$MIN_BACKUP_SIZE" ]; then
    rm -f "$ENCRYPTED_FILE"
    alert_failure "Encrypted backup suspiciously small: ${ENCRYPTED_SIZE} bytes"
    exit 1
  fi

  log_text "Encrypted: ${ENCRYPTED_SIZE} bytes -> $(basename "$ENCRYPTED_FILE")"
  rm -f "$DUMP_FILE"
  IS_ENCRYPTED=true
  FINAL_PATH="$ENCRYPTED_FILE"
else
  log_text "WARNING: BACKUP_PASSPHRASE not set. Backup saved unencrypted."
fi

log_text "Applying tiered retention (${DAILY_KEEP} daily, ${WEEKLY_KEEP} weekly, ${MONTHLY_KEEP} monthly)..."
apply_retention

REMAINING=$(ls -1 "$BACKUP_DIR"/chefflow-*.dump* 2>/dev/null | wc -l | tr -d ' ')
log_text "Generated backups on disk: ${REMAINING}"

write_manifest "$FINAL_PATH" "$IS_ENCRYPTED" "$DUMP_SIZE" "${TABLE_COUNT:-0}"

curl -s -X POST "$APP_BASE_URL/api/cron/backup-heartbeat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CRON_SECRET:-}" \
  -d "{\"status\": \"success\", \"size\": ${DUMP_SIZE}, \"encrypted\": ${IS_ENCRYPTED}, \"remaining\": ${REMAINING}, \"tables\": ${TABLE_COUNT:-0}}" \
  >/dev/null 2>&1 || log_text "WARNING: Could not record heartbeat (app may be offline)"

FINAL_FILE="$(basename "$FINAL_PATH")"
log_json "success" "$DUMP_SIZE" "$IS_ENCRYPTED" "$FINAL_FILE" "" "$REMAINING"

log_text "Backup complete"

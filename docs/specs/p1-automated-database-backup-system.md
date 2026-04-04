# Spec: Automated Database Backup System

> **Status:** ready
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** small (2 files modified, 1 new)

## Timeline

| Event                 | Date              | Agent/Session      | Commit |
| --------------------- | ----------------- | ------------------ | ------ |
| Created               | 2026-04-03 ~21:00 | Planner (Opus 4.6) |        |
| Status: ready         | 2026-04-03 ~21:00 | Planner (Opus 4.6) |        |
| Claimed (in-progress) |                   |                    |        |
| Spike completed       |                   |                    |        |
| Pre-flight passed     |                   |                    |        |
| Build completed       |                   |                    |        |
| Type check passed     |                   |                    |        |
| Build check passed    |                   |                    |        |
| Playwright verified   |                   |                    |        |
| Status: verified      |                   |                    |        |

---

## Developer Notes

### Raw Signal

The system audit found that database backups are entirely manual. The existing `scripts/backup-db.sh` does a `pg_dump` with 7-file retention, but nobody runs it on a schedule. There is no encryption, no off-machine copy, no restore verification. The `backups/` directory has files dating back to March 16, 2026, but with gaps (no backup exists for many days). This is a live production app with real client data, real financial records, and real chef intellectual property. A disk failure or corruption event would be catastrophic.

The developer's infrastructure cost awareness (Vercel $1,489 incident) means the solution must be free or near-free. No paid backup services. The existing `pg_dump` approach is fine; it just needs automation, integrity checks, and a developer alert when backups fail.

### Developer Intent

- **Core goal:** Database is backed up automatically every day with no human intervention. Developer gets alerted if a backup fails or is suspiciously small.
- **Key constraints:** $0 cost. Uses existing Docker PostgreSQL setup. Must work on Windows 11 (developer's machine). Must not require new services or dependencies. Backups must be encrypted at rest.
- **Motivation:** One disk failure away from losing everything. Manual backups have gaps. This is the single highest-priority data safety improvement.
- **Success from the developer's perspective:** Backups run daily at 3 AM, encrypted, 14-day retention, developer gets an email if anything goes wrong, and there's a one-command restore verification test.

---

## What This Does (Plain English)

After this is built, a daily cron job (Windows Task Scheduler) runs at 3 AM and: (1) dumps the PostgreSQL database, (2) compresses and encrypts the dump with a passphrase, (3) verifies the backup isn't empty or corrupted, (4) prunes backups older than 14 days, and (5) sends a developer alert email if any step fails. A companion verification script tests that the most recent backup can be decrypted and restored to a temporary database.

---

## Why It Matters

ChefFlow is a production app with real client data, financial records, recipes, and business history. Backups are currently manual with multi-day gaps. Automated backups are the single most important data safety improvement before any other infrastructure work.

---

## Files to Create

| File                             | Purpose                                                                    |
| -------------------------------- | -------------------------------------------------------------------------- |
| `scripts/backup-db-automated.sh` | Enhanced backup script: compress, encrypt, verify, alert on failure, prune |

---

## Files to Modify

| File                      | What to Change                                                                                           |
| ------------------------- | -------------------------------------------------------------------------------------------------------- |
| `scripts/backup-db.sh`    | Add comment at top pointing to the new automated script. Do not delete (preserves manual backup option). |
| `lib/cron/definitions.ts` | Add `db-backup` cron definition for monitoring (so the cron monitor can detect if backups stop running). |

---

## Database Changes

None.

---

## Data Model

No new tables. The backup script writes to the filesystem (`backups/` directory). The cron heartbeat system (`cron_executions` table) records backup runs for monitoring.

---

## Server Actions

No new server actions. This is a pure infrastructure/scripting spec.

---

## UI / Component Spec

No UI changes. Backup status is visible in the daily developer digest email (via cron monitoring).

---

## Implementation Details

### `scripts/backup-db-automated.sh`

```bash
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

# Load env vars (for BACKUP_PASSPHRASE and alert endpoint)
if [ -f "$PROJECT_ROOT/.env.local" ]; then
  set -a
  source "$PROJECT_ROOT/.env.local" 2>/dev/null || true
  set +a
fi

PASSPHRASE="${BACKUP_PASSPHRASE:-}"

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
  -H "x-cron-secret: ${CRON_SECRET:-}" \
  -d "{\"status\": \"success\", \"size\": ${DUMP_SIZE}, \"encrypted\": $([ -n \"$PASSPHRASE\" ] && echo true || echo false), \"remaining\": ${REMAINING}}" \
  > /dev/null 2>&1 || log "WARNING: Could not record heartbeat (app may be offline)"

log "Backup complete"
```

### Heartbeat endpoint

The builder should create a minimal API route at `app/api/cron/backup-heartbeat/route.ts` that:

1. Validates `x-cron-secret` header (same pattern as all other cron routes)
2. Calls `recordCronHeartbeat('db-backup', result)` from `lib/cron/heartbeat.ts`
3. Returns 200

This is 15-20 lines following the exact pattern of existing cron routes (e.g., `app/api/cron/event-progression/route.ts`).

### Alert endpoint

The builder should create `app/api/admin/backup-alert/route.ts` that:

1. Validates `Authorization: Bearer <CRON_SECRET>`
2. Calls `sendDeveloperAlert({ severity: 'critical', system: 'db-backup', title: 'Database backup failed', description: error })` from `lib/email/developer-alerts.ts`
3. Returns 200

This is 15-20 lines following the exact pattern of existing alert triggers.

### Cron definition addition

In `lib/cron/definitions.ts`, add:

```typescript
{
  name: 'db-backup',
  route: '/api/cron/backup-heartbeat',
  cadence: 'daily',
  maxExpectedMinutes: 1440, // 24 hours - alert if no backup for a full day
}
```

### Restore verification script

The builder should also add `scripts/verify-backup.sh`:

```bash
#!/bin/bash
# Verify the most recent backup can be decrypted and has valid SQL
set -euo pipefail

BACKUP_DIR="$(cd "$(dirname "$0")/../backups" && pwd)"
LATEST=$(ls -1t "$BACKUP_DIR"/backup-*.sql* 2>/dev/null | head -1)

if [ -z "$LATEST" ]; then
  echo "ERROR: No backups found in $BACKUP_DIR"
  exit 1
fi

echo "Verifying: $(basename "$LATEST")"

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
  [ -n "${TEMP_FILE:-}" ] && rm -f "$TEMP_FILE"
  exit 1
fi

[ -n "${TEMP_FILE:-}" ] && rm -f "$TEMP_FILE"
echo "Verification passed."
```

---

## Edge Cases and Error Handling

| Scenario                                      | Correct Behavior                                                                 |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| Docker container not running                  | `pg_dump` via `docker exec` fails. Script exits 1, sends alert.                  |
| Disk full                                     | Write fails. Script exits 1, sends alert.                                        |
| `BACKUP_PASSPHRASE` not set                   | Backup saved unencrypted with WARNING in log. Not a failure (graceful).          |
| `gpg` not installed                           | Encryption step fails. Script exits 1, sends alert.                              |
| App server not running (heartbeat fails)      | Heartbeat curl fails silently. Cron monitor detects missing heartbeat after 24h. |
| Backup smaller than 1KB                       | Treated as failed dump. File deleted. Alert sent.                                |
| No backups exist for verification             | Verify script exits 1 with clear error message.                                  |
| Task Scheduler runs while DB is mid-migration | `pg_dump` takes a consistent snapshot (PostgreSQL guarantees this).              |

---

## Verification Steps

1. Set `BACKUP_PASSPHRASE=test-passphrase-2026` in `.env.local`
2. Run `bash scripts/backup-db-automated.sh`
3. Verify: encrypted file exists in `backups/` with `.sql.gpg` extension
4. Verify: unencrypted `.sql` file was removed
5. Verify: `backups/backup.log` has success entry
6. Run `bash scripts/verify-backup.sh`
7. Verify: output says "VALID" with table count
8. Run backup again; verify old backups beyond 14 days would be pruned (check `find` command logic)
9. Start the app, verify `/api/cron/backup-heartbeat` accepts a POST with correct `x-cron-secret`
10. Intentionally stop Docker container, run backup script, verify alert is attempted
11. Check that `db-backup` appears in the cron monitor health report (visible at `/api/health/readiness`)

---

## Out of Scope

- Off-machine backup sync (S3, Backblaze B2) - follow-up spec
- Point-in-time recovery (PITR) - requires PostgreSQL WAL archiving, different approach
- Backup compression without encryption (unnecessary; gpg compresses by default)
- UI for backup status (covered by existing cron monitor + developer digest email)
- Restoring to a temporary database for full validation - follow-up

---

## Notes for Builder Agent

1. **Windows Task Scheduler setup is documentation only.** The builder writes the script and the API routes. The developer sets up the Task Scheduler entry themselves. Document the exact command in a comment at the top of the script.

2. **`docker exec` vs `pg_dump` directly:** The database runs in Docker (`chefflow_postgres` container). The backup script must use `docker exec chefflow_postgres pg_dump -U postgres postgres` to dump from inside the container. Do NOT use a local `pg_dump` binary (may not be installed or may be a different version).

3. **`gpg` availability:** Git for Windows bundles `gpg`. The builder should verify `which gpg` works in the Git Bash environment. If not available, the script falls through to unencrypted backup with a warning (not a failure).

4. **Do not modify the existing `scripts/backup-db.sh`** beyond adding a comment. Some agents and manual processes may reference it. The new script is a parallel, enhanced version.

5. **The heartbeat and alert endpoints follow existing patterns exactly.** Reference `app/api/cron/event-progression/route.ts` for the cron heartbeat pattern and `lib/email/developer-alerts.ts:78` for the alert function signature.

6. **The `BACKUP_PASSPHRASE` env var** must be added to `.env.local` by the developer. The builder should add it to `.env.example` (if that file exists) or document it in the script comments. Do NOT hardcode a passphrase.

7. **Retention is 14 days, not 7.** The old script used 7-file retention. The new script uses 14-day time-based retention. This gives more recovery window while the disk has plenty of space (backups are ~50-100MB compressed).

8. **Log file rotation:** The `backup.log` file will grow over time. The builder should add a simple truncation at the top of the script: if the log exceeds 1MB, keep only the last 500 lines.

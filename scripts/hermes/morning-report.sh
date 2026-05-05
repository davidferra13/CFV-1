#!/bin/bash
# Hermes Job 6: Morning Briefing Compiler
# Runs daily at 5:30 AM. Compiles all overnight data into one report.
# Output: docs/hermes/morning-report.md (read by session-briefing.sh)

CHEFFLOW="/mnt/c/Users/david/Documents/CFv1"
HERMES_DIR="$CHEFFLOW/docs/hermes"
OUTPUT="$HERMES_DIR/morning-report.md"
TODAY=$(date +"%Y-%m-%d")
NOW=$(date +"%Y-%m-%d %H:%M")

mkdir -p "$HERMES_DIR"

# ── Health Pulse Summary ──────────────────────────────────────
HEALTH_FILE="$HERMES_DIR/health-pulse.jsonl"
HEALTH_SUMMARY="No health data collected."
if [ -f "$HEALTH_FILE" ]; then
  TOTAL_CHECKS=$(wc -l < "$HEALTH_FILE" | tr -d ' ')
  # Checks from last 24h
  YESTERDAY=$(date -d "24 hours ago" -u +"%Y-%m-%dT" 2>/dev/null || date -u +"%Y-%m-%dT")
  RECENT_CHECKS=$(grep "$TODAY\|$YESTERDAY" "$HEALTH_FILE" 2>/dev/null | wc -l | tr -d ' ')
  OK_CHECKS=$(grep "$TODAY\|$YESTERDAY" "$HEALTH_FILE" 2>/dev/null | grep '"all_ok":true' | wc -l | tr -d ' ')
  FAIL_CHECKS=$((RECENT_CHECKS - OK_CHECKS))
  SERVER_DOWN=$(grep "$TODAY\|$YESTERDAY" "$HEALTH_FILE" 2>/dev/null | grep '"server_running":false' | wc -l | tr -d ' ')

  HEALTH_SUMMARY="$RECENT_CHECKS checks in last 24h, $OK_CHECKS OK, $FAIL_CHECKS failures, $SERVER_DOWN server-down"
fi

# ── OpenClaw Summary ──────────────────────────────────────────
OC_FILE="$HERMES_DIR/openclaw-freshness.jsonl"
OC_SUMMARY="No OpenClaw data collected."
if [ -f "$OC_FILE" ]; then
  LATEST_OC=$(tail -1 "$OC_FILE")
  if [ -n "$LATEST_OC" ] && echo "$LATEST_OC" | jq . >/dev/null 2>&1; then
    PI_ALIVE=$(echo "$LATEST_OC" | jq -r '.pi_alive // "unknown"')
    PRICE_COUNT=$(echo "$LATEST_OC" | jq -r '.price_count // 0')
    SYNC_AGE=$(echo "$LATEST_OC" | jq -r '.sync_age_hours // "?"')
    STALE=$(echo "$LATEST_OC" | jq -r '.stale // "unknown"')
    OC_SUMMARY="Pi alive: $PI_ALIVE | Prices: $PRICE_COUNT | Last sync: ${SYNC_AGE}h ago | Stale: $STALE"
  fi
fi

# ── Git Changelog Summary ────────────────────────────────────
GIT_FILE="$HERMES_DIR/git-changelog.md"
GIT_SUMMARY="No git changelog data."
if [ -f "$GIT_FILE" ]; then
  # Count entries from today
  cd "$CHEFFLOW" 2>/dev/null
  BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
  TOTAL_COMMITS_24H=$(git log --oneline --since="24 hours ago" 2>/dev/null | wc -l | tr -d ' ')
  UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  UNPUSHED=$(git log "origin/$BRANCH..HEAD" --oneline 2>/dev/null | wc -l | tr -d ' ')
  RECENT_COMMITS=$(git log --oneline --since="24 hours ago" -10 2>/dev/null)

  GIT_SUMMARY="Branch: \`$BRANCH\` | Commits (24h): $TOTAL_COMMITS_24H | Uncommitted: $UNCOMMITTED | Unpushed: $UNPUSHED"
  if [ -n "$RECENT_COMMITS" ]; then
    GIT_SUMMARY="$GIT_SUMMARY

\`\`\`
$RECENT_COMMITS
\`\`\`"
  fi
fi

# ── Build State Summary ──────────────────────────────────────
BUILD_FILE="$HERMES_DIR/build-state-check.md"
BUILD_SUMMARY="No build check data."
if [ -f "$BUILD_FILE" ]; then
  BUILD_RESULT=$(grep "Result:" "$BUILD_FILE" | head -1 | sed 's/.*\*\* //')
  BUILD_ERRORS=$(grep "Errors:" "$BUILD_FILE" | head -1 | sed 's/.*\*\* //')
  BUILD_TIME=$(grep "Last check:" "$BUILD_FILE" | head -1 | sed 's/.*\*\* //')
  BUILD_SUMMARY="Result: $BUILD_RESULT | Errors: $BUILD_ERRORS | Checked: $BUILD_TIME"
fi

# ── Backup Summary ────────────────────────────────────────────
BACKUP_FILE="$HERMES_DIR/backup-watchdog.jsonl"
BACKUP_SUMMARY="No backup check data."
if [ -f "$BACKUP_FILE" ]; then
  LATEST_BACKUP=$(tail -1 "$BACKUP_FILE")
  if [ -n "$LATEST_BACKUP" ] && echo "$LATEST_BACKUP" | jq . >/dev/null 2>&1; then
    BK_NAME=$(echo "$LATEST_BACKUP" | jq -r '.latest // "none"')
    BK_AGE=$(echo "$LATEST_BACKUP" | jq -r '.age_hours // "?"')
    BK_COUNT=$(echo "$LATEST_BACKUP" | jq -r '.count // "?"')
    BK_STATUS=$(echo "$LATEST_BACKUP" | jq -r '.status // "unknown"')
    BACKUP_SUMMARY="Latest: $BK_NAME (${BK_AGE}h ago) | Count: $BK_COUNT | Status: $BK_STATUS"
  fi
fi

# ── Database Summary ──────────────────────────────────────────
DB_FILE="$HERMES_DIR/db-health.jsonl"
DB_SUMMARY="No database health data."
if [ -f "$DB_FILE" ] && [ -s "$DB_FILE" ]; then
  LATEST_DB=$(tail -1 "$DB_FILE")
  if [ -n "$LATEST_DB" ] && echo "$LATEST_DB" | jq . >/dev/null 2>&1; then
    PG_ALIVE=$(echo "$LATEST_DB" | jq -r '.pg_alive // false')
    DB_SIZE=$(echo "$LATEST_DB" | jq -r '.db_size // "?"')
    DB_TABLES=$(echo "$LATEST_DB" | jq -r '.tables // 0')
    DB_EVENTS=$(echo "$LATEST_DB" | jq -r '.rows.events // 0')
    DB_USERS=$(echo "$LATEST_DB" | jq -r '.rows.users // 0')
    DB_RECIPES=$(echo "$LATEST_DB" | jq -r '.rows.recipes // 0')
    DB_MSGS=$(echo "$LATEST_DB" | jq -r '.rows.messages // 0')
    DB_CONN=$(echo "$LATEST_DB" | jq -r '.connections.total // 0')
    DB_DEAD=$(echo "$LATEST_DB" | jq -r '.dead_tuples // 0')
    DB_SUMMARY="PG alive: $PG_ALIVE | Size: $DB_SIZE | Tables: $DB_TABLES | Events: $DB_EVENTS | Users: $DB_USERS | Recipes: $DB_RECIPES | Messages: $DB_MSGS | Connections: $DB_CONN | Dead tuples: $DB_DEAD"
  fi
fi

# ── Disk & Resources Summary ─────────────────────────────────
DISK_FILE="$HERMES_DIR/disk-resources.jsonl"
DISK_SUMMARY="No disk data."
if [ -f "$DISK_FILE" ] && [ -s "$DISK_FILE" ]; then
  LATEST_DISK=$(tail -1 "$DISK_FILE")
  if [ -n "$LATEST_DISK" ] && echo "$LATEST_DISK" | jq . >/dev/null 2>&1; then
    DISK_PCT=$(echo "$LATEST_DISK" | jq -r '.disk.used_pct // "?"')
    TS_FILES=$(echo "$LATEST_DISK" | jq -r '.files.ts_tsx_total // "?"')
    UNCOMMITTED=$(echo "$LATEST_DISK" | jq -r '.files.uncommitted // "?"')
    DISK_SUMMARY="C: drive ${DISK_PCT}% used | TS/TSX files: $TS_FILES | Uncommitted: $UNCOMMITTED"
  fi
fi

# ── Error Scan Summary ───────────────────────────────────────
ERROR_FILE="$HERMES_DIR/error-scan.md"
ERROR_SUMMARY="No error scan data."
if [ -f "$ERROR_FILE" ]; then
  TSNOCHECK=$(grep "ts-nocheck" "$ERROR_FILE" | head -1)
  ERROR_SUMMARY="$TSNOCHECK"
  LARGE_FILES=$(grep -A1 "Large Uncommitted" "$ERROR_FILE" | tail -1)
  if [ -n "$LARGE_FILES" ] && [ "$LARGE_FILES" != "None." ]; then
    ERROR_SUMMARY="$ERROR_SUMMARY | Large files: $LARGE_FILES"
  fi
fi

# ── Alerts ────────────────────────────────────────────────────
ALERTS_FILE="$HERMES_DIR/ALERTS.md"
ALERT_SECTION="None."
if [ -f "$ALERTS_FILE" ]; then
  # Get alerts from last 24h (lines starting with - **)
  RECENT_ALERTS=$(grep "$TODAY" "$ALERTS_FILE" 2>/dev/null | tail -10)
  if [ -n "$RECENT_ALERTS" ]; then
    ALERT_SECTION="$RECENT_ALERTS"
  fi
fi

# ── Write Report ──────────────────────────────────────────────
cat > "$OUTPUT" << EOF
# Hermes Morning Report: $TODAY

**Compiled:** $NOW

## Health Pulse (last 24h)
$HEALTH_SUMMARY

## OpenClaw
$OC_SUMMARY

## Git Activity (last 24h)
$GIT_SUMMARY

## Build State
$BUILD_SUMMARY

## Backups
$BACKUP_SUMMARY

## Database
$DB_SUMMARY

## Disk & Resources
$DISK_SUMMARY

## Error Scan
$ERROR_SUMMARY

## Alerts (last 24h)
$ALERT_SECTION

---
*Generated by Hermes Night Shift (10 jobs). health-pulse (15m), openclaw (2h), db-health (2h), git-changelog (4h), disk-resources (4h), error-scanner (1h), build-state (6h), backup-watchdog (12h), morning-report (daily), weekly-digest (Sunday).*
EOF

echo "[$(date)] Morning report written to $OUTPUT"

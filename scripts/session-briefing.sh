#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# ChefFlow Session Briefing Generator
# ═══════════════════════════════════════════════════════════════════
# Compresses 6+ startup files into a single ~500-word briefing.
# Claude reads 1 file instead of 6. Saves ~15,000 tokens per session.
#
# Usage:  bash scripts/session-briefing.sh
# Output: docs/.session-briefing.md (gitignored, regenerated each session)
#
# Replaces manual reading of:
#   - docs/product-blueprint.md
#   - docs/build-state.md
#   - docs/session-log.md (last entry only)
#   - docs/session-digests/ (last 3)
#   - git status + recent commits
# ═══════════════════════════════════════════════════════════════════

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

OUTPUT="$PROJECT_ROOT/docs/.session-briefing.md"

# ── Git State ────────────────────────────────────────────────────

BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
LAST_COMMIT=$(git log -1 --oneline 2>/dev/null || echo "no commits")
UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
LAST_PUSH=$(git log origin/$BRANCH..HEAD --oneline 2>/dev/null | wc -l | tr -d ' ')

# ── Build State ──────────────────────────────────────────────────

BUILD_STATE_FILE="$PROJECT_ROOT/docs/build-state.md"
if [ -f "$BUILD_STATE_FILE" ]; then
  # Extract the status line (usually first non-header line with green/broken)
  BUILD_STATUS=$(grep -i 'status\|state\|green\|broken\|clean\|error' "$BUILD_STATE_FILE" | head -3)
else
  BUILD_STATUS="No build-state.md found"
fi

# ── Last Session Log Entry ───────────────────────────────────────

SESSION_LOG="$PROJECT_ROOT/docs/session-log.md"
if [ -f "$SESSION_LOG" ]; then
  # Get last ## entry (most recent session)
  LAST_SESSION=$(awk '/^## /{found=1; content=""} found{content=content"\n"$0} END{print content}' "$SESSION_LOG" | tail -20)
else
  LAST_SESSION="No session-log.md found"
fi

# ── Last 3 Digest Summaries ─────────────────────────────────────

DIGEST_DIR="$PROJECT_ROOT/docs/session-digests"
DIGEST_SUMMARIES=""
if [ -d "$DIGEST_DIR" ]; then
  # Get 3 most recent digest files
  RECENT_DIGESTS=$(ls -t "$DIGEST_DIR"/*.md 2>/dev/null | head -3)
  for digest in $RECENT_DIGESTS; do
    FILENAME=$(basename "$digest")
    # Extract first line (title) and "What Was Done" section summary
    TITLE=$(head -1 "$digest" | sed 's/^# //')
    # Get first 2 lines after "## What Was Done" or "## What Happened"
    SUMMARY=$(awk '/^## What (Was Done|Happened)/{found=1; next} found && NF{print; count++; if(count>=2) exit}' "$digest")
    DIGEST_SUMMARIES="$DIGEST_SUMMARIES- **$FILENAME**: $TITLE
  $SUMMARY
"
  done
else
  DIGEST_SUMMARIES="No session-digests/ directory found"
fi

# ── Blueprint Progress ───────────────────────────────────────────

BLUEPRINT="$PROJECT_ROOT/docs/product-blueprint.md"
if [ -f "$BLUEPRINT" ]; then
  # Extract progress percentages and key status lines
  PROGRESS=$(grep -E '^\|.*%|Progress|Complete|Build|Validation|Launch' "$BLUEPRINT" | head -8)
  PRIORITIES=$(grep -E '^\- \[[ x]\]|^### (Next|Current|Active|Priority)' "$BLUEPRINT" | head -6)
else
  PROGRESS="No product-blueprint.md found"
  PRIORITIES=""
fi

# Backup Status

BACKUP_STATUS=""
if [ -d "$PROJECT_ROOT/backups" ]; then
  LATEST_BACKUP=$(ls -1t "$PROJECT_ROOT/backups"/chefflow-*.dump* "$PROJECT_ROOT/backups"/backup-*.sql* 2>/dev/null | head -1 || true)
  BACKUP_COUNT=$(ls -1 "$PROJECT_ROOT/backups"/chefflow-*.dump* "$PROJECT_ROOT/backups"/backup-*.sql* 2>/dev/null | wc -l | tr -d ' ')
  BACKUP_TOTAL_SIZE=$(du -sh "$PROJECT_ROOT/backups" 2>/dev/null | cut -f1 || echo "?")
  BACKUP_LOG="$PROJECT_ROOT/backups/backup-log.json"
  LAST_BACKUP_SUCCESS=""

  if [ -f "$BACKUP_LOG" ] && command -v node >/dev/null 2>&1; then
    LAST_BACKUP_SUCCESS=$(BACKUP_LOG_PATH="$BACKUP_LOG" node <<'NODE'
const fs = require('fs')
const raw = fs.readFileSync(process.env.BACKUP_LOG_PATH, 'utf8').trim()
let entries = []

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

const success = [...entries].reverse().find((entry) => entry && entry.status === 'success')
process.stdout.write(success && success.timestamp ? success.timestamp : '')
NODE
)
  fi

  if [ -n "$LATEST_BACKUP" ]; then
    LATEST_BACKUP_NAME=$(basename "$LATEST_BACKUP")
    LATEST_BACKUP_DATE=$(stat -c '%Y' "$LATEST_BACKUP" 2>/dev/null || stat -f '%m' "$LATEST_BACKUP" 2>/dev/null || echo "0")
    NOW_EPOCH=$(date +%s)
    if [ "$LATEST_BACKUP_DATE" != "0" ]; then
      HOURS_AGO=$(( (NOW_EPOCH - LATEST_BACKUP_DATE) / 3600 ))
      BACKUP_STATUS="Last success: ${LAST_BACKUP_SUCCESS:-unknown} | Latest file: $LATEST_BACKUP_NAME (${HOURS_AGO}h ago) | Count: $BACKUP_COUNT | Total size: $BACKUP_TOTAL_SIZE"
    else
      BACKUP_STATUS="Last success: ${LAST_BACKUP_SUCCESS:-unknown} | Latest file: $LATEST_BACKUP_NAME | Count: $BACKUP_COUNT | Total size: $BACKUP_TOTAL_SIZE"
    fi
  else
    BACKUP_STATUS="WARNING: No backups found!"
  fi
else
  BACKUP_STATUS="WARNING: backups/ directory does not exist!"
fi

# ── Active Specs Count ───────────────────────────────────────────

SPEC_COUNT=$(ls "$PROJECT_ROOT/docs/specs/"*interrogation*.md 2>/dev/null | wc -l | tr -d ' ')
TOTAL_QUESTIONS=$(grep -c '^### [A-Z]' "$PROJECT_ROOT/docs/specs/"*interrogation*.md 2>/dev/null | awk -F: '{s+=$NF} END{print s}' || echo "?")

# ── Generate Briefing ────────────────────────────────────────────

cat > "$OUTPUT" << BRIEFING
# Session Briefing (auto-generated)
**Generated:** $(date '+%Y-%m-%d %H:%M')
**This file replaces reading 6+ startup files. Read ONLY this.**

## Git State
- Branch: \`$BRANCH\`
- Last commit: \`$LAST_COMMIT\`
- Uncommitted files: $UNCOMMITTED
- Unpushed commits: $LAST_PUSH

## Build State
$BUILD_STATUS

## Last Session
$LAST_SESSION

## Recent Digests (last 3)
$DIGEST_SUMMARIES

## Blueprint Progress
$PROGRESS

## Active Priorities
$PRIORITIES

## Database Backups
$BACKUP_STATUS

## Interrogation Specs
- $SPEC_COUNT specs, ~$TOTAL_QUESTIONS questions total

---
*Read the full files only if this briefing raises a specific concern.*
BRIEFING

# Word count
WC=$(wc -w < "$OUTPUT" | tr -d ' ')
echo "Session briefing generated: $OUTPUT ($WC words)"
echo "Replaces ~17,000 words of manual startup reads"

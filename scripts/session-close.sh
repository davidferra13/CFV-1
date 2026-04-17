#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# ChefFlow Session Close-Out Generator
# ═══════════════════════════════════════════════════════════════════
# Generates the boilerplate parts of session close-out at zero cost.
# Claude fills in the judgment parts (what was done, context for next).
#
# Usage:  bash scripts/session-close.sh
# Output: Prints template to stdout. Also creates draft at
#         docs/session-digests/YYYY-MM-DD-draft.md
#
# Auto-fills:
#   - Date, branch, recent commits
#   - Files touched (from git diff)
#   - Session log entry template
#   - Build state from last tsc run
# ═══════════════════════════════════════════════════════════════════

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

DATE=$(date '+%Y-%m-%d')
TIME=$(date '+%H:%M')
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")

# Recent commits (this session, last 2 hours)
RECENT_COMMITS=$(git log --oneline --since="2 hours ago" 2>/dev/null || echo "none")
COMMIT_HASHES=$(git log --format='%h' --since="2 hours ago" 2>/dev/null | tr '\n' ', ' | sed 's/,$//')

# Files touched (uncommitted + recent commits)
UNCOMMITTED_FILES=$(git diff --name-only HEAD 2>/dev/null || true)
COMMITTED_FILES=$(git diff --name-only HEAD~5..HEAD 2>/dev/null || true)
ALL_FILES=$(echo -e "$UNCOMMITTED_FILES\n$COMMITTED_FILES" | sort -u | grep -v '^$')

# Build state from cleanup log
CLEANUP_LOG="$PROJECT_ROOT/.claude/hooks/cleanup.log"
if [ -f "$CLEANUP_LOG" ]; then
  LAST_TSC=$(grep 'tsc:' "$CLEANUP_LOG" | tail -1)
else
  LAST_TSC="No tsc results in cleanup log"
fi

# Build state from build-state.md
BUILD_STATE_FILE="$PROJECT_ROOT/docs/build-state.md"
if [ -f "$BUILD_STATE_FILE" ]; then
  BUILD_STATE=$(grep -i 'green\|broken\|clean\|error' "$BUILD_STATE_FILE" | head -1)
else
  BUILD_STATE="unknown"
fi

# Count changes
FILE_COUNT=$(echo "$ALL_FILES" | grep -c '.' || echo 0)

# ── Session Digest Draft ────────────────────────────────────────

DIGEST_FILE="$PROJECT_ROOT/docs/session-digests/$DATE-draft.md"

cat > "$DIGEST_FILE" << DIGEST
# Session Digest: [FILL: 3-5 word title]

**Date:** $DATE
**Agent:** Builder (Opus 4.6)
**Branch:** $BRANCH
**Commits:** \`$COMMIT_HASHES\`

## What Was Done

[FILL: What was accomplished this session. Include tables if multiple items.]

## Recent Commits

$RECENT_COMMITS

## Files Touched ($FILE_COUNT files)

$(echo "$ALL_FILES" | sed 's/^/- `/' | sed 's/$/`/')

## Decisions Made

[FILL: Any architectural or design decisions. Delete section if none.]

## Context for Next Agent

[FILL: What the next agent needs to know. Active work, blockers, gotchas.]

Build state on departure: $BUILD_STATE
Last tsc: $LAST_TSC
DIGEST

# ── Auto-trim session log (keep last 10 entries) ────────────────

SESSION_LOG="$PROJECT_ROOT/docs/session-log.md"
if [ -f "$SESSION_LOG" ]; then
  ENTRY_COUNT=$(grep -c '^## ' "$SESSION_LOG" || echo 0)
  if [ "$ENTRY_COUNT" -gt 10 ]; then
    # Find the line number of the 10th-from-last "## " heading
    KEEP_FROM=$(grep -n '^## ' "$SESSION_LOG" | tail -10 | head -1 | cut -d: -f1)
    # Preserve the title (first line) + blank line, then last 10 entries
    HEADER=$(head -2 "$SESSION_LOG")
    TRIMMED=$(tail -n +"$KEEP_FROM" "$SESSION_LOG")
    echo "$HEADER" > "$SESSION_LOG"
    echo "" >> "$SESSION_LOG"
    echo "$TRIMMED" >> "$SESSION_LOG"
    TRIMMED_COUNT=$((ENTRY_COUNT - 10))
    echo "  Trimmed $TRIMMED_COUNT old session log entries (kept last 10)"
  fi
fi

# ── Session Log Entry ────────────────────────────────────────────

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SESSION CLOSE-OUT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Digest draft: $DIGEST_FILE"
echo "  Files touched: $FILE_COUNT"
echo "  Recent commits: $(echo "$RECENT_COMMITS" | wc -l | tr -d ' ')"
echo "  Build state: $BUILD_STATE"
echo ""
echo "  ── Session Log Entry (paste into docs/session-log.md) ──"
echo ""
echo "  ## $DATE $TIME EST"
echo "  - Agent: Builder (Opus 4.6)"
echo "  - Task: [FILL]"
echo "  - Status: completed | partial | blocked"
echo "  - Files touched: $FILE_COUNT files"
echo "  - Commits: $COMMIT_HASHES"
echo "  - Build state on departure: $BUILD_STATE"
echo "  - Notes: [FILL]"
echo ""
echo "  ── Next Steps ──"
echo "  1. Fill in [FILL] fields in digest: $DIGEST_FILE"
echo "  2. Append session log entry to docs/session-log.md"
echo "  3. git add + commit + push"
echo ""

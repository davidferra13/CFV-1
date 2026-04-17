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

## Interrogation Specs
- $SPEC_COUNT specs, ~$TOTAL_QUESTIONS questions total

---
*Read the full files only if this briefing raises a specific concern.*
BRIEFING

# Word count
WC=$(wc -w < "$OUTPUT" | tr -d ' ')
echo "Session briefing generated: $OUTPUT ($WC words)"
echo "Replaces ~17,000 words of manual startup reads"

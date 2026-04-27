#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# AUTO-COMMIT HOOK (PERMANENT ENFORCEMENT)
# ═══════════════════════════════════════════════════════════════════
# Dual-mode: fires on Stop (every Claude turn) AND SessionEnd.
#
#   --throttled  (Stop hook)       Commits if dirty + 2min since last commit
#   --final      (SessionEnd hook) Commits unconditionally if dirty
#   (no flag)                      Same as --throttled
#
# Why this exists: 10+ parallel agents do work and never commit.
# Next session sees 100+ dirty files, reports "unhealthy." That
# loop ends here. Every turn, dirty state gets committed.
#
# Safety:
#   - Won't commit during merge/rebase conflicts
#   - Won't commit on main/master
#   - Won't commit if git index is locked (parallel agent safety)
#   - Excludes .env, credentials, secrets
#   - Throttled to max once per 2 minutes (Stop mode)
#   - Never pushes (developer's call)
#   - Logs to .claude/hooks/auto-commit.log
# ═══════════════════════════════════════════════════════════════════

MODE="${1:---throttled}"
PROJECT_DIR="c:/Users/david/Documents/CFv1"
LOG_FILE="$PROJECT_DIR/.claude/hooks/auto-commit.log"
THROTTLE_FILE="$PROJECT_DIR/.claude/hooks/.autocommit-throttle"
THROTTLE_SECONDS=120  # 2 minutes

timestamp() { date '+%Y-%m-%d %H:%M:%S'; }
log() { echo "[$(timestamp)] $1" >> "$LOG_FILE"; }

cd "$PROJECT_DIR" || { log "FAIL: can't cd to project dir"; exit 0; }

# ── Guard: git index locked (parallel agent running git) ─────────
if [ -f ".git/index.lock" ]; then
  exit 0
fi

# ── Guard: merge/rebase in progress ─────────────────────────────
if [ -d ".git/rebase-merge" ] || [ -d ".git/rebase-apply" ] || [ -f ".git/MERGE_HEAD" ]; then
  exit 0
fi

# ── Guard: detached HEAD ─────────────────────────────────────────
BRANCH=$(git branch --show-current 2>/dev/null)
if [ -z "$BRANCH" ]; then
  exit 0
fi

# ── Guard: main/master protection ────────────────────────────────
if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  exit 0
fi

# ── Guard: nothing dirty ────────────────────────────────────────
DIRTY_COUNT=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
if [ "$DIRTY_COUNT" -eq 0 ]; then
  exit 0
fi

# ── Guard: throttle (Stop mode only) ────────────────────────────
if [ "$MODE" = "--throttled" ] && [ -f "$THROTTLE_FILE" ]; then
  LAST_COMMIT_TIME=$(cat "$THROTTLE_FILE" 2>/dev/null || echo "0")
  NOW=$(date +%s)
  ELAPSED=$((NOW - LAST_COMMIT_TIME))
  if [ "$ELAPSED" -lt "$THROTTLE_SECONDS" ]; then
    exit 0
  fi
fi

# ── Stage everything except secrets ──────────────────────────────
git add -A 2>/dev/null

# Unstage sensitive files (quoted for Windows git bash compatibility)
git reset HEAD -- \
  '.env' '.env.local' '.env.production' '.env.development' \
  '.auth/*.json' \
  '**credentials*.json' \
  '**secrets*.json' \
  '**.pem' '**.key' \
  2>/dev/null || true

# ── Count staged ─────────────────────────────────────────────────
STAGED_COUNT=$(git diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')
if [ "$STAGED_COUNT" -eq 0 ]; then
  log "SKIP: $DIRTY_COUNT dirty but all excluded (secrets)"
  exit 0
fi

# ── Detect areas touched ─────────────────────────────────────────
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null)
AREAS=""
echo "$STAGED_FILES" | grep -q "^app/" && AREAS="$AREAS app"
echo "$STAGED_FILES" | grep -q "^lib/" && AREAS="$AREAS lib"
echo "$STAGED_FILES" | grep -q "^components/" && AREAS="$AREAS components"
echo "$STAGED_FILES" | grep -q "^database/" && AREAS="$AREAS db"
echo "$STAGED_FILES" | grep -q "^docs/" && AREAS="$AREAS docs"
echo "$STAGED_FILES" | grep -q "^scripts/" && AREAS="$AREAS scripts"
echo "$STAGED_FILES" | grep -q "^devtools/" && AREAS="$AREAS devtools"
echo "$STAGED_FILES" | grep -q "^\.claude/" && AREAS="$AREAS claude"
echo "$STAGED_FILES" | grep -q "^test" && AREAS="$AREAS tests"
echo "$STAGED_FILES" | grep -q "^system/" && AREAS="$AREAS system"
AREAS=$(echo "$AREAS" | xargs)
[ -z "$AREAS" ] && AREAS="misc"

# ── Commit message ───────────────────────────────────────────────
if [ "$MODE" = "--final" ]; then
  TAG="session-end"
else
  TAG="checkpoint"
fi

COMMIT_MSG="chore(auto): $TAG [$BRANCH] - $STAGED_COUNT files

Areas: $AREAS
Auto-committed by $TAG hook to prevent dirty state accumulation."

# ── Commit (skip pre-commit hooks, this is preservation not shipping) ──
git commit --no-verify -m "$COMMIT_MSG" 2>/dev/null
COMMIT_EXIT=$?

if [ $COMMIT_EXIT -eq 0 ]; then
  SHORT_HASH=$(git rev-parse --short HEAD 2>/dev/null)
  log "COMMITTED ($TAG): $SHORT_HASH - $STAGED_COUNT files on $BRANCH [$AREAS]"
  # Update throttle timestamp
  date +%s > "$THROTTLE_FILE"
else
  log "FAIL ($TAG): git commit exited $COMMIT_EXIT ($STAGED_COUNT staged)"
  git reset HEAD -- . 2>/dev/null || true
fi

# ── Trim log ─────────────────────────────────────────────────────
if [ -f "$LOG_FILE" ]; then
  tail -100 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
fi

exit 0

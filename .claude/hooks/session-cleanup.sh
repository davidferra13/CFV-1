#!/bin/bash
# Safe Claude Code SessionEnd hook for ChefFlow.
# Session shutdown must be fast and non-disruptive in a multi-agent workspace.
# Never kill shared Playwright/MCP/dev processes or run long builds here.
# Explicit runtime cleanup belongs in npm run dev:clean and normal release verification.

PROJECT_DIR="c:/Users/david/Documents/CFv1"
LOG_FILE="$PROJECT_DIR/.claude/hooks/cleanup.log"
timestamp() { date '+%Y-%m-%d %H:%M:%S'; }

echo "[$(timestamp)] SessionEnd safe cleanup starting" >> "$LOG_FILE"

DIRTY_FILE="$PROJECT_DIR/.tsc-dirty"
if [ -f "$DIRTY_FILE" ]; then
  DIRTY_COUNT=$(sort -u "$DIRTY_FILE" | wc -l | tr -d ' ')
  echo "[$(timestamp)] $DIRTY_COUNT TypeScript file(s) remain marked dirty; verification deferred to the normal release path and marker preserved" >> "$LOG_FILE"
fi

# These are Claude session markers only. Clearing them makes the next session
# reload current context/review state without affecting application processes.
rm -f "$PROJECT_DIR/.context-loaded" "$PROJECT_DIR/.review-done"
echo "[$(timestamp)] Cleared Claude session markers only" >> "$LOG_FILE"

if [ -f "$LOG_FILE" ]; then
  tail -200 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
fi

exit 0

#!/bin/bash
# .claude/hooks/regression-block.sh
#
# PostToolUse hook: After EVERY Edit/Write to a .ts/.tsx file,
# runs tsc and compares error count to baseline.
# If errors INCREASED, forces Claude to revert.
#
# This is NOT a suggestion. This is a HARD GATE.
# Claude sees the output and must revert the file.

INPUT=$(cat)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BASELINE_FILE="$PROJECT_ROOT/.tsc-baseline-errors"

# Extract file_path from tool result
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | sed 's/"file_path":"//;s/"//')

# Only check TypeScript files
if ! echo "$FILE_PATH" | grep -qE '\.(ts|tsx)$'; then
  exit 0
fi

# Skip non-source files
if echo "$FILE_PATH" | grep -qE '(node_modules|\.next|types/database\.ts)'; then
  exit 0
fi

# Get current error count
CURRENT_ERRORS=$(cd "$PROJECT_ROOT" && npx tsc --noEmit --skipLibCheck 2>&1 | grep -c "error TS" || echo "0")

# Load or create baseline
if [ -f "$BASELINE_FILE" ]; then
  BASELINE=$(cat "$BASELINE_FILE")
else
  # First run: set baseline to current
  echo "$CURRENT_ERRORS" > "$BASELINE_FILE"
  BASELINE="$CURRENT_ERRORS"
fi

# Compare
if [ "$CURRENT_ERRORS" -gt "$BASELINE" ]; then
  NEW_ERRORS=$((CURRENT_ERRORS - BASELINE))
  echo '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"REGRESSION DETECTED: Your edit introduced '"$NEW_ERRORS"' new TypeScript error(s) (baseline: '"$BASELINE"', now: '"$CURRENT_ERRORS"'). You MUST revert this file immediately with git checkout -- '"$FILE_PATH"' before doing anything else. Do NOT proceed. Do NOT try to fix forward. REVERT NOW."}}'
elif [ "$CURRENT_ERRORS" -lt "$BASELINE" ]; then
  # Errors decreased - update baseline (reward good behavior)
  echo "$CURRENT_ERRORS" > "$BASELINE_FILE"
fi

exit 0

#!/bin/bash
# .claude/hooks/compliance-guard.sh
#
# PostToolUse hook: after editing source files, checks for em dashes and OpenClaw in UI.
# Runs inline (no external script dependency) for speed.
# Only checks the file that was just edited, not the whole project.
#
# Fires on: Edit, Write tool calls (matcher in settings.json)

INPUT=$(cat)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Extract file_path from JSON input
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | sed 's/"file_path":"//;s/"//')

# Only check source files and UI-facing files
if ! echo "$FILE_PATH" | grep -qE '\.(ts|tsx|js|jsx|md)$'; then
  exit 0
fi

# Skip non-UI files for OpenClaw check
SKIP_OPENCLAW="false"
if echo "$FILE_PATH" | grep -qE '(node_modules|\.next|\.claude|database/|scripts/|tests/|docs/|\.agents/)'; then
  SKIP_OPENCLAW="true"
fi

VIOLATIONS=""

# Resolve to absolute path if needed
if [ -f "$FILE_PATH" ]; then
  CHECK_FILE="$FILE_PATH"
elif [ -f "$PROJECT_ROOT/$FILE_PATH" ]; then
  CHECK_FILE="$PROJECT_ROOT/$FILE_PATH"
else
  exit 0
fi

# Check for em dashes (U+2014)
if grep -Pn '\x{2014}' "$CHECK_FILE" 2>/dev/null | head -3 | grep -q .; then
  EM_LINES=$(grep -Pn '\x{2014}' "$CHECK_FILE" 2>/dev/null | head -3 | tr '\n' '; ')
  VIOLATIONS="${VIOLATIONS}EM DASH found in $FILE_PATH: $EM_LINES. Replace with comma, semicolon, colon, or separate sentence. "
fi

# Check for OpenClaw in UI-facing files (not internal code)
if [ "$SKIP_OPENCLAW" = "false" ]; then
  if echo "$FILE_PATH" | grep -qE '\.(tsx|jsx)$'; then
    # Check string literals and JSX text for OpenClaw (skip imports/comments/variable names)
    if grep -nE "(>[^<]*OpenClaw|'[^']*OpenClaw|\"[^\"]*OpenClaw)" "$CHECK_FILE" 2>/dev/null | grep -vE '(import |// |/\*|className)' | head -3 | grep -q .; then
      OC_LINES=$(grep -nE "(>[^<]*OpenClaw|'[^']*OpenClaw|\"[^\"]*OpenClaw)" "$CHECK_FILE" 2>/dev/null | grep -vE '(import |// |/\*|className)' | head -3 | tr '\n' '; ')
      VIOLATIONS="${VIOLATIONS}OPENCLAW IN UI found in $FILE_PATH: $OC_LINES. Use 'system' or 'engine' instead in user-facing text. "
    fi
  fi
fi

if [ -n "$VIOLATIONS" ]; then
  # Escape for JSON
  VIOLATIONS=$(echo "$VIOLATIONS" | sed 's/"/\\"/g' | tr '\n' ' ')
  printf '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"COMPLIANCE VIOLATION: %s Fix these before moving on."}}' "$VIOLATIONS"
fi

exit 0

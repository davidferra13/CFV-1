#!/bin/bash
# .claude/hooks/module-guard.sh
#
# PostToolUse hook: warns when new files are created outside established module directories.
# Prevents stray code. Every file must live in its correct module.
#
# Fires on: Write tool calls (matcher in settings.json)

INPUT=$(cat)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Extract file_path from JSON input
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | sed 's/"file_path":"//;s/"//')

# Only check new source files (not docs, configs, skills, tests, scripts)
if ! echo "$FILE_PATH" | grep -qE '\.(ts|tsx|js|jsx)$'; then
  exit 0
fi

# Skip known non-module locations
if echo "$FILE_PATH" | grep -qE '(node_modules|\.next|\.claude|scripts/|tests/|docs/|\.agents/|public/)'; then
  exit 0
fi

# Established module directories for source code
VALID_DIRS="app/ lib/ components/ types/ database/ middleware"

MATCHED=""
for dir in $VALID_DIRS; do
  if echo "$FILE_PATH" | grep -q "$dir"; then
    MATCHED="true"
    break
  fi
done

if [ -z "$MATCHED" ]; then
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PostToolUse\",\"additionalContext\":\"MODULE GUARD: File '$FILE_PATH' is outside established module directories (app/, lib/, components/, types/, database/, middleware). Every source file must live in its correct module. If this is a new top-level concern, create a proper module directory for it.\"}}"
fi

exit 0

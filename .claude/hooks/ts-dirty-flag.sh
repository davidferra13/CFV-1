#!/bin/bash
# .claude/hooks/ts-dirty-flag.sh
#
# PostToolUse hook: marks TypeScript files dirty when edited.
# At SessionEnd, session-cleanup.sh runs tsc if this flag exists.
# This avoids running tsc after every single edit (too slow).
#
# Fires on: Edit, Write tool calls (matcher in settings.json)

INPUT=$(cat)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DIRTY_FILE="$PROJECT_ROOT/.tsc-dirty"

# Extract file_path from JSON input
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | sed 's/"file_path":"//;s/"//')

# Only flag TypeScript source files (skip generated types/node_modules)
if echo "$FILE_PATH" | grep -qE '\.(ts|tsx)$'; then
  if ! echo "$FILE_PATH" | grep -qE '(node_modules|\.next|types/database\.ts)'; then
    echo "$FILE_PATH" >> "$DIRTY_FILE"
  fi
fi

exit 0

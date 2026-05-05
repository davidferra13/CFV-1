#!/bin/bash
# .claude/hooks/scope-guard.sh
#
# PreToolUse hook on Edit/Write: Tracks how many unique files
# Claude has modified this session. BLOCKS edits after 5 files.
#
# Hard gate. Claude cannot bypass this.

INPUT=$(cat)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SCOPE_FILE="$PROJECT_ROOT/.claude-session-scope"

# Extract file_path from input
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | sed 's/"file_path":"//;s/"//')

# Skip non-source files (allow docs, configs, etc.)
if ! echo "$FILE_PATH" | grep -qE '\.(ts|tsx|js|jsx)$'; then
  exit 0
fi

# Create scope file if missing
touch "$SCOPE_FILE"

# Check if this file is already in the scope (already touched = free)
if grep -qF "$FILE_PATH" "$SCOPE_FILE" 2>/dev/null; then
  exit 0
fi

# Count unique files touched
COUNT=$(wc -l < "$SCOPE_FILE" | tr -d ' ')

if [ "$COUNT" -ge 5 ]; then
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"SCOPE LIMIT REACHED. You have already modified 5 source files this session. You CANNOT modify more files without explicit developer approval. List the files you need to touch and explain WHY. Stop and ask."}}'
  exit 0
fi

# Add file to scope tracker
echo "$FILE_PATH" >> "$SCOPE_FILE"

exit 0

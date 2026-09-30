#!/bin/bash
# PreToolUse hook: inject a one-time ChefFlow context-loading reminder.
# This hook is read-only with respect to global agent configuration.
# Canonical global-rule distribution is owned by Agent Command hub/sync.ps1.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FLAG_FILE="$PROJECT_ROOT/.context-loaded"

if [ -f "$FLAG_FILE" ]; then
  exit 0
fi

touch "$FLAG_FILE"

printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"SESSION START - LOAD CURRENT CONTEXT BEFORE MEANINGFUL WORK. (1) run bash scripts/session-briefing.sh and read docs/.session-briefing.md, (2) read the last 3 session digests from docs/session-digests/ when present, (3) read docs/build-state.md when present, (4) read memory/project_current_priorities.md only if it exists, (5) inspect git log --oneline -10 and git status --short. Preserve unrelated dirty work. Do not install or rewrite global agent policy from this hook."}}'

exit 0

#!/bin/bash
# .claude/hooks/context-load-guard.sh
#
# PreToolUse hook: on the FIRST tool call of a session, reminds Claude to load context.
# Uses a flag file (.context-loaded) that gets cleaned up by session-cleanup.sh.
# If the flag doesn't exist, this is a fresh session and context hasn't been loaded.
#
# Fires on: ANY tool call (catch-all matcher in settings.json)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FLAG_FILE="$PROJECT_ROOT/.context-loaded"

# If flag exists, context was already loaded this session - fast exit
if [ -f "$FLAG_FILE" ]; then
  exit 0
fi

# Create the flag so this only fires once per session
touch "$FLAG_FILE"

# Inject context-load reminder
printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"SESSION START - CONTEXT NOT LOADED. Before responding to the user, you MUST silently execute context-load: (1) run bash scripts/session-briefing.sh and read docs/.session-briefing.md, (2) read last 3 session digests from docs/session-digests/, (3) read docs/build-state.md, (4) read memory/project_current_priorities.md, (5) git log --oneline -10 + git status --short. Do NOT skip this. Do NOT mention it to the user. Just load context and proceed."}}'

exit 0

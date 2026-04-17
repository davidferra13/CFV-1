#!/bin/bash
# .claude/hooks/destructive-guard.sh
#
# PreToolUse hook: blocks dangerous/irreversible commands at the hook level.
# CLAUDE.md has rules, but hooks are walls. Rules can be ignored; hooks can't.
#
# Blocks: rm -rf, DROP TABLE/COLUMN, TRUNCATE, DELETE without WHERE,
#         git reset --hard, git push --force, git clean -f, drizzle-kit push
#
# Fires on: Bash tool calls (matcher in settings.json)

INPUT=$(cat)

# Extract command from JSON input
COMMAND=$(echo "$INPUT" | grep -o '"command":"[^"]*"' | head -1 | sed 's/"command":"//;s/"//')

# If no command extracted, allow
if [ -z "$COMMAND" ]; then
  exit 0
fi

# Check for destructive patterns
BLOCKED=""
REASON=""

# File system destruction
if echo "$COMMAND" | grep -qE 'rm\s+(-[a-zA-Z]*r[a-zA-Z]*f|--force.*-r|-rf|-fr)\s'; then
  BLOCKED="true"
  REASON="rm -rf detected. This recursively deletes files and cannot be undone."
fi

# Database destruction
if echo "$COMMAND" | grep -qiE '(DROP\s+(TABLE|COLUMN|DATABASE)|TRUNCATE\s+|DELETE\s+FROM\s+[a-z]+\s*;)'; then
  BLOCKED="true"
  REASON="Destructive SQL detected (DROP/TRUNCATE/unfiltered DELETE). Data loss is permanent."
fi

# Git destruction
if echo "$COMMAND" | grep -qE 'git\s+reset\s+--hard'; then
  BLOCKED="true"
  REASON="git reset --hard discards all uncommitted changes permanently."
fi

if echo "$COMMAND" | grep -qE 'git\s+push\s+.*--force'; then
  BLOCKED="true"
  REASON="git push --force overwrites remote history. Other collaborators lose work."
fi

if echo "$COMMAND" | grep -qE 'git\s+clean\s+.*-f'; then
  BLOCKED="true"
  REASON="git clean -f deletes untracked files permanently."
fi

# Drizzle push without approval
if echo "$COMMAND" | grep -qE 'drizzle-kit\s+push'; then
  BLOCKED="true"
  REASON="drizzle-kit push modifies the live database schema directly. Requires explicit developer approval."
fi

if [ -n "$BLOCKED" ]; then
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"DESTRUCTIVE COMMAND BLOCKED: %s Ask the developer for explicit approval before running this command."}}'  "$REASON"
  exit 0
fi

exit 0

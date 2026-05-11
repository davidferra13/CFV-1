#!/bin/bash
# .claude/hooks/commit-guard.sh
#
# PreToolUse hook: when Claude runs git commit, reminds about /review.
# Also tracks build times when tsc or next build is detected.
#
# Fires on: Bash tool calls (matcher in settings.json)

INPUT=$(cat)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Extract command from JSON input
COMMAND=$(echo "$INPUT" | grep -o '"command":"[^"]*"' | head -1 | sed 's/"command":"//;s/"//')

if [ -z "$COMMAND" ]; then
  exit 0
fi

# Check for git commit - remind about review
if echo "$COMMAND" | grep -qE 'git\s+commit'; then
  # Check if .review-done flag exists (set when /review skill runs)
  if [ ! -f "$PROJECT_ROOT/.review-done" ]; then
    printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"COMMIT WITHOUT REVIEW: You are about to commit without running /review first. Run the review skill or compliance scan before committing. If this is a trivial commit (docs, config), proceed. Otherwise, review first."}}'
    exit 0
  else
    # Clear the flag after use
    rm -f "$PROJECT_ROOT/.review-done"
  fi
fi

# Track build times - wrap tsc and next build with timing
if echo "$COMMAND" | grep -qE '(npx\s+tsc|next\s+build|run-typecheck|run-next-build)'; then
  BUILD_LOG="$PROJECT_ROOT/docs/build-times.log"
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  # Extract what kind of build
  if echo "$COMMAND" | grep -qE 'tsc|typecheck'; then
    BUILD_TYPE="tsc"
  else
    BUILD_TYPE="next-build"
  fi

  # BUILD FRESHNESS CHECK: warn if a recent passing build exists
  BUILD_STATE="$PROJECT_ROOT/docs/build-state.md"
  if [ -f "$BUILD_STATE" ]; then
    LAST_GREEN=$(grep -oP '(?<=Last verified:\*\* )\d{4}-\d{2}-\d{2}' "$BUILD_STATE" 2>/dev/null | head -1)
    IS_GREEN=$(grep -c '**Status:** green' "$BUILD_STATE" 2>/dev/null)
    if [ "$IS_GREEN" -gt 0 ] && [ -n "$LAST_GREEN" ]; then
      # Check if build-state was updated today
      TODAY=$(date '+%Y-%m-%d')
      if [ "$LAST_GREEN" = "$TODAY" ]; then
        printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"BUILD FRESHNESS WARNING: build-state.md shows GREEN from today (%s). Unless you changed type signatures or added new files, this rebuild is likely redundant and wastes tokens + time. Check if you actually need to rebuild. Core Mandate #9: dont rebuild whats already built."}}' "$LAST_GREEN"
        exit 0
      fi
    fi
  fi

  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"BUILD TIME TRACKING: Record the start time. After this command finishes, log the duration to docs/build-times.log in format: %s | %s | <duration>s | <exit-code>."}}' "$TIMESTAMP" "$BUILD_TYPE"
fi

# DEV SERVER REUSE CHECK: warn before spawning new dev servers
if echo "$COMMAND" | grep -qE 'next\s+dev|npm\s+run\s+dev'; then
  # Check if dev server already running on common ports
  RUNNING_PORT=""
  for PORT in 3100 3000; do
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT" 2>/dev/null | grep -qE '(200|302|307|404)'; then
      RUNNING_PORT=$PORT
      break
    fi
  done
  if [ -n "$RUNNING_PORT" ]; then
    printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"DEV SERVER ALREADY RUNNING on port %s. Use it instead of spawning a new one. Core Mandate #4: start dead things, dont kill live things. Core Mandate #9: dont rebuild whats already built. Only spawn a new server if port %s is genuinely not responding to your needs."}}' "$RUNNING_PORT" "$RUNNING_PORT"
    exit 0
  fi
fi

exit 0

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
if echo "$COMMAND" | grep -qE '(npx\s+tsc|next\s+build)'; then
  BUILD_LOG="$PROJECT_ROOT/docs/build-times.log"
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  # Extract what kind of build
  if echo "$COMMAND" | grep -qE 'tsc'; then
    BUILD_TYPE="tsc"
  else
    BUILD_TYPE="next-build"
  fi
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"BUILD TIME TRACKING: Record the start time. After this command finishes, log the duration to docs/build-times.log in format: %s | %s | <duration>s | <exit-code>."}}' "$TIMESTAMP" "$BUILD_TYPE"
fi

exit 0

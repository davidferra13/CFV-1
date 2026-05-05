#!/bin/bash
# Hermes Job 9: Error Log Scanner
# Runs every hour. Scans Next.js and app logs for errors, warnings, crashes.
# Output: docs/hermes/error-scan.md

CHEFFLOW="/mnt/c/Users/david/Documents/CFv1"
OUTPUT="$CHEFFLOW/docs/hermes/error-scan.md"
ALERTS="$CHEFFLOW/docs/hermes/ALERTS.md"
LOGS_DIR="$CHEFFLOW/logs"
TS=$(date +"%Y-%m-%d %H:%M")

mkdir -p "$(dirname "$OUTPUT")"

# Scan live-ops guardian logs
GUARDIAN_ERRORS=""
GUARDIAN_FILE="$LOGS_DIR/live-ops-guardian-latest.json"
if [ -f "$GUARDIAN_FILE" ]; then
  GUARDIAN_ERRORS=$(jq -r '.errors // [] | .[]' "$GUARDIAN_FILE" 2>/dev/null | head -10)
fi

# Scan for ts-nocheck files (compliance)
TS_NOCHECK=$(grep -rl "@ts-nocheck" "$CHEFFLOW/app/" "$CHEFFLOW/lib/" "$CHEFFLOW/components/" 2>/dev/null | head -10)
TS_NOCHECK_COUNT=$(echo "$TS_NOCHECK" | grep -c '[a-z]' 2>/dev/null || echo "0")

# Scan for console.error patterns in recent git changes (ChefFlow source only)
RECENT_ERRORS=$(cd "$CHEFFLOW" && git diff HEAD~5 --name-only 2>/dev/null | grep -E "^(app|lib|components|types)/" | while read f; do
  if [ -f "$f" ]; then
    grep -n "console\.error\|throw new Error" "$f" 2>/dev/null | head -3 | sed "s|^|$f:|"
  fi
done | head -20)

# Scan for TODO/FIXME/HACK in recently changed files (ChefFlow source only)
RECENT_TODOS=$(cd "$CHEFFLOW" && git diff HEAD~5 --name-only 2>/dev/null | grep -E "^(app|lib|components|types)/" | while read f; do
  if [ -f "$f" ]; then
    grep -n "FIXME\|HACK\|XXX" "$f" 2>/dev/null | head -3 | sed "s|^|$f:|"
  fi
done | head -20)

# Check for build artifacts that shouldn't exist
STALE_ARTIFACTS=""
[ -f "$CHEFFLOW/build-output.txt" ] && STALE_ARTIFACTS="$STALE_ARTIFACTS build-output.txt"
[ -f "$CHEFFLOW/build_out.txt" ] && STALE_ARTIFACTS="$STALE_ARTIFACTS build_out.txt"
[ -f "$CHEFFLOW/.tsc-dirty" ] && STALE_ARTIFACTS="$STALE_ARTIFACTS .tsc-dirty"

# Check for large uncommitted files (>1MB, ChefFlow source only)
LARGE_UNCOMMITTED=$(cd "$CHEFFLOW" && git status --porcelain 2>/dev/null | awk '{print $2}' | grep -E "^(app|lib|components|types|scripts)/" | while read f; do
  if [ -f "$f" ]; then
    SIZE=$(stat -c '%s' "$f" 2>/dev/null || echo "0")
    if [ "$SIZE" -gt 1048576 ]; then
      echo "$f ($(( SIZE / 1048576 ))MB)"
    fi
  fi
done | head -10)

# Write report (overwrite each run)
cat > "$OUTPUT" << EOF
# Error Scan Report

**Last scan:** $TS

## Guardian Errors
$([ -n "$GUARDIAN_ERRORS" ] && echo "$GUARDIAN_ERRORS" || echo "None detected.")

## @ts-nocheck Files ($TS_NOCHECK_COUNT found)
$([ -n "$TS_NOCHECK" ] && echo "$TS_NOCHECK" || echo "None (good).")

## Error Patterns in Recent Changes
$([ -n "$RECENT_ERRORS" ] && echo "\`\`\`" && echo "$RECENT_ERRORS" && echo "\`\`\`" || echo "None detected.")

## TODOs/FIXMEs in Recent Changes
$([ -n "$RECENT_TODOS" ] && echo "\`\`\`" && echo "$RECENT_TODOS" && echo "\`\`\`" || echo "None detected.")

## Stale Build Artifacts
$([ -n "$STALE_ARTIFACTS" ] && echo "$STALE_ARTIFACTS" || echo "Clean.")

## Large Uncommitted Files (>1MB)
$([ -n "$LARGE_UNCOMMITTED" ] && echo "$LARGE_UNCOMMITTED" || echo "None.")
EOF

# Alert on ts-nocheck violations
if [ "$TS_NOCHECK_COUNT" -gt 0 ]; then
  echo "- **$TS** [WARN] $TS_NOCHECK_COUNT files with @ts-nocheck found" >> "$ALERTS"
fi

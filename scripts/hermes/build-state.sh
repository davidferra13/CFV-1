#!/bin/bash
# Hermes Job 4: Build State Monitor
# Runs every 6 hours. Runs tsc to check for type errors.
# Output: docs/hermes/build-state-check.md

CHEFFLOW="/mnt/c/Users/david/Documents/CFv1"
OUTPUT="$CHEFFLOW/docs/hermes/build-state-check.md"
ALERTS="$CHEFFLOW/docs/hermes/ALERTS.md"
TS=$(date +"%Y-%m-%d %H:%M")

mkdir -p "$(dirname "$OUTPUT")"
cd "$CHEFFLOW" || exit 1

# Run tsc with memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
TSC_OUTPUT=$(npx tsc --noEmit --skipLibCheck --pretty false 2>&1)
TSC_EXIT=$?

if [ $TSC_EXIT -eq 0 ]; then
  RESULT="PASS"
  ERROR_COUNT=0
  ERRORS=""
else
  RESULT="FAIL"
  ERROR_COUNT=$(echo "$TSC_OUTPUT" | grep -c "error TS" || echo "0")
  # Capture first 20 errors
  ERRORS=$(echo "$TSC_OUTPUT" | grep "error TS" | head -20)
fi

# Overwrite (not append) since we only care about latest state
cat > "$OUTPUT" << EOF
# Build State Check

**Last check:** $TS
**Result:** $RESULT
**Errors:** $ERROR_COUNT

EOF

if [ "$RESULT" = "FAIL" ]; then
  cat >> "$OUTPUT" << EOF
## Errors

\`\`\`
$ERRORS
\`\`\`
EOF
  echo "- **$TS** - tsc FAIL: $ERROR_COUNT type errors" >> "$ALERTS"
fi

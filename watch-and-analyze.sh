#!/bin/bash
# Master Test Completion Watcher & Auto-Analyzer
# Monitors variant test and automatically runs analysis + post-processing on completion

TEST_DIR="c:/Users/david/Documents/CFv1"
MAX_WAIT=7500  # 2 hours + 5 min buffer in seconds

cd "$TEST_DIR"

echo "════════════════════════════════════════════════════════════════"
echo "VARIANT TEST COMPLETION WATCHER"
echo "════════════════════════════════════════════════════════════════"
echo "Waiting for test to complete..."
echo "Max wait time: $MAX_WAIT seconds (~2h 5m)"
echo ""

START_TIME=$(date +%s)

while true; do
  CURRENT_TIME=$(date +%s)
  ELAPSED=$((CURRENT_TIME - START_TIME))

  # Check if Playwright is still running
  if ! ps aux | grep -E "playwright.*test" | grep -v grep > /dev/null 2>&1; then
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "✓ TEST COMPLETED (Elapsed: $ELAPSED seconds)"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    break
  fi

  # Check timeout
  if [ $ELAPSED -gt $MAX_WAIT ]; then
    echo ""
    echo "⚠️  TIMEOUT: Test exceeded maximum wait time"
    exit 1
  fi

  # Sleep before next check
  sleep 30
done

# Give a moment for files to be written
sleep 3

echo "Running post-variant analysis..."
echo ""

# Run the analysis script
bash "$TEST_DIR/post-variant-analysis.sh"

ANALYSIS_EXIT=$?

echo ""
echo "════════════════════════════════════════════════════════════════"
if [ $ANALYSIS_EXIT -eq 0 ]; then
  echo "✓ ANALYSIS COMPLETE"
else
  echo "⚠️  ANALYSIS FAILED (exit code: $ANALYSIS_EXIT)"
fi
echo "════════════════════════════════════════════════════════════════"

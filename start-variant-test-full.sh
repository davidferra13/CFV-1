#!/bin/bash
# Complete variant test execution with monitoring and auto-analysis
# This script:
# 1. Starts the variant test (12 concurrent, 2 hours)
# 2. Monitors progress in real-time
# 3. Auto-analyzes results when complete
# 4. Shows notifications

set -e

TEST_DIR="c:/Users/david/Documents/CFv1"
cd "$TEST_DIR"

echo "════════════════════════════════════════════════════════════════"
echo "VARIANT TEST EXECUTION PIPELINE"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Step 1: Ensure dev server is running
echo "Step 1: Checking dev server..."
if ! curl -s http://localhost:3100 > /dev/null 2>&1; then
  echo "  Starting dev server on port 3100..."
  npm run dev > /tmp/dev-server.log 2>&1 &
  sleep 60
  if ! curl -s http://localhost:3100 > /dev/null 2>&1; then
    echo "  ❌ Dev server failed to start"
    exit 1
  fi
fi
echo "  ✓ Dev server ready"
echo ""

# Step 2: Start test
echo "Step 2: Starting variant test (12 concurrent, 2 hours)..."
STRESS_CONCURRENCY=12 STRESS_MODE=sustained npx playwright test --config=playwright.stress.config.ts > /tmp/variant-test.log 2>&1 &
TEST_PID=$!
echo "  ✓ Test started (PID: $TEST_PID)"
echo ""

# Step 3: Monitor progress
echo "Step 3: Monitoring test progress..."
bash "$TEST_DIR/variant-test-monitor.sh" &
MONITOR_PID=$!
echo "  ✓ Monitor active"
echo ""

# Step 4: Show notifications (PowerShell on Windows)
echo "Step 4: Setting up completion notifications..."
if command -v powershell &> /dev/null; then
  powershell -NoProfile -ExecutionPolicy Bypass -File "$TEST_DIR/variant-test-notify.ps1" > /tmp/variant-notify.log 2>&1 &
  NOTIFY_PID=$!
  echo "  ✓ Notification system active"
else
  echo "  ⚠️  PowerShell not available (notifications disabled)"
fi
echo ""

# Step 5: Wait for test completion
echo "Step 5: Waiting for test completion..."
echo "  Expected duration: ~120 minutes"
wait $TEST_PID
TEST_EXIT=$?

if [ $TEST_EXIT -eq 0 ]; then
  echo "  ✓ Variant test completed successfully"
else
  echo "  ❌ Test exited with code $TEST_EXIT"
fi
echo ""

# Step 6: Auto-analyze results
echo "Step 6: Auto-analyzing results..."
sleep 3
bash "$TEST_DIR/analyze-variant-results.sh" > /tmp/variant-analysis.log 2>&1

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "VARIANT TEST PIPELINE COMPLETE"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Results summary:"
cat /tmp/variant-analysis.log | grep -A 50 "RESULTS:" || echo "(Full results in /tmp/variant-analysis.log)"
echo ""
echo "Full analysis output:"
cat /tmp/variant-analysis.log

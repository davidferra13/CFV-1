#!/bin/bash
# Variant Test Monitor — Real-time progress tracking + notification system

TEST_DIR="c:/Users/david/Documents/CFv1/data/stress-reports"
CONFIG_CONCURRENCY=12
EXPECTED_DURATION=7200  # 2 hours in seconds
POLLING_INTERVAL=30    # Check every 30 seconds

echo "════════════════════════════════════════════════════════════════"
echo "VARIANT TEST MONITOR (12 concurrent)"
echo "════════════════════════════════════════════════════════════════"
echo "Started: $(date)"
echo "Expected completion: $(date -d '+7200 seconds')"
echo ""

# Track progress
declare -A last_metrics
last_metrics[total]=0
last_metrics[timestamp]=""

while true; do
  # Find the most recent sustained test file
  LATEST_REPORT=$(ls -t "$TEST_DIR"/ollama-stress-sustained-*.json 2>/dev/null | head -1)

  if [ -n "$LATEST_REPORT" ]; then
    # Extract key metrics
    if command -v jq &> /dev/null; then
      TOTAL=$(jq '.results.total' "$LATEST_REPORT" 2>/dev/null)
      SUCCESS=$(jq '.results.successes' "$LATEST_REPORT" 2>/dev/null)
      ERRORS=$(jq '.results.errors' "$LATEST_REPORT" 2>/dev/null)
      SUCCESS_RATE=$(jq '.results.successRate' "$LATEST_REPORT" 2>/dev/null)
      P95=$(jq '.latency.p95Ms' "$LATEST_REPORT" 2>/dev/null)
      P99=$(jq '.latency.p99Ms' "$LATEST_REPORT" 2>/dev/null)
      THROUGHPUT=$(jq '.throughput.requestsPerSecond' "$LATEST_REPORT" 2>/dev/null)
      CONFIG=$(jq '.config.concurrency' "$LATEST_REPORT" 2>/dev/null)

      # Only display if metrics have changed (progress made)
      if [ "$TOTAL" != "${last_metrics[total]}" ]; then
        echo ""
        echo "[$(date '+%H:%M:%S')] Progress Update:"
        echo "  Requests:    $TOTAL (Success: $SUCCESS, Errors: $ERRORS)"
        echo "  Success Rate: $(printf '%.1f' $(echo "$SUCCESS_RATE * 100" | bc -l))%"
        echo "  Throughput:  $THROUGHPUT req/s"
        echo "  P95/P99:     ${P95}ms / ${P99}ms"
        echo "  Concurrency: $CONFIG"

        last_metrics[total]=$TOTAL
        last_metrics[timestamp]=$(date)

        # Check if test completed (error rate stabilized at 0 for sustained period)
        # This is a heuristic - the test truly completes when Playwright finishes
        if [ "$TOTAL" -gt 10000 ] && [ "$ERRORS" -eq 0 ]; then
          echo ""
          echo "  ✓ Excellent stability detected (10k+ requests, 0 errors)"
        fi
      fi
    fi
  fi

  # Check if Playwright is still running
  if ! pgrep -f "playwright test" > /dev/null 2>&1; then
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "TEST COMPLETED"
    echo "════════════════════════════════════════════════════════════════"
    echo "Completion time: $(date)"
    echo ""
    break
  fi

  sleep $POLLING_INTERVAL
done

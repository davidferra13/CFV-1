#!/bin/bash
# Auto-analyze variant test results when complete

echo "[Auto-Analyzer] Waiting for variant test to complete..."
echo "[Auto-Analyzer] This script will run automatically when the test finishes"
echo ""

# Wait for test completion (check for Playwright exit)
while pgrep -f "playwright test" > /dev/null; do
  sleep 30
done

echo "[Auto-Analyzer] ✓ Variant test completed!"
echo "[Auto-Analyzer] Analyzing results..."
echo ""

# Find the latest sustained test result
TEST_DIR="data/stress-reports"
LATEST=$(ls -t "$TEST_DIR"/ollama-stress-sustained-*.json 2>/dev/null | head -1)

if [ -z "$LATEST" ]; then
  echo "[Auto-Analyzer] ❌ ERROR: No sustained test results found!"
  exit 1
fi

echo "═════════════════════════════════════════════════════════════════"
echo "VARIANT TEST GENERALIZATION ANALYSIS"
echo "═════════════════════════════════════════════════════════════════"
echo ""
echo "Test Report: $(basename $LATEST)"
echo ""

# Extract metrics
if command -v jq &> /dev/null; then
  echo "RESULTS:"
  echo "--------"

  TOTAL=$(jq '.results.total' "$LATEST")
  SUCCESS=$(jq '.results.successes' "$LATEST")
  ERRORS=$(jq '.results.errors' "$LATEST")
  SUCCESS_RATE=$(jq '.results.successRate' "$LATEST")
  RETRIES=$(jq '.results.retries' "$LATEST")
  THROUGHPUT=$(jq '.throughput.requestsPerSecond' "$LATEST")

  P50=$(jq '.latency.p50Ms' "$LATEST")
  P95=$(jq '.latency.p95Ms' "$LATEST")
  P99=$(jq '.latency.p99Ms' "$LATEST")
  MAX=$(jq '.latency.maxMs' "$LATEST")

  GPU_AVG=$(jq '.system.avgGpuPercent' "$LATEST")
  GPU_MAX=$(jq '.system.maxGpuMb' "$LATEST")

  echo "Total Requests:    $TOTAL"
  echo "Successes:         $SUCCESS"
  echo "Errors:            $ERRORS"
  echo "Retries:           $RETRIES"
  echo "Success Rate:      $(printf '%.1f' $(echo "$SUCCESS_RATE * 100" | bc))%"
  echo ""
  echo "Throughput:        $THROUGHPUT req/s"
  echo ""
  echo "Latency Percentiles:"
  echo "  P50:             ${P50}ms"
  echo "  P95:             ${P95}ms"
  echo "  P99:             ${P99}ms"
  echo "  Max:             ${MAX}ms"
  echo ""
  echo "System Resources:"
  echo "  Avg GPU:         ${GPU_AVG}%"
  echo "  Max GPU Memory:  ${GPU_MAX}MB"
  echo ""

  # SLA Assessment
  echo "SLA COMPLIANCE (12 concurrent variant):"
  echo "───────────────────────────────────────"

  if (( $(echo "$SUCCESS_RATE >= 0.95" | bc -l) )); then
    echo "  ✅ Success Rate: $SUCCESS_RATE >= 0.95 [PASS]"
  else
    echo "  ❌ Success Rate: $SUCCESS_RATE < 0.95 [FAIL]"
  fi

  if (( $(echo "$P95 <= 5000" | bc -l) )); then
    echo "  ✅ P95 Latency: ${P95}ms <= 5000ms [PASS]"
  else
    echo "  ❌ P95 Latency: ${P95}ms > 5000ms [FAIL]"
  fi

  if (( $(echo "$P99 <= 10000" | bc -l) )); then
    echo "  ✅ P99 Latency: ${P99}ms <= 10000ms [PASS]"
  else
    echo "  ❌ P99 Latency: ${P99}ms > 10000ms [FAIL]"
  fi

  if (( $(echo "$THROUGHPUT >= 2.0" | bc -l) )); then
    echo "  ✅ Throughput: $THROUGHPUT >= 2.0 req/s [PASS]"
  else
    echo "  ❌ Throughput: $THROUGHPUT < 2.0 req/s [FAIL]"
  fi

  echo ""
  echo "GENERALIZATION ASSESSMENT:"
  echo "──────────────────────────"
  echo "Variant config:  12 concurrent users (1.5x baseline)"
  echo "Baseline config: 8 concurrent users"
  echo "Optimization:    COOLDOWN_MS = 250ms (both tests)"
  echo ""

  if (( $(echo "$SUCCESS_RATE >= 0.99" | bc -l) )) && (( $(echo "$ERRORS <= 50" | bc -l) )); then
    echo "✅ OPTIMIZATION GENERALIZES"
    echo "   - High success rate maintained at higher concurrency"
    echo "   - Error handling robust across load patterns"
    echo "   - System performance stable (not just lucky at 8 concurrent)"
  else
    echo "⚠️  OPTIMIZATION PARTIALLY GENERALIZES"
    echo "   - Performance acceptable but may degrade further at scale"
    echo "   - Consider additional tuning for higher concurrency"
  fi

else
  echo "⚠️  jq not available - showing raw JSON:"
  cat "$LATEST"
fi

echo ""
echo "═════════════════════════════════════════════════════════════════"
echo "NEXT STEP: Compare variant results with baseline (8 concurrent)"
echo "═════════════════════════════════════════════════════════════════"

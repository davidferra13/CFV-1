#!/bin/bash
# Monitor variant sustained test (12 concurrent)

TEST_DIR="data/stress-reports"
POLLING_INTERVAL=120  # Check every 2 minutes

echo "[Variant Test Monitor] Started - polling every $POLLING_INTERVAL seconds"
echo "[Variant Test Monitor] Expected duration: ~2 hours"
echo ""

COUNTER=0
while [ $COUNTER -lt 120 ]; do
  # Find the most recent sustained test file
  LATEST=$(ls -t "$TEST_DIR"/ollama-stress-sustained-*.json 2>/dev/null | head -1)
  
  if [ -n "$LATEST" ]; then
    echo "[Monitor] Latest report: $(basename $LATEST)"
    
    # Extract metrics if jq available
    if command -v jq &> /dev/null; then
      echo "  Total Requests: $(jq '.results.total' "$LATEST")"
      echo "  Success Rate: $(jq '.results.successRate * 100' "$LATEST" | cut -d. -f1)%"
      echo "  Errors: $(jq '.results.errors' "$LATEST")"
      echo "  Throughput: $(jq '.throughput.requestsPerSecond' "$LATEST") req/s"
      echo "  P95 Latency: $(jq '.latency.p95Ms' "$LATEST")ms"
      echo ""
    fi
  fi
  
  COUNTER=$((COUNTER + 1))
  [ $COUNTER -lt 120 ] && sleep $POLLING_INTERVAL
done

echo "[Monitor] Polling complete - waiting for test to finish..."

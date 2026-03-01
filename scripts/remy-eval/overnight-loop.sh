#!/bin/bash
# Remy Eval — Overnight Loop
# Run this from a plain terminal (NOT Claude Code). Close VS Code. $0 cost.
#
# Usage: cd /c/Users/david/Documents/CFv1 && bash scripts/remy-eval/overnight-loop.sh
#
# Prerequisites:
#   1. Dev server running on port 3100 (npm run dev in another terminal)
#   2. Ollama running (ollama serve)
#
# This will run the eval 5 times and save all reports to scripts/remy-eval/reports/

RUNS=3
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPORTS_DIR="$SCRIPT_DIR/reports"

cd "$PROJECT_DIR" || exit 1

echo "============================================"
echo "  Remy Eval — Overnight Loop"
echo "  Runs: $RUNS"
echo "  Reports: $REPORTS_DIR"
echo "  Started: $(date)"
echo "============================================"
echo ""

# Pre-flight checks
echo "Pre-flight checks..."

# Check dev server
if ! curl -s -o /dev/null -w "" http://localhost:3100/ 2>/dev/null; then
  echo "ERROR: Dev server not running on port 3100"
  echo "Start it first: cd $PROJECT_DIR && npm run dev"
  exit 1
fi
echo "  ✓ Dev server running"

# Check Ollama
if ! curl -s -o /dev/null http://localhost:11434/api/tags 2>/dev/null; then
  echo "ERROR: Ollama not running"
  echo "Start it first: ollama serve"
  exit 1
fi
echo "  ✓ Ollama running"

# Pre-warm models
echo "  Warming up models..."
curl -s http://localhost:11434/api/generate -d '{"model":"qwen3:4b","prompt":"hi","stream":false,"options":{"num_predict":2}}' > /dev/null 2>&1
echo "  ✓ qwen3:4b warm"
curl -s --max-time 120 http://localhost:11434/api/generate -d '{"model":"qwen3-coder:30b","prompt":"hi","stream":false,"options":{"num_predict":2}}' > /dev/null 2>&1
echo "  ✓ qwen3-coder:30b warm"

echo ""
echo "Starting $RUNS eval runs..."
echo ""

PASSED_RUNS=0
TOTAL_PASSED=0
TOTAL_TESTS=0

for i in $(seq 1 $RUNS); do
  echo "════════════════════════════════════════════"
  echo "  RUN $i/$RUNS — $(date '+%H:%M:%S')"
  echo "════════════════════════════════════════════"

  # Restart Ollama between runs to clear any stuck state
  if [ $i -gt 1 ]; then
    echo "  Restarting Ollama between runs..."
    taskkill //F //IM ollama.exe > /dev/null 2>&1
    sleep 3
    OLLAMA_HOST=127.0.0.1:11434 nohup ollama serve > /dev/null 2>&1 &
    sleep 5
    # Re-warm
    curl -s --max-time 60 http://localhost:11434/api/generate -d '{"model":"qwen3:4b","prompt":"hi","stream":false,"options":{"num_predict":2}}' > /dev/null 2>&1
    curl -s --max-time 120 http://localhost:11434/api/generate -d '{"model":"qwen3-coder:30b","prompt":"hi","stream":false,"options":{"num_predict":2}}' > /dev/null 2>&1
    echo "  ✓ Ollama restarted and warmed"
  fi

  # Run eval
  npx tsx scripts/remy-eval/eval-harness.ts --llm 2>&1
  EXIT_CODE=$?

  if [ $EXIT_CODE -eq 0 ]; then
    # Find the most recent report
    LATEST=$(ls -t "$REPORTS_DIR"/eval-*.json 2>/dev/null | head -1)
    if [ -n "$LATEST" ]; then
      # Extract pass count using node
      SCORE=$(node -e "
        const r = require('$LATEST');
        const passed = r.results.filter(t => t.passed).length;
        const total = r.results.length;
        console.log(passed + '/' + total);
      " 2>/dev/null)
      echo ""
      echo "  Run $i result: $SCORE — saved to $(basename $LATEST)"
      PASSED_RUNS=$((PASSED_RUNS + 1))
    fi
  else
    echo ""
    echo "  Run $i FAILED (exit code $EXIT_CODE)"
  fi

  echo ""
done

echo "============================================"
echo "  OVERNIGHT RESULTS"
echo "  Completed: $PASSED_RUNS/$RUNS runs"
echo "  Reports in: $REPORTS_DIR"
echo "  Finished: $(date)"
echo "============================================"
echo ""
echo "All reports:"
ls -lt "$REPORTS_DIR"/eval-*.json 2>/dev/null | head -$RUNS
echo ""
echo "Run 'node scripts/remy-eval/summarize-overnight.mjs' for a full breakdown."

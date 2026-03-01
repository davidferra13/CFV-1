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
# This runs a curated nightly suite (~41 critical tests) across multiple runs.
# Model stays warm between runs — no Ollama restart (that was causing cold-start hangs).
# For a full 270-test run, use: npx tsx scripts/remy-eval/eval-harness.ts

RUNS=3
MAX_HOURS=6  # Abort if total wall time exceeds this
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPORTS_DIR="$SCRIPT_DIR/reports"

# Curated nightly suite — the highest-signal categories
# safety(8) + data_accuracy(8) + allergy_safety(4) + voice(7) + drafts(7) + command_routing(7) = 41 tests
NIGHTLY_CATEGORIES="safety data_accuracy allergy_safety voice drafts command_routing"

cd "$PROJECT_DIR" || exit 1

START_EPOCH=$(date +%s)

echo "============================================"
echo "  Remy Eval — Overnight Loop"
echo "  Runs: $RUNS"
echo "  Max time: ${MAX_HOURS}h"
echo "  Suite: nightly (curated ~41 tests)"
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

# Pre-warm 30b model ONCE (used for both classification and streaming)
# No Ollama restart between runs — keep the model loaded throughout.
echo "  Warming up qwen3-coder:30b..."
curl -s --max-time 120 http://localhost:11434/api/generate -d '{"model":"qwen3-coder:30b","prompt":"hi","stream":false,"options":{"num_predict":2},"keep_alive":"30m"}' > /dev/null 2>&1
echo "  ✓ qwen3-coder:30b warm (keep_alive: 30m)"

echo ""
echo "Starting $RUNS eval runs..."
echo ""

PASSED_RUNS=0

for i in $(seq 1 $RUNS); do
  # Time budget check
  NOW_EPOCH=$(date +%s)
  ELAPSED_HOURS=$(( (NOW_EPOCH - START_EPOCH) / 3600 ))
  if [ $ELAPSED_HOURS -ge $MAX_HOURS ]; then
    echo ""
    echo "⏰ Time budget exceeded (${MAX_HOURS}h). Stopping after $((i - 1)) runs."
    break
  fi

  echo "════════════════════════════════════════════"
  echo "  RUN $i/$RUNS — $(date '+%H:%M:%S')"
  echo "  Time elapsed: $((NOW_EPOCH - START_EPOCH))s"
  echo "════════════════════════════════════════════"

  # Re-ping model between runs to keep keep_alive fresh (no restart needed)
  if [ $i -gt 1 ]; then
    echo "  Refreshing model keep_alive..."
    curl -s --max-time 30 http://localhost:11434/api/generate -d '{"model":"qwen3-coder:30b","prompt":"ok","stream":false,"options":{"num_predict":1},"keep_alive":"30m"}' > /dev/null 2>&1
    echo "  ✓ Model still warm"
  fi

  # Run eval with curated nightly categories
  for CAT in $NIGHTLY_CATEGORIES; do
    echo "  ── Category: $CAT"
    npx tsx scripts/remy-eval/eval-harness.ts --category="$CAT" 2>&1
  done

  EXIT_CODE=$?

  if [ $EXIT_CODE -eq 0 ]; then
    PASSED_RUNS=$((PASSED_RUNS + 1))
  fi

  # Find the most recent report
  LATEST=$(ls -t "$REPORTS_DIR"/eval-*.json 2>/dev/null | head -1)
  if [ -n "$LATEST" ]; then
    SCORE=$(node -e "
      const r = require('$LATEST');
      const passed = r.results.filter(t => t.passed).length;
      const total = r.results.length;
      console.log(passed + '/' + total);
    " 2>/dev/null)
    echo ""
    echo "  Run $i result: $SCORE — saved to $(basename $LATEST)"
  fi

  echo ""
done

END_EPOCH=$(date +%s)
TOTAL_MIN=$(( (END_EPOCH - START_EPOCH) / 60 ))

echo "============================================"
echo "  OVERNIGHT RESULTS"
echo "  Completed runs: $PASSED_RUNS/$RUNS"
echo "  Total time: ${TOTAL_MIN} minutes"
echo "  Reports in: $REPORTS_DIR"
echo "  Finished: $(date)"
echo "============================================"
echo ""
echo "All reports:"
ls -lt "$REPORTS_DIR"/eval-*.json 2>/dev/null | head -$((RUNS * 6))
echo ""
echo "Run 'node scripts/remy-eval/summarize-overnight.mjs' for a full breakdown."

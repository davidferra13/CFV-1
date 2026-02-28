#!/bin/bash
# Remy Eval — Full Automated Pipeline
#
# One command to: seed data → run eval → generate report
# Usage: bash scripts/remy-eval/run-full-pipeline.sh
#
# Options:
#   --clean       Clean and re-seed data before eval
#   --no-grade    Skip LLM grading (faster, rules-only)
#   --verbose     Show full Remy responses
#   --category=X  Run only tests in category X
#   --id=X        Run a single test by ID

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║       Remy Eval — Full Automated Pipeline           ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ─── Pre-flight checks ──────────────────────────────────────────────────
echo "🔍 Pre-flight checks..."

# Check Ollama
if ! curl -s http://localhost:11434/api/version > /dev/null 2>&1; then
  echo "❌ Ollama is not running. Start it: ollama serve"
  exit 1
fi
echo "  ✅ Ollama is running"

# Check dev server
if ! curl -s http://localhost:3100 > /dev/null 2>&1; then
  echo "❌ Dev server is not running on port 3100."
  echo "   Start it: npm run dev"
  exit 1
fi
echo "  ✅ Dev server is running on port 3100"

# ─── Seed ────────────────────────────────────────────────────────────────
SEED_ARGS=""
if [[ "$*" == *"--clean"* ]]; then
  SEED_ARGS="--clean"
fi

echo ""
echo "📦 Seeding test data..."
npx tsx scripts/remy-eval/seed-remy-test-data.ts $SEED_ARGS

# ─── Eval ────────────────────────────────────────────────────────────────
echo ""
echo "🧪 Running eval harness..."

# Pass through relevant args
EVAL_ARGS=""
for arg in "$@"; do
  case "$arg" in
    --no-grade|--verbose|--category=*|--id=*)
      EVAL_ARGS="$EVAL_ARGS $arg"
      ;;
  esac
done

npx tsx scripts/remy-eval/eval-harness.ts $EVAL_ARGS

echo ""
echo "🏁 Pipeline complete."

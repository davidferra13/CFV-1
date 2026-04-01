#!/bin/bash
# Multi-Zip Catalog Orchestrator
#
# Runs full catalog capture for each zip code that has a session file.
# Uses per-zip session files from data/sessions/session-{zip}.json.
#
# Usage:
#   bash run-multizip-catalog.sh                          # All zips with sessions
#   bash run-multizip-catalog.sh 10001 90210              # Specific zips
#   bash run-multizip-catalog.sh --chain market-basket    # Specific chain, all zips
#
# Default chain: market-basket (available in most US metros via Instacart)

cd ~/openclaw-prices

SESSIONS_DIR="data/sessions"
LOGS_DIR="logs/multizip"
DEFAULT_CHAIN="market-basket"
CHAIN=""
SPECIFIC_ZIPS=""

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --chain)
      CHAIN="$2"
      shift 2
      ;;
    *)
      SPECIFIC_ZIPS="$SPECIFIC_ZIPS $1"
      shift
      ;;
  esac
done

CHAIN=${CHAIN:-$DEFAULT_CHAIN}
mkdir -p "$LOGS_DIR"

echo "=== Multi-Zip Catalog Capture ==="
echo "Time: $(date)"
echo "Chain: $CHAIN"
echo "Sessions dir: $SESSIONS_DIR"
echo ""

# Find session files
if [ -n "$SPECIFIC_ZIPS" ]; then
  SESSION_FILES=""
  for zip in $SPECIFIC_ZIPS; do
    f="$SESSIONS_DIR/session-${zip}.json"
    if [ -f "$f" ]; then
      SESSION_FILES="$SESSION_FILES $f"
    else
      echo "WARNING: No session file for zip $zip"
    fi
  done
else
  SESSION_FILES=$(ls $SESSIONS_DIR/session-*.json 2>/dev/null)
fi

if [ -z "$SESSION_FILES" ]; then
  echo "ERROR: No session files found in $SESSIONS_DIR/"
  echo "Run capture-multizip.mjs on PC first, then SCP sessions to Pi."
  exit 1
fi

TOTAL=$(echo $SESSION_FILES | wc -w)
echo "Found $TOTAL session files"
echo ""

SUCCESS=0
FAILED=0
SKIPPED=0

for SESSION_FILE in $SESSION_FILES; do
  # Extract zip from filename (session-10001.json -> 10001)
  ZIP=$(basename "$SESSION_FILE" | sed 's/session-//' | sed 's/\.json//')
  LOGFILE="$LOGS_DIR/${CHAIN}-${ZIP}.log"

  echo "--- [$((SUCCESS + FAILED + SKIPPED + 1))/$TOTAL] Zip: $ZIP ---"

  # Check session age (skip if older than 24 hours)
  if [ "$(uname)" = "Linux" ]; then
    AGE_SECS=$(( $(date +%s) - $(stat -c %Y "$SESSION_FILE") ))
    AGE_HOURS=$(( AGE_SECS / 3600 ))
    if [ $AGE_HOURS -gt 24 ]; then
      echo "  SKIP: Session is ${AGE_HOURS}h old (max 24h)"
      SKIPPED=$((SKIPPED + 1))
      continue
    fi
  fi

  # Phase 1: Department walker with session override
  echo "  [Phase 1] Department walker..."
  node services/instacart-department-walker.mjs "$CHAIN" --session-file "$SESSION_FILE" >> "$LOGFILE" 2>&1
  DEPT_EXIT=$?

  if [ $DEPT_EXIT -ne 0 ]; then
    echo "  [WARN] Department walker failed (exit $DEPT_EXIT)"
  fi

  sleep 15

  # Phase 2: Search walker with session override
  echo "  [Phase 2] Search walker..."
  node services/instacart-catalog-walker.mjs "$CHAIN" --session-file "$SESSION_FILE" >> "$LOGFILE" 2>&1
  SEARCH_EXIT=$?

  # Phase 3: Bridge to current_prices
  echo "  [Phase 3] Bridge catalog -> prices..."
  node scripts/bridge-catalog-to-prices.mjs >> "$LOGFILE" 2>&1

  if [ $DEPT_EXIT -eq 0 ] || [ $SEARCH_EXIT -eq 0 ]; then
    echo "  OK (dept=$DEPT_EXIT, search=$SEARCH_EXIT)"
    SUCCESS=$((SUCCESS + 1))
  else
    echo "  FAILED (dept=$DEPT_EXIT, search=$SEARCH_EXIT)"
    FAILED=$((FAILED + 1))
  fi

  # Pause between zips to be respectful
  sleep 30
done

echo ""
echo "=== RESULTS ==="
echo "Total: $TOTAL | Success: $SUCCESS | Failed: $FAILED | Skipped: $SKIPPED"
echo "Logs: $LOGS_DIR/"
echo "Completed: $(date)"

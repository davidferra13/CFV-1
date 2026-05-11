#!/usr/bin/env bash
# check-surface-drift.sh
# Detects surface drift by comparing the current app/ scan against the
# last committed docs/surface-registry.json baseline.
#
# Usage:
#   scripts/check-surface-drift.sh          # print report
#   scripts/check-surface-drift.sh --ci     # exit 1 if drift detected
#
# Can be used as a pre-commit hook or CI check.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BASELINE="$ROOT/docs/surface-registry.json"
SCANNER="$ROOT/scripts/surface-registry.ts"
TMP_NEW=$(mktemp)
CI_MODE=false

if [[ "${1:-}" == "--ci" ]]; then
  CI_MODE=true
fi

cleanup() {
  rm -f "$TMP_NEW"
}
trap cleanup EXIT

# Always run from project root so node path.resolve works
cd "$ROOT"

# ─── Check baseline exists ────────────────────────────────────────
if [[ ! -f "$BASELINE" ]]; then
  echo "[surface-drift] No baseline found at docs/surface-registry.json"
  echo "[surface-drift] Generating initial baseline..."
  cd "$ROOT" && npx tsx "$SCANNER"
  echo "[surface-drift] Baseline created. Commit docs/surface-registry.json to track drift."
  exit 0
fi

# ─── Save current baseline route paths ────────────────────────────
BASELINE_ROUTES=$(mktemp)
# Extract all route paths from the baseline JSON
node -e "
  const path = require('path');
  const data = require(path.resolve('docs/surface-registry.json'));
  for (const r of data.routes) console.log(r.path);
" | sort > "$BASELINE_ROUTES"

BASELINE_ORPHANS=$(mktemp)
node -e "
  const path = require('path');
  const data = require(path.resolve('docs/surface-registry.json'));
  for (const r of data.routes) { if (!r.inNav) console.log(r.path); }
" | sort > "$BASELINE_ORPHANS"

cleanup_extra() {
  rm -f "$BASELINE_ROUTES" "$BASELINE_ORPHANS" "$TMP_NEW"
}
trap cleanup_extra EXIT

# ─── Run fresh scan ───────────────────────────────────────────────
cd "$ROOT" && npx tsx "$SCANNER" > /dev/null 2>&1

# ─── Extract new route paths ─────────────────────────────────────
NEW_ROUTES=$(mktemp)
node -e "
  const path = require('path');
  const data = require(path.resolve('docs/surface-registry.json'));
  for (const r of data.routes) console.log(r.path);
" | sort > "$NEW_ROUTES"

NEW_ORPHANS=$(mktemp)
node -e "
  const path = require('path');
  const data = require(path.resolve('docs/surface-registry.json'));
  for (const r of data.routes) { if (!r.inNav) console.log(r.path); }
" | sort > "$NEW_ORPHANS"

cleanup_all() {
  rm -f "$BASELINE_ROUTES" "$BASELINE_ORPHANS" "$NEW_ROUTES" "$NEW_ORPHANS" "$TMP_NEW"
}
trap cleanup_all EXIT

# ─── Compare ─────────────────────────────────────────────────────
ADDED=$(comm -13 "$BASELINE_ROUTES" "$NEW_ROUTES")
REMOVED=$(comm -23 "$BASELINE_ROUTES" "$NEW_ROUTES")
NEWLY_ORPHANED=$(comm -13 "$BASELINE_ORPHANS" "$NEW_ORPHANS")

HAS_DRIFT=false

echo ""
echo "=== Surface Drift Report ==="
echo ""

BASELINE_COUNT=$(wc -l < "$BASELINE_ROUTES" | tr -d ' ')
NEW_COUNT=$(wc -l < "$NEW_ROUTES" | tr -d ' ')
echo "Baseline: $BASELINE_COUNT routes"
echo "Current:  $NEW_COUNT routes"
echo ""

if [[ -n "$ADDED" ]]; then
  HAS_DRIFT=true
  ADDED_COUNT=$(echo "$ADDED" | wc -l | tr -d ' ')
  echo "NEW ROUTES ($ADDED_COUNT):"
  echo "$ADDED" | while read -r route; do
    echo "  + $route"
  done
  echo ""
fi

if [[ -n "$REMOVED" ]]; then
  HAS_DRIFT=true
  REMOVED_COUNT=$(echo "$REMOVED" | wc -l | tr -d ' ')
  echo "REMOVED ROUTES ($REMOVED_COUNT):"
  echo "$REMOVED" | while read -r route; do
    echo "  - $route"
  done
  echo ""
fi

if [[ -n "$NEWLY_ORPHANED" ]]; then
  NEWLY_ORPHANED_COUNT=$(echo "$NEWLY_ORPHANED" | wc -l | tr -d ' ')
  echo "NEWLY ORPHANED ($NEWLY_ORPHANED_COUNT routes with no nav entry):"
  echo "$NEWLY_ORPHANED" | while read -r route; do
    echo "  ? $route"
  done
  echo ""
fi

if [[ "$HAS_DRIFT" == "false" ]]; then
  echo "No drift detected. Route surface matches baseline."
  echo ""
fi

if [[ "$CI_MODE" == "true" && "$HAS_DRIFT" == "true" ]]; then
  echo "[ci] Surface drift detected. Update docs/surface-registry.json and commit."
  exit 1
fi

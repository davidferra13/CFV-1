#!/bin/bash
# Deploy Sentinel test files to Raspberry Pi
# Run this from the CFv1 project root on your dev machine
# Usage: bash scripts/sentinel/deploy-to-pi.sh [pi-host]

set -e

PI_HOST="${1:-10.0.0.177}"
PI_USER="david"
SENTINEL_DIR="/home/$PI_USER/sentinel"
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "=== Deploying Sentinel to Pi ($PI_HOST) ==="

# Files to sync
FILES=(
  "playwright.sentinel.config.ts"
  "tests/sentinel/smoke.spec.ts"
  "tests/sentinel/critical-paths.spec.ts"
  "tests/sentinel/data-verification.spec.ts"
  "tests/sentinel/regression.spec.ts"
  "tests/sentinel/helpers/sentinel-utils.ts"
)

# Ensure remote directories exist
ssh "$PI_USER@$PI_HOST" "mkdir -p $SENTINEL_DIR/tests/sentinel/helpers $SENTINEL_DIR/results"

# Copy each file
for f in "${FILES[@]}"; do
  echo "  Copying $f"
  scp "$PROJECT_ROOT/$f" "$PI_USER@$PI_HOST:$SENTINEL_DIR/$f"
done

echo ""
echo "=== Deploy Complete ==="
echo "Files synced to $PI_USER@$PI_HOST:$SENTINEL_DIR"
echo ""
echo "To run smoke test on Pi:"
echo "  ssh $PI_USER@$PI_HOST 'cd ~/sentinel && npx playwright test --config=playwright.sentinel.config.ts --project=sentinel-smoke'"

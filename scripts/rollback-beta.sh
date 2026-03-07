#!/bin/bash
# ============================================
# ChefFlow Beta Rollback - Local PC
# ============================================
# Rolls back to the previous commit and redeploys.
# With ~2 min builds on PC, redeploying is faster
# than managing backup directories.
#
# Usage: bash scripts/rollback-beta.sh
# ============================================
set -e

SOURCE_DIR="C:/Users/david/Documents/CFv1"
cd "$SOURCE_DIR"

CURRENT_COMMIT=$(git rev-parse --short HEAD)
PREV_COMMIT=$(git rev-parse --short HEAD~1)

echo ""
echo "=========================================="
echo "  ChefFlow Beta Rollback"
echo "=========================================="
echo "  Current: $CURRENT_COMMIT"
echo "  Rolling back to: $PREV_COMMIT"
echo "=========================================="
echo ""

# Stash any uncommitted work
STASHED=false
if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
  echo "  Stashing uncommitted changes..."
  git stash
  STASHED=true
fi

# Checkout previous commit
git checkout HEAD~1

# Deploy
echo "  Deploying previous commit..."
bash scripts/deploy-beta.sh

# Return to original branch
git checkout -

# Restore stashed work
if [ "$STASHED" = true ]; then
  echo "  Restoring stashed changes..."
  git stash pop
fi

echo ""
echo "=========================================="
echo "  Rollback complete"
echo "  Beta is running commit $PREV_COMMIT"
echo "  Your working directory is back to normal"
echo "=========================================="

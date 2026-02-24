#!/bin/bash
# ============================================
# ChefFlow Beta Rollback Script
# ============================================
# Rolls back the Pi beta server to the previous build.
# Usage: bash scripts/rollback-beta.sh
# ============================================
set -e

REMOTE="pi"

echo ""
echo "=========================================="
echo "  ChefFlow Beta Rollback"
echo "=========================================="
echo ""

ssh "$REMOTE" << 'ROLLBACK'
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  cd ~/apps/chefflow-beta

  if [ -d .next.backup ]; then
    rm -rf .next
    mv .next.backup .next
    pm2 restart chefflow-beta
    echo "Rolled back to previous build"
    echo "Verifying..."
    sleep 3
    STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3100)
    echo "Health check: $STATUS"
  else
    echo "ERROR: No backup found at .next.backup"
    echo "Cannot rollback."
    exit 1
  fi
ROLLBACK

echo ""
echo "=========================================="
echo "  Rollback complete"
echo "  https://beta.cheflowhq.com restored"
echo "=========================================="

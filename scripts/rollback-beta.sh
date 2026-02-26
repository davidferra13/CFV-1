#!/bin/bash
# ============================================
# ChefFlow Beta Rollback Script
# ============================================
# Rolls back the Pi beta server to the previous build.
# Usage: bash scripts/rollback-beta.sh
# ============================================
set -e

REMOTE="pi"
SSH_OPTS="-o ConnectTimeout=10 -o ServerAliveInterval=30 -o ServerAliveCountMax=20"

echo ""
echo "=========================================="
echo "  ChefFlow Beta Rollback"
echo "=========================================="
echo ""

ssh $SSH_OPTS "$REMOTE" << 'ROLLBACK'
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  cd ~/apps/chefflow-beta

  if [ -d .next.backup ] && [ -f .next.backup/BUILD_ID ]; then
    rm -rf .next
    mv .next.backup .next
    echo "Rolled back to build $(cat .next/BUILD_ID)"
    pm2 restart chefflow-beta
    echo "Verifying..."
    sleep 5
    STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://localhost:3100)
    echo "Health check: HTTP $STATUS"
  else
    echo "ERROR: No valid backup found (missing .next.backup or BUILD_ID)"
    echo "Cannot rollback — a fresh deploy is needed."
    exit 1
  fi
ROLLBACK

echo ""
echo "=========================================="
echo "  Rollback complete"
echo "  https://beta.cheflowhq.com restored"
echo "=========================================="

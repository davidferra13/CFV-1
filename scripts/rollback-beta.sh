#!/bin/bash
# ============================================
# ChefFlow Beta Rollback Script (PC-only)
# ============================================
# Rolls back the local beta server to the previous build.
# Usage: bash scripts/rollback-beta.sh
# ============================================
set -e

BETA_DIR="/c/Users/david/Documents/CFv1-beta"

echo ""
echo "=========================================="
echo "  ChefFlow Beta Rollback (PC)"
echo "=========================================="
echo ""

cd "$BETA_DIR"

# Clean up any leftover staging dir from a failed deploy
rm -rf .next-staging 2>/dev/null || true

if [ -d .next.backup ] && [ -f .next.backup/BUILD_ID ]; then
  # Kill current beta server on port 3200
  EXISTING_PID=$(netstat -ano 2>/dev/null | grep ":3200 " | grep "LISTENING" | awk '{print $5}' | head -1)
  if [ -n "$EXISTING_PID" ] && [ "$EXISTING_PID" != "0" ]; then
    taskkill //PID "$EXISTING_PID" //F 2>/dev/null || true
    sleep 2
  fi

  rm -rf .next
  mv .next.backup .next
  echo "  Rolled back to build $(cat .next/BUILD_ID)"

  # Restart beta server
  NODE_ENV=production nohup npx next start -p 3200 > beta-server.log 2>&1 &
  echo "  Beta server restarting..."
  sleep 5

  STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://localhost:3200 2>/dev/null)
  echo "  Health check: HTTP $STATUS"
else
  echo "  ERROR: No valid backup found (missing .next.backup or BUILD_ID)"
  echo "  Cannot rollback. A fresh deploy is needed."
  exit 1
fi

echo ""
echo "=========================================="
echo "  Rollback complete"
echo "  http://localhost:3200 restored"
echo "=========================================="

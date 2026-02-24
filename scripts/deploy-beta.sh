#!/bin/bash
# ============================================
# ChefFlow Beta Deploy Script
# ============================================
# Deploys the current branch to the Raspberry Pi beta server.
# Usage: bash scripts/deploy-beta.sh
# ============================================
set -e

REMOTE="pi"
APP_DIR="~/apps/chefflow-beta"
BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo ""
echo "=========================================="
echo "  ChefFlow Beta Deploy"
echo "=========================================="
echo "  Branch: $BRANCH"
echo "  Target: $REMOTE:$APP_DIR"
echo "=========================================="
echo ""

# Step 1: Push latest code to GitHub
echo "[1/7] Pushing to GitHub..."
git push origin "$BRANCH" 2>/dev/null || echo "  (push skipped — may already be up to date)"

# Step 2: Sync code to Pi (rsync preferred, fallback to git)
echo "[2/7] Syncing code to Pi..."
ssh "$REMOTE" "cd $APP_DIR && git fetch origin && git reset --hard origin/$BRANCH"

# Step 3: Copy latest .env.local.beta
echo "[3/7] Syncing beta environment config..."
scp "$(dirname "$0")/../.env.local.beta" "$REMOTE:$APP_DIR/.env.local"

# Step 4: Backup current build
echo "[4/7] Backing up current build..."
ssh "$REMOTE" "cd $APP_DIR && if [ -d .next ]; then rm -rf .next.backup && cp -r .next .next.backup && echo '  Backup saved'; else echo '  No existing build to back up'; fi"

# Step 5: Stop Ollama, install deps, build
echo "[5/7] Building on Pi (this takes ~5-10 minutes)..."
ssh "$REMOTE" << 'BUILD'
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  cd ~/apps/chefflow-beta

  # Stop Ollama to free RAM for build
  sudo systemctl stop ollama 2>/dev/null || true
  echo "  Ollama stopped"

  # Install dependencies
  npm ci --production=false 2>&1 | tail -3
  echo "  Dependencies installed"

  # Build with increased heap
  NODE_OPTIONS="--max-old-space-size=4096" npx next build 2>&1 | tail -5
  BUILD_EXIT=$?

  # Restart Ollama
  sudo systemctl start ollama 2>/dev/null || true
  echo "  Ollama restarted"

  if [ $BUILD_EXIT -ne 0 ]; then
    echo "  BUILD FAILED! Rolling back..."
    if [ -d .next.backup ]; then
      rm -rf .next
      mv .next.backup .next
      echo "  Rolled back to previous build"
    fi
    exit 1
  fi
BUILD

# Step 6: Restart the app
echo "[6/7] Restarting app..."
ssh "$REMOTE" << 'RESTART'
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  cd ~/apps/chefflow-beta
  pm2 restart chefflow-beta 2>/dev/null || pm2 start "npx next start -p 3100" --name chefflow-beta
  pm2 save
RESTART

# Step 7: Verify
echo "[7/7] Verifying..."
sleep 3
STATUS=$(ssh "$REMOTE" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3100" 2>/dev/null)
if [ "$STATUS" = "200" ]; then
  echo ""
  echo "=========================================="
  echo "  Deploy SUCCESS!"
  echo "  https://beta.cheflowhq.com is updated"
  echo "=========================================="
else
  echo ""
  echo "=========================================="
  echo "  WARNING: Health check returned $STATUS"
  echo "  Check logs: ssh pi 'pm2 logs chefflow-beta'"
  echo "=========================================="
fi

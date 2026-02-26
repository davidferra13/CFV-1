#!/bin/bash
# ============================================
# ChefFlow Beta Deploy Script
# ============================================
# Deploys the current branch to the Raspberry Pi beta server.
# Memory-safe: stops Ollama during build (if running), uses 6GB heap,
# restarts app via ecosystem.config.cjs with proper memory caps.
# NOTE: Ollama is intentionally NOT restarted after deploy — it caused
# OOM crashes. The beta server does not need a local LLM.
#
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

# SSH options applied to ALL ssh/scp commands in this script
SSH_OPTS="-o ConnectTimeout=10 -o ServerAliveInterval=30 -o ServerAliveCountMax=20"

# Step 0: Pre-flight — verify SSH works
echo "[0/8] Checking Pi connectivity..."
if ! ssh $SSH_OPTS "$REMOTE" "echo OK" > /dev/null 2>&1; then
  echo "  ERROR: Cannot reach Pi via SSH."
  echo "  The Pi may need a physical reboot, or sshd is hung."
  echo "  Once SSH works, re-run this script."
  exit 1
fi
echo "  Pi is reachable."

# Step 1: Push latest code to GitHub
echo "[1/8] Pushing to GitHub..."
git push origin "$BRANCH" 2>/dev/null || echo "  (push skipped — may already be up to date)"

# Step 2: Stop Ollama FIRST to free memory for everything that follows
echo "[2/8] Stopping Ollama to free memory for build..."
ssh $SSH_OPTS "$REMOTE" "sudo systemctl stop ollama 2>/dev/null || true; sleep 1; echo '  Ollama stopped'; free -m | grep Mem"

# Step 3: Sync code to Pi
echo "[3/8] Syncing code to Pi..."
ssh $SSH_OPTS "$REMOTE" "cd $APP_DIR && git fetch origin && git reset --hard origin/$BRANCH"

# Step 4: Copy latest .env.local.beta + ecosystem config
echo "[4/8] Syncing beta environment config..."
scp $SSH_OPTS "$(dirname "$0")/../.env.local.beta" "$REMOTE:$APP_DIR/.env.local"

# Step 5: Backup current build
echo "[5/8] Backing up current build..."
ssh $SSH_OPTS "$REMOTE" "cd $APP_DIR && if [ -d .next ]; then rm -rf .next.backup && cp -r .next .next.backup && echo '  Backup saved'; else echo '  No existing build to back up'; fi"

# Step 6: Install deps + build (6GB heap — app requires this as of Feb 2026)
echo "[6/8] Building on Pi (this takes ~8-10 minutes)..."
ssh $SSH_OPTS "$REMOTE" << 'BUILD'
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  cd ~/apps/chefflow-beta

  # Stop PM2 app too during build to maximize available memory
  pm2 stop chefflow-beta 2>/dev/null || true
  echo "  PM2 app stopped for build"

  # Show available memory before build
  echo "  Memory before build:"
  free -m | grep -E "Mem|Swap"

  # Install dependencies
  rm -rf node_modules/.package-lock.json 2>/dev/null || true
  npm ci --production=false 2>&1 | tail -5 || {
    echo "  npm ci failed — retrying with clean node_modules..."
    rm -rf node_modules
    npm ci --production=false 2>&1 | tail -5
  }
  echo "  Dependencies installed"

  # Build with 6GB heap — app has grown past 4GB (OOMs at 4096 as of 2026-02-26)
  # Pi has 8GB RAM + 4GB swap. Ollama + PM2 are stopped, so ~7GB available.
  NODE_OPTIONS="--max-old-space-size=6144" npx next build 2>&1 | tail -10
  BUILD_EXIT=$?

  if [ $BUILD_EXIT -ne 0 ]; then
    echo "  BUILD FAILED! Rolling back..."
    if [ -d .next.backup ]; then
      rm -rf .next
      mv .next.backup .next
      echo "  Rolled back to previous build"
    fi
    exit 1
  fi

  echo "  Build succeeded"
BUILD

# Step 7: Restart the app using ecosystem config (memory-capped)
echo "[7/8] Restarting app with memory limits..."
ssh $SSH_OPTS "$REMOTE" << 'RESTART'
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  cd ~/apps/chefflow-beta

  # Use ecosystem config if it exists (has memory caps), otherwise fallback
  if [ -f ecosystem.config.cjs ]; then
    pm2 delete chefflow-beta 2>/dev/null || true
    pm2 start ecosystem.config.cjs
    echo "  App started via ecosystem.config.cjs (1.5GB heap cap)"
  else
    NODE_OPTIONS="--max-old-space-size=1536" pm2 restart chefflow-beta 2>/dev/null || \
    NODE_OPTIONS="--max-old-space-size=1536" pm2 start "npx next start -p 3100" --name chefflow-beta
    echo "  App started (1.5GB heap cap)"
  fi
  pm2 save

  # Ollama intentionally NOT started — it uses ~5.5 GB RAM and caused
  # repeated OOM crashes that made the Pi unreachable. The beta server
  # does not need a local LLM. Ollama runs on the PC for dev work.

  # Final memory status
  echo ""
  echo "  Final memory status:"
  free -m | grep -E "Mem|Swap"
RESTART

# Step 8: Verify — wait for PM2 to fully start the new process before checking
echo "[8/8] Verifying (waiting 8s for PM2 process to initialize)..."
sleep 8

# Retry health check up to 3 times (new process may need a moment to bind)
HEALTH_OK=false
for i in 1 2 3; do
  STATUS=$(ssh $SSH_OPTS "$REMOTE" "curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://localhost:3100" 2>/dev/null)
  if [ "$STATUS" = "200" ] || [ "$STATUS" = "302" ] || [ "$STATUS" = "307" ]; then
    HEALTH_OK=true
    break
  fi
  echo "  Health check attempt $i: HTTP $STATUS (retrying in 3s...)"
  sleep 3
done

if [ "$HEALTH_OK" = true ]; then
  echo ""
  echo "=========================================="
  echo "  Deploy SUCCESS! (HTTP $STATUS)"
  echo "  https://beta.cheflowhq.com is updated"
  echo "=========================================="
else
  echo ""
  echo "=========================================="
  echo "  WARNING: Health check failed (last status: $STATUS)"
  echo "  The server may still be starting up."
  echo "  Check logs: ssh pi 'pm2 logs chefflow-beta'"
  echo "=========================================="
fi

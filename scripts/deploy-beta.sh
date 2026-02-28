#!/bin/bash
# ============================================
# ChefFlow Beta Deploy Script
# ============================================
# Deploys the current branch to the Raspberry Pi beta server.
#
# Zero-downtime: builds into .next-staging while the live server keeps
# running, then swaps directories and restarts PM2 (~2s downtime).
#
# Build caching: seeds .next-staging/cache from the previous build's
# .next/cache for incremental compilation (branch-aware — only reuses
# cache from the same branch).
#
# Memory-safe: checks available RAM before building. If the Pi is low
# on memory, stops PM2 first (old behavior). Otherwise PM2 stays live.
#
# Usage: bash scripts/deploy-beta.sh
# ============================================
set -e

REMOTE="pi"
APP_DIR="~/apps/chefflow-beta"
BRANCH=$(git rev-parse --abbrev-ref HEAD)
DEPLOY_START=$(date +%s)

echo ""
echo "=========================================="
echo "  ChefFlow Beta Deploy"
echo "=========================================="
echo "  Branch: $BRANCH"
echo "  Target: $REMOTE:$APP_DIR"
echo "  Mode:   Zero-downtime (staging build)"
echo "=========================================="
echo ""

# SSH options applied to ALL ssh/scp commands in this script
# ControlMaster multiplexes all SSH connections over a single socket (~1-2s saved per step)
SSH_OPTS="-o ConnectTimeout=10 -o ServerAliveInterval=30 -o ServerAliveCountMax=20 -o ControlMaster=auto -o ControlPath=/tmp/ssh-deploy-%r@%h -o ControlPersist=300"

# Clean up SSH multiplexed socket on exit (normal or error)
cleanup_ssh() {
  ssh -O exit -o ControlPath=/tmp/ssh-deploy-%r@%h "$REMOTE" 2>/dev/null || true
}
trap cleanup_ssh EXIT

# Step 0: Pre-flight — verify SSH works
echo "[0/10] Checking Pi connectivity..."
if ! ssh $SSH_OPTS "$REMOTE" "echo OK" > /dev/null 2>&1; then
  echo "  ERROR: Cannot reach Pi via SSH."
  echo "  The Pi may need a physical reboot, or sshd is hung."
  echo "  Once SSH works, re-run this script."
  exit 1
fi
echo "  Pi is reachable."

# Step 1: Pre-deploy database backup (non-blocking — deploy continues even if backup fails)
echo "[1/10] Backing up database..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if bash "$SCRIPT_DIR/backup-db.sh" --quiet 2>/dev/null; then
  echo "  Database backed up to backups/"
else
  echo "  Backup skipped (Supabase CLI not available or offline)"
fi

# Step 2: Push latest code to GitHub
echo "[2/10] Pushing to GitHub..."
git push origin "$BRANCH" 2>/dev/null || echo "  (push skipped — may already be up to date)"

# Step 2: Stop Ollama to free memory (safety — it's masked, but handle both cases)
echo "[3/10] Stopping Ollama to free memory for build..."
ssh $SSH_OPTS "$REMOTE" "sudo systemctl stop ollama 2>/dev/null || true; sleep 1; echo '  Ollama stopped'; free -m | grep Mem"

# Step 3: Sync code to Pi
echo "[4/10] Syncing code to Pi..."
ssh $SSH_OPTS "$REMOTE" "cd $APP_DIR && git fetch origin && git reset --hard origin/$BRANCH"

# Step 4: Copy latest .env.local.beta
echo "[5/10] Syncing beta environment config..."
scp $SSH_OPTS "$(dirname "$0")/../.env.local.beta" "$REMOTE:$APP_DIR/.env.local"

# Step 5: Check memory — decide if PM2 stays running during build
echo "[6/10] Checking available memory..."
STOPPED_PM2=false
AVAIL_MB=$(ssh $SSH_OPTS "$REMOTE" "free -m | grep Mem | awk '{print \$7}'" 2>/dev/null)
echo "  Available RAM: ${AVAIL_MB}MB"

if [ -n "$AVAIL_MB" ] && [ "$AVAIL_MB" -lt 2000 ] 2>/dev/null; then
  echo "  Low memory — stopping PM2 for build safety (old behavior)"
  ssh $SSH_OPTS "$REMOTE" << 'STOP_PM2'
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
    pm2 stop chefflow-beta 2>/dev/null || true
    echo "  PM2 stopped"
STOP_PM2
  STOPPED_PM2=true
else
  echo "  Sufficient memory — PM2 stays running (zero-downtime mode)"
fi

# Step 6: Seed cache + build into .next-staging
BUILD_START=$(date +%s)
echo "[7/10] Building on Pi into .next-staging..."
if [ "$STOPPED_PM2" = false ]; then
  echo "  Live server stays running at beta.cheflowhq.com during build."
fi
ssh $SSH_OPTS "$REMOTE" << 'BUILD'
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  cd ~/apps/chefflow-beta

  # Show available memory before build
  echo "  Memory before build:"
  free -m | grep -E "Mem|Swap"

  # Clean any leftover staging dir from a previous failed build
  rm -rf .next-staging 2>/dev/null || true
  mkdir -p .next-staging

  # Branch-aware cache seeding — only reuse cache from the same branch
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
  CACHED_BRANCH=""
  if [ -f .next/cache/.branch ]; then
    CACHED_BRANCH=$(cat .next/cache/.branch)
  fi

  if [ -d .next/cache ] && [ "$CURRENT_BRANCH" = "$CACHED_BRANCH" ]; then
    cp -a .next/cache .next-staging/cache
    echo "  Seeded build cache (same branch: $CURRENT_BRANCH)"
  elif [ -d .next/cache ]; then
    echo "  Branch changed ($CACHED_BRANCH -> $CURRENT_BRANCH) — fresh cache"
  else
    echo "  No previous cache — full rebuild"
  fi

  # Install dependencies
  # Pi microSD has ENOTEMPTY race conditions with npm ci (which always deletes node_modules).
  # Use npm install instead — it updates in-place without nuking the directory.
  npm install --production=false 2>&1 | tail -5 || {
    echo "  npm install failed — cleaning node_modules and retrying..."
    sudo rm -rf node_modules 2>/dev/null || true
    npm install --production=false 2>&1 | tail -5 || true
  }
  echo "  Dependencies installed"

  # Build into .next-staging (live server keeps serving from .next)
  # 6GB heap — app has grown past 4GB (OOMs at 4096 as of 2026-02-26)
  NEXT_DIST_DIR=.next-staging NODE_OPTIONS="--max-old-space-size=6144" npx next build 2>&1 | tail -20
  BUILD_EXIT=$?

  # Verify BUILD_ID exists in staging dir
  if [ ! -f .next-staging/BUILD_ID ]; then
    echo "  BUILD FAILED — no BUILD_ID in .next-staging"
    BUILD_EXIT=1
  fi

  if [ $BUILD_EXIT -ne 0 ]; then
    echo "  BUILD FAILED! Cleaning staging dir."
    echo "  Live server is still running (unchanged)."
    rm -rf .next-staging 2>/dev/null
    exit 1
  fi

  # Stamp the branch in cache for next deploy's cache seeding
  echo "$CURRENT_BRANCH" > .next-staging/cache/.branch 2>/dev/null || true

  echo "  Build succeeded (staged in .next-staging)"
BUILD

BUILD_END=$(date +%s)
BUILD_DURATION=$((BUILD_END - BUILD_START))
BUILD_MIN=$((BUILD_DURATION / 60))
BUILD_SEC=$((BUILD_DURATION % 60))
echo "  Build time: ${BUILD_MIN}m ${BUILD_SEC}s"

# Step 7: Atomic swap — staging → live, old live → backup
echo "[8/10] Swapping builds..."
ssh $SSH_OPTS "$REMOTE" << 'SWAP'
  cd ~/apps/chefflow-beta

  # Backup current live build
  rm -rf .next.backup 2>/dev/null || true
  if [ -d .next ] && [ -f .next/BUILD_ID ]; then
    mv .next .next.backup
    echo "  Previous build backed up (BUILD_ID: $(cat .next.backup/BUILD_ID))"
  else
    echo "  No valid live build to back up"
    rm -rf .next 2>/dev/null || true
  fi

  # Promote staging to live
  mv .next-staging .next
  echo "  Staging build promoted to live (BUILD_ID: $(cat .next/BUILD_ID))"
SWAP

# Step 8: Restart PM2 via ecosystem.config.cjs (~2s downtime)
echo "[9/10] Restarting app..."
ssh $SSH_OPTS "$REMOTE" << 'RESTART'
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  cd ~/apps/chefflow-beta

  # Use ecosystem config (has memory caps + graceful shutdown)
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

# Step 9: Verify — wait for PM2 to fully start the new process before checking
echo "[10/10] Verifying (waiting 8s for PM2 process to initialize)..."
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

# Calculate total deploy time
DEPLOY_END=$(date +%s)
DEPLOY_DURATION=$((DEPLOY_END - DEPLOY_START))
DEPLOY_MIN=$((DEPLOY_DURATION / 60))
DEPLOY_SEC=$((DEPLOY_DURATION % 60))

if [ "$HEALTH_OK" = true ]; then
  # Log successful deploy to Pi
  BUILD_ID=$(ssh $SSH_OPTS "$REMOTE" "cat $APP_DIR/.next/BUILD_ID 2>/dev/null || echo unknown")
  COMMIT=$(git rev-parse --short HEAD)
  ssh $SSH_OPTS "$REMOTE" "echo '$(date -u +%Y-%m-%dT%H:%M:%SZ) | branch=$BRANCH | commit=$COMMIT | build=$BUILD_ID | build_time=${BUILD_MIN}m${BUILD_SEC}s | total=${DEPLOY_MIN}m${DEPLOY_SEC}s' >> ~/apps/deploy-history.log"

  echo ""
  echo "=========================================="
  echo "  Deploy SUCCESS! (HTTP $STATUS)"
  echo "  https://beta.cheflowhq.com is updated"
  echo "  Mode:       Zero-downtime (staging build)"
  echo "  Build time: ${BUILD_MIN}m ${BUILD_SEC}s"
  echo "  Total time: ${DEPLOY_MIN}m ${DEPLOY_SEC}s"
  echo "=========================================="
else
  # Auto-rollback: restore previous build if health check failed
  echo ""
  echo "  Health check FAILED — auto-rolling back..."
  ssh $SSH_OPTS "$REMOTE" << 'AUTO_ROLLBACK'
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
    cd ~/apps/chefflow-beta

    # Clean leftover staging dir
    rm -rf .next-staging 2>/dev/null || true

    if [ -d .next.backup ] && [ -f .next.backup/BUILD_ID ]; then
      rm -rf .next
      mv .next.backup .next
      echo "  Rolled back to build $(cat .next/BUILD_ID)"
      pm2 restart chefflow-beta 2>/dev/null || true
      sleep 5
      ROLLBACK_STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://localhost:3100)
      echo "  Rollback health check: HTTP $ROLLBACK_STATUS"
    else
      echo "  ERROR: No backup available for rollback"
      echo "  Manual intervention required: ssh pi 'pm2 logs chefflow-beta'"
    fi
AUTO_ROLLBACK

  # Log failed deploy
  COMMIT=$(git rev-parse --short HEAD)
  ssh $SSH_OPTS "$REMOTE" "echo '$(date -u +%Y-%m-%dT%H:%M:%SZ) | branch=$BRANCH | commit=$COMMIT | FAILED+ROLLBACK | total=${DEPLOY_MIN}m${DEPLOY_SEC}s' >> ~/apps/deploy-history.log" 2>/dev/null || true

  echo ""
  echo "=========================================="
  echo "  Deploy FAILED — auto-rolled back"
  echo "  Previous build restored"
  echo "  Total time: ${DEPLOY_MIN}m ${DEPLOY_SEC}s"
  echo "  Check logs: ssh pi 'pm2 logs chefflow-beta'"
  echo "  Deploy log: ssh pi 'cat ~/apps/deploy-history.log'"
  echo "=========================================="
fi

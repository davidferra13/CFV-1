#!/bin/bash
# ============================================
# ChefFlow Beta Deploy Script (PC-only)
# ============================================
# Builds and deploys the current branch to the local beta server
# at C:\Users\david\Documents\CFv1-beta on port 3200.
#
# Zero-downtime: builds into .next-staging while the live server
# keeps running, then swaps directories and restarts.
#
# Usage: bash scripts/deploy-beta.sh
# ============================================
set -e

BETA_DIR="/c/Users/david/Documents/CFv1-beta"
BRANCH=$(git rev-parse --abbrev-ref HEAD)
DEPLOY_START=$(date +%s)

echo ""
echo "=========================================="
echo "  ChefFlow Beta Deploy (PC)"
echo "=========================================="
echo "  Branch: $BRANCH"
echo "  Target: $BETA_DIR (localhost:3200)"
echo "=========================================="
echo ""

# Step 0: Verify beta directory exists
if [ ! -d "$BETA_DIR" ]; then
  echo "  ERROR: Beta directory not found at $BETA_DIR"
  echo "  Create it first: mkdir -p '$BETA_DIR'"
  exit 1
fi

# Step 1: Push latest code to GitHub
echo "[1/7] Pushing to GitHub..."
git push origin "$BRANCH" 2>/dev/null || echo "  (push skipped, may already be up to date)"

# Step 2: Sync code to beta directory
echo "[2/7] Syncing code to beta directory..."
rsync -a --delete \
  --exclude='.next' \
  --exclude='.next-staging' \
  --exclude='.next.backup' \
  --exclude='node_modules' \
  --exclude='.env.local' \
  --exclude='.git' \
  ./ "$BETA_DIR/"
echo "  Code synced."

# Step 3: Copy beta environment config
echo "[3/7] Syncing beta environment config..."
cp .env.local.beta "$BETA_DIR/.env.local"
echo "  .env.local.beta copied."

# Step 4: Install dependencies
echo "[4/7] Installing dependencies..."
cd "$BETA_DIR"
npm install --production=false 2>&1 | tail -5
echo "  Dependencies installed."

# Step 5: Build into .next-staging
BUILD_START=$(date +%s)
echo "[5/7] Building into .next-staging..."

# Clean any leftover staging dir
rm -rf .next-staging 2>/dev/null || true
mkdir -p .next-staging

# Seed cache from previous build (same branch only)
CACHED_BRANCH=""
if [ -f .next/cache/.branch ]; then
  CACHED_BRANCH=$(cat .next/cache/.branch)
fi

if [ -d .next/cache ] && [ "$BRANCH" = "$CACHED_BRANCH" ]; then
  cp -a .next/cache .next-staging/cache
  echo "  Seeded build cache (same branch: $BRANCH)"
elif [ -d .next/cache ]; then
  echo "  Branch changed ($CACHED_BRANCH -> $BRANCH), fresh cache"
else
  echo "  No previous cache, full rebuild"
fi

# Build (12GB heap for large app)
NEXT_DIST_DIR=.next-staging NODE_OPTIONS="--max-old-space-size=12288" npx next build 2>&1 | tail -20
BUILD_EXIT=$?

if [ ! -f .next-staging/BUILD_ID ]; then
  echo "  BUILD FAILED: no BUILD_ID in .next-staging"
  BUILD_EXIT=1
fi

if [ $BUILD_EXIT -ne 0 ]; then
  echo "  BUILD FAILED! Cleaning staging dir."
  rm -rf .next-staging 2>/dev/null
  exit 1
fi

echo "$BRANCH" > .next-staging/cache/.branch 2>/dev/null || true
echo "  Build succeeded (staged in .next-staging)"

BUILD_END=$(date +%s)
BUILD_DURATION=$((BUILD_END - BUILD_START))
BUILD_MIN=$((BUILD_DURATION / 60))
BUILD_SEC=$((BUILD_DURATION % 60))
echo "  Build time: ${BUILD_MIN}m ${BUILD_SEC}s"

# Step 6: Atomic swap
echo "[6/7] Swapping builds..."
rm -rf .next.backup 2>/dev/null || true
if [ -d .next ] && [ -f .next/BUILD_ID ]; then
  mv .next .next.backup
  echo "  Previous build backed up (BUILD_ID: $(cat .next.backup/BUILD_ID))"
else
  rm -rf .next 2>/dev/null || true
fi
mv .next-staging .next
echo "  Staging build promoted to live (BUILD_ID: $(cat .next/BUILD_ID))"

# Step 7: Restart beta server
echo "[7/7] Restarting beta server on port 3200..."

# Kill any existing process on port 3200
EXISTING_PID=$(netstat -ano 2>/dev/null | grep ":3200 " | grep "LISTENING" | awk '{print $5}' | head -1)
if [ -n "$EXISTING_PID" ] && [ "$EXISTING_PID" != "0" ]; then
  taskkill //PID "$EXISTING_PID" //F 2>/dev/null || true
  sleep 2
fi

# Start Next.js production server in background
NODE_ENV=production nohup npx next start -p 3200 > beta-server.log 2>&1 &
BETA_PID=$!
echo "  Beta server started (PID: $BETA_PID)"

# Wait for startup
sleep 8

# Health check (retry up to 3 times)
HEALTH_OK=false
for i in 1 2 3; do
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://localhost:3200 2>/dev/null)
  if [ "$STATUS" = "200" ] || [ "$STATUS" = "302" ] || [ "$STATUS" = "307" ]; then
    HEALTH_OK=true
    break
  fi
  echo "  Health check attempt $i: HTTP $STATUS (retrying in 3s...)"
  sleep 3
done

DEPLOY_END=$(date +%s)
DEPLOY_DURATION=$((DEPLOY_END - DEPLOY_START))
DEPLOY_MIN=$((DEPLOY_DURATION / 60))
DEPLOY_SEC=$((DEPLOY_DURATION % 60))

if [ "$HEALTH_OK" = true ]; then
  echo ""
  echo "=========================================="
  echo "  Deploy SUCCESS! (HTTP $STATUS)"
  echo "  http://localhost:3200 is updated"
  echo "  Build time: ${BUILD_MIN}m ${BUILD_SEC}s"
  echo "  Total time: ${DEPLOY_MIN}m ${DEPLOY_SEC}s"
  echo "=========================================="
else
  echo ""
  echo "  Health check FAILED, rolling back..."
  # Kill the failing server
  kill $BETA_PID 2>/dev/null || true

  if [ -d .next.backup ] && [ -f .next.backup/BUILD_ID ]; then
    rm -rf .next
    mv .next.backup .next
    echo "  Rolled back to build $(cat .next/BUILD_ID)"
    NODE_ENV=production nohup npx next start -p 3200 > beta-server.log 2>&1 &
    sleep 5
    ROLLBACK_STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://localhost:3200 2>/dev/null)
    echo "  Rollback health check: HTTP $ROLLBACK_STATUS"
  else
    echo "  ERROR: No backup available for rollback"
  fi

  echo ""
  echo "=========================================="
  echo "  Deploy FAILED, rolled back"
  echo "  Total time: ${DEPLOY_MIN}m ${DEPLOY_SEC}s"
  echo "  Check: cat $BETA_DIR/beta-server.log"
  echo "=========================================="
fi

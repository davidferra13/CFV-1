#!/bin/bash
# ============================================
# ChefFlow Beta Deploy - Local PC
# ============================================
# Builds and deploys beta on the same machine.
# Syncs code from CFv1 to CFv1-beta, builds,
# and restarts the beta server on port 3200.
#
# Usage: bash scripts/deploy-beta.sh
# ============================================
set -e

SOURCE_DIR="C:/Users/david/Documents/CFv1"
BETA_DIR="C:/Users/david/Documents/CFv1-beta"
BRANCH=$(git rev-parse --abbrev-ref HEAD)
DEPLOY_START=$(date +%s)

echo ""
echo "=========================================="
echo "  ChefFlow Beta Deploy (Local)"
echo "=========================================="
echo "  Branch: $BRANCH"
echo "  Source: $SOURCE_DIR"
echo "  Beta:   $BETA_DIR"
echo "=========================================="
echo ""

# Step 1: Push to GitHub (backup)
echo "[1/7] Pushing to GitHub..."
git push origin "$BRANCH" 2>/dev/null || echo "  (already up to date)"

# Step 2: Database backup (non-blocking)
echo "[2/7] Backing up database..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if bash "$SCRIPT_DIR/backup-db.sh" --quiet 2>/dev/null; then
  echo "  Database backed up to backups/"
else
  echo "  Backup skipped (Supabase CLI not available or offline)"
fi

# Step 3: Sync code to beta directory
echo "[3/7] Syncing code to beta directory..."
rsync -a --delete \
  --exclude='.next' \
  --exclude='node_modules' \
  --exclude='.env.local' \
  --exclude='.git' \
  --exclude='backups' \
  --exclude='.auth' \
  --exclude='beta-server.log' \
  "$SOURCE_DIR/" "$BETA_DIR/"

# Step 4: Copy beta env
echo "[4/7] Setting beta environment..."
cp "$SOURCE_DIR/.env.local.beta" "$BETA_DIR/.env.local"

# Step 5: Install deps (fast - node_modules cached from previous deploy)
echo "[5/7] Installing dependencies..."
cd "$BETA_DIR"
npm install --production=false 2>&1 | tail -3

# Step 6: Build
echo "[6/7] Building..."
BUILD_START=$(date +%s)
npx next build --no-lint 2>&1 | tail -15
BUILD_EXIT=$?
BUILD_END=$(date +%s)
BUILD_DURATION=$((BUILD_END - BUILD_START))

if [ $BUILD_EXIT -ne 0 ]; then
  echo ""
  echo "=========================================="
  echo "  BUILD FAILED"
  echo "  Beta server unchanged (previous build still running)"
  echo "=========================================="
  exit 1
fi

echo "  Build time: $((BUILD_DURATION / 60))m $((BUILD_DURATION % 60))s"

# Step 7: Restart beta server
echo "[7/7] Restarting beta server..."
cd "$SOURCE_DIR"

# Kill existing beta server on port 3200
BETA_PID=$(netstat -ano 2>/dev/null | grep ':3200.*LISTENING' | awk '{print $5}' | head -1)
if [ -n "$BETA_PID" ] && [ "$BETA_PID" != "0" ]; then
  taskkill //F //PID "$BETA_PID" 2>/dev/null || true
  sleep 2
fi

# Start beta server in background
cd "$BETA_DIR"
NODE_ENV=production nohup npx next start -p 3200 >> beta-server.log 2>&1 &
BETA_PID=$!
echo "  Beta server started (PID: $BETA_PID)"

# Health check (wait for server to bind)
cd "$SOURCE_DIR"
sleep 5
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

# Calculate total deploy time
DEPLOY_END=$(date +%s)
TOTAL=$((DEPLOY_END - DEPLOY_START))

# Log deploy
COMMIT=$(git rev-parse --short HEAD)
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | branch=$BRANCH | commit=$COMMIT | build_time=$((BUILD_DURATION / 60))m$((BUILD_DURATION % 60))s | total=$((TOTAL / 60))m$((TOTAL % 60))s" >> "$SOURCE_DIR/docs/deploy-history.log"

if [ "$HEALTH_OK" = true ]; then
  echo ""
  echo "=========================================="
  echo "  Deploy SUCCESS (HTTP $STATUS)"
  echo "  https://beta.cheflowhq.com is updated"
  echo "  Build: $((BUILD_DURATION / 60))m $((BUILD_DURATION % 60))s"
  echo "  Total: $((TOTAL / 60))m $((TOTAL % 60))s"
  echo "=========================================="
else
  echo ""
  echo "=========================================="
  echo "  Deploy WARNING - Build succeeded but health check failed (HTTP $STATUS)"
  echo "  The server may still be starting up."
  echo "  Check: curl http://localhost:3200"
  echo "  Logs:  tail -50 $BETA_DIR/beta-server.log"
  echo "=========================================="
  exit 1
fi

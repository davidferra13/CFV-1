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
RELEASE_NAME=".next-release-$(date +%Y%m%d%H%M%S)"
RELEASE_DIR="$BETA_DIR/$RELEASE_NAME"
BACKUP_DIR="$BETA_DIR/.next-prev"

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
# Use robocopy on Windows (rsync equivalent). Exit codes 0-7 are success for robocopy.
# Run via cmd.exe to avoid bash/robocopy interaction issues.
cmd.exe /c "robocopy \"C:\\Users\\david\\Documents\\CFv1\" \"C:\\Users\\david\\Documents\\CFv1-beta\" /MIR /XD .next .next-dev node_modules .git backups .auth .claude test-results playwright-report /XF .env.local beta-server.log /NFL /NDL /NJH /NJS /NC /NS /NP" > /dev/null 2>&1 || true
# Verify sync: force-copy key source files if robocopy missed them (Windows timestamp edge case)
for check_file in lib/auth/route-policy.ts middleware.ts next.config.js; do
  if ! cmp -s "$SOURCE_DIR/$check_file" "$BETA_DIR/$check_file" 2>/dev/null; then
    echo "  WARNING: robocopy missed $check_file, force-copying..."
    cp "$SOURCE_DIR/$check_file" "$BETA_DIR/$check_file"
  fi
done
echo "  Code synced"

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
rm -rf "$RELEASE_DIR"
set +e
export NEXT_DIST_DIR="$RELEASE_NAME"
export NODE_OPTIONS="--max-old-space-size=16384"
npx next build --no-lint 2>&1 | tail -15
BUILD_EXIT=${PIPESTATUS[0]}
# Fallback: if PIPESTATUS failed (non-bash shell), check if build output exists
if [ -z "$BUILD_EXIT" ] || [ "$BUILD_EXIT" = "" ]; then
  if [ -f "$RELEASE_DIR/BUILD_ID" ]; then BUILD_EXIT=0; else BUILD_EXIT=1; fi
fi
unset NEXT_DIST_DIR
set -e
BUILD_END=$(date +%s)
BUILD_DURATION=$((BUILD_END - BUILD_START))

if [ $BUILD_EXIT -ne 0 ]; then
  rm -rf "$RELEASE_DIR"
  echo ""
  echo "=========================================="
  echo "  BUILD FAILED"
  echo "  Beta server unchanged (previous build still running)"
  echo "=========================================="
  exit 1
fi

if [ ! -f "$RELEASE_DIR/BUILD_ID" ]; then
  echo ""
  echo "=========================================="
  echo "  BUILD FAILED"
  echo "  Release directory missing BUILD_ID: $RELEASE_DIR"
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

# Swap the completed release into place only after a successful build.
rm -rf "$BACKUP_DIR"
if [ -d "$BETA_DIR/.next" ]; then
  mv "$BETA_DIR/.next" "$BACKUP_DIR"
fi
mv "$RELEASE_DIR" "$BETA_DIR/.next"

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
mkdir -p "$SOURCE_DIR/docs"
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | branch=$BRANCH | commit=$COMMIT | build_time=$((BUILD_DURATION / 60))m$((BUILD_DURATION % 60))s | total=$((TOTAL / 60))m$((TOTAL % 60))s" >> "$SOURCE_DIR/docs/deploy-history.log"

if [ "$HEALTH_OK" = true ]; then
  rm -rf "$BACKUP_DIR"
  echo ""
  echo "=========================================="
  echo "  Deploy SUCCESS (HTTP $STATUS)"
  echo "  https://beta.cheflowhq.com is updated"
  echo "  Build: $((BUILD_DURATION / 60))m $((BUILD_DURATION % 60))s"
  echo "  Total: $((TOTAL / 60))m $((TOTAL % 60))s"
  echo "=========================================="
else
  echo "  Rolling back to previous build..."
  taskkill //F //PID "$BETA_PID" 2>/dev/null || true
  rm -rf "$BETA_DIR/.next"
  if [ -d "$BACKUP_DIR" ]; then
    mv "$BACKUP_DIR" "$BETA_DIR/.next"
    cd "$BETA_DIR"
    NODE_ENV=production nohup npx next start -p 3200 >> beta-server.log 2>&1 &
    sleep 5
  fi
  echo ""
  echo "=========================================="
  echo "  Deploy WARNING - Build succeeded but health check failed (HTTP $STATUS)"
  echo "  The server may still be starting up."
  echo "  Check: curl http://localhost:3200"
  echo "  Logs:  tail -50 $BETA_DIR/beta-server.log"
  echo "=========================================="
  exit 1
fi

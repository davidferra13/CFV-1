#!/bin/bash
# ============================================
# ChefFlow Production Deploy Script (PC-only)
# ============================================
# Builds and deploys the current branch to the local production server
# at C:\Users\david\Documents\CFv1-prod on port 3300.
#
# Zero-downtime: builds into .next-staging while the live server
# keeps running, then swaps directories and restarts.
#
# Usage: bash scripts/deploy-prod.sh
# ============================================
set -e

PROD_DIR="/c/Users/david/Documents/CFv1-prod"
BRANCH=$(git rev-parse --abbrev-ref HEAD)
DEPLOY_START=$(date +%s)

echo ""
echo "=========================================="
echo "  ChefFlow PRODUCTION Deploy (PC)"
echo "=========================================="
echo "  Branch: $BRANCH"
echo "  Target: $PROD_DIR (localhost:3300)"
echo "  Domain: app.cheflowhq.com"
echo "=========================================="
echo ""

# Safety: only deploy from main branch
if [ "$BRANCH" != "main" ]; then
  echo "  WARNING: Deploying from '$BRANCH' (not main)"
  echo "  Press Ctrl+C to cancel, or wait 5 seconds to continue..."
  sleep 5
fi

# Step 0: Verify prod directory exists
if [ ! -d "$PROD_DIR" ]; then
  echo "  Creating production directory at $PROD_DIR..."
  mkdir -p "$PROD_DIR"
fi

# Step 1: Push latest code to GitHub
echo "[1/7] Pushing to GitHub..."
git push origin "$BRANCH" 2>/dev/null || echo "  (push skipped, may already be up to date)"

# Step 2: Sync code to prod directory
echo "[2/7] Syncing code to production directory..."

SRC_WIN=$(cygpath -w "$(pwd)")
DST_WIN=$(cygpath -w "$PROD_DIR")

set +e
robocopy "$SRC_WIN" "$DST_WIN" //MIR //NFL //NDL //NJH //NJS //NP \
  //XD .next .next-staging .next.backup node_modules .git \
  //XF .env.local \
  > /dev/null 2>&1
RC_EXIT=$?
set -e
if [ $RC_EXIT -ge 8 ]; then
  echo "  ERROR: robocopy failed with exit code $RC_EXIT"
  exit 1
fi
echo "  Code synced."

# Step 3: Copy production environment config
echo "[3/7] Syncing production environment config..."
cp .env.local.prod "$PROD_DIR/.env.local"
echo "  .env.local.prod copied."

# Step 4: Install dependencies
echo "[4/7] Installing dependencies..."
cd "$PROD_DIR"
npm install --production=false 2>&1 | tail -5
echo "  Dependencies installed."

# Step 5: Build into .next-staging
BUILD_START=$(date +%s)
echo "[5/7] Building into .next-staging..."

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

# Step 7: Restart production server
echo "[7/7] Restarting production server on port 3300..."

# Kill any existing process on port 3300
EXISTING_PID=$(netstat -ano 2>/dev/null | grep ":3300 " | grep "LISTENING" | awk '{print $5}' | head -1)
if [ -n "$EXISTING_PID" ] && [ "$EXISTING_PID" != "0" ]; then
  taskkill //PID "$EXISTING_PID" //F 2>/dev/null || true
  sleep 2
fi

# Start Next.js production server hidden (no visible window)
powershell.exe -NoProfile -Command "
  \$psi = New-Object System.Diagnostics.ProcessStartInfo
  \$psi.FileName = 'node'
  \$psi.Arguments = '\"$(cygpath -w "$PROD_DIR")\node_modules\next\dist\bin\next\" start -p 3300'
  \$psi.WorkingDirectory = '$(cygpath -w "$PROD_DIR")'
  \$psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
  \$psi.CreateNoWindow = \$true
  \$psi.UseShellExecute = \$false
  \$psi.EnvironmentVariables['NODE_ENV'] = 'production'
  \$psi.EnvironmentVariables['PORT'] = '3300'
  \$proc = [System.Diagnostics.Process]::Start(\$psi)
  Write-Output \$proc.Id
" > /tmp/prod-pid.txt 2>/dev/null
PROD_PID=$(cat /tmp/prod-pid.txt | tr -d '\r\n ')
echo "  Production server started hidden (PID: $PROD_PID)"

# Wait for startup
sleep 8

# Health check
HEALTH_OK=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HEALTH_SCRIPT=""
if [ -f "$SCRIPT_DIR/health-check.sh" ]; then
  HEALTH_SCRIPT="$SCRIPT_DIR/health-check.sh"
elif [ -f "/c/Users/david/Documents/CFv1/scripts/health-check.sh" ]; then
  HEALTH_SCRIPT="/c/Users/david/Documents/CFv1/scripts/health-check.sh"
fi

if [ -n "$HEALTH_SCRIPT" ]; then
  echo "  Running full health check..."
  if bash "$HEALTH_SCRIPT" http://localhost:3300; then
    HEALTH_OK=true
    STATUS="200"
  else
    HEALTH_OK=false
    STATUS="FAIL"
  fi
else
  for i in 1 2 3; do
    STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://localhost:3300 2>/dev/null)
    if [ "$STATUS" = "200" ] || [ "$STATUS" = "302" ] || [ "$STATUS" = "307" ]; then
      HEALTH_OK=true
      break
    fi
    echo "  Health check attempt $i: HTTP $STATUS (retrying in 3s...)"
    sleep 3
  done
fi

DEPLOY_END=$(date +%s)
DEPLOY_DURATION=$((DEPLOY_END - DEPLOY_START))
DEPLOY_MIN=$((DEPLOY_DURATION / 60))
DEPLOY_SEC=$((DEPLOY_DURATION % 60))

if [ "$HEALTH_OK" = true ]; then
  echo ""
  echo "=========================================="
  echo "  PRODUCTION Deploy SUCCESS! (HTTP $STATUS)"
  echo "  http://localhost:3300 -> app.cheflowhq.com"
  echo "  Build time: ${BUILD_MIN}m ${BUILD_SEC}s"
  echo "  Total time: ${DEPLOY_MIN}m ${DEPLOY_SEC}s"
  echo "=========================================="
else
  echo ""
  echo "  Health check FAILED, rolling back..."
  kill $PROD_PID 2>/dev/null || true

  if [ -d .next.backup ] && [ -f .next.backup/BUILD_ID ]; then
    rm -rf .next
    mv .next.backup .next
    echo "  Rolled back to build $(cat .next/BUILD_ID)"
    powershell.exe -NoProfile -Command "
      \$psi = New-Object System.Diagnostics.ProcessStartInfo
      \$psi.FileName = 'node'
      \$psi.Arguments = '\"$(cygpath -w "$PROD_DIR")\node_modules\next\dist\bin\next\" start -p 3300'
      \$psi.WorkingDirectory = '$(cygpath -w "$PROD_DIR")'
      \$psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
      \$psi.CreateNoWindow = \$true
      \$psi.UseShellExecute = \$false
      \$psi.EnvironmentVariables['NODE_ENV'] = 'production'
      [System.Diagnostics.Process]::Start(\$psi) | Out-Null
    " 2>/dev/null
    sleep 5
    ROLLBACK_STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://localhost:3300 2>/dev/null)
    echo "  Rollback health check: HTTP $ROLLBACK_STATUS"
  else
    echo "  ERROR: No backup available for rollback"
  fi

  echo ""
  echo "=========================================="
  echo "  PRODUCTION Deploy FAILED, rolled back"
  echo "  Total time: ${DEPLOY_MIN}m ${DEPLOY_SEC}s"
  echo "  Check: cat $PROD_DIR/prod-server.log"
  echo "=========================================="
fi

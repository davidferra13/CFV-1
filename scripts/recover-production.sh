#!/bin/bash
# ============================================
# ChefFlow Production Emergency Recovery
# ============================================
# Run this script ON THE RASPBERRY PI when app.cheflowhq.com is down.
#
# Usage:
#   ssh davidferra@10.0.0.177
#   bash ~/apps/chefflow-prod/scripts/recover-production.sh
#
# Or remotely:
#   ssh davidferra@10.0.0.177 'bash ~/apps/chefflow-prod/scripts/recover-production.sh'
# ============================================

set -e

APP_DIR="/home/davidferra/apps/chefflow-prod"
PM2_NAME="chefflow-prod"
PORT=3000
HEALTH_URL="http://localhost:$PORT/api/health/ping"
MAX_WAIT=60

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "============================================"
echo "ChefFlow Production Recovery"
echo "$(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"
echo ""

# Step 1: Check current PM2 status
log_info "Checking PM2 status..."
pm2 list

# Step 2: Check if process exists
if pm2 describe "$PM2_NAME" > /dev/null 2>&1; then
    log_info "Process '$PM2_NAME' exists in PM2"
    
    # Get process status
    STATUS=$(pm2 jlist | jq -r ".[] | select(.name==\"$PM2_NAME\") | .pm2_env.status")
    log_info "Current status: $STATUS"
    
    if [ "$STATUS" = "online" ]; then
        log_warn "Process is online but may be unresponsive. Forcing restart..."
        pm2 restart "$PM2_NAME"
    else
        log_info "Process is $STATUS. Starting..."
        pm2 start "$PM2_NAME"
    fi
else
    log_warn "Process '$PM2_NAME' not found in PM2. Starting fresh..."
    
    cd "$APP_DIR"
    
    # Check if ecosystem config exists
    if [ -f "ecosystem.prod.config.cjs" ]; then
        pm2 start ecosystem.prod.config.cjs
    else
        # Fallback: start directly
        log_warn "No ecosystem config found. Starting with defaults..."
        pm2 start node_modules/.bin/next --name "$PM2_NAME" -- start -p $PORT
    fi
fi

# Step 3: Wait for health check
log_info "Waiting for app to become healthy (max ${MAX_WAIT}s)..."

for i in $(seq 1 $MAX_WAIT); do
    if curl -s --max-time 5 "$HEALTH_URL" | grep -q '"status":"ok"'; then
        echo ""
        log_info "Health check passed!"
        break
    fi
    
    if [ $i -eq $MAX_WAIT ]; then
        echo ""
        log_error "Health check failed after ${MAX_WAIT}s"
        log_info "Checking logs..."
        pm2 logs "$PM2_NAME" --lines 30 --nostream
        exit 1
    fi
    
    printf "."
    sleep 1
done

# Step 4: Show final status
echo ""
log_info "Final status:"
pm2 list

# Step 5: Save PM2 state (so it restarts on reboot)
pm2 save

echo ""
log_info "Recovery complete. Check https://app.cheflowhq.com"

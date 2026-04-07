#!/bin/bash
# ============================================
# ChefFlow Pi-Side Auto-Recovery Watchdog
# ============================================
# Runs ON THE RASPBERRY PI as a cron job or systemd timer.
# Checks if production and beta are healthy, restarts if down.
#
# Install on Pi:
#   crontab -e
#   */2 * * * * /home/davidferra/apps/chefflow-prod/scripts/pi-watchdog.sh >> /home/davidferra/.pm2/logs/watchdog.log 2>&1
#
# Or as systemd timer (see ops/systemd/chefflow-watchdog.timer)
# ============================================

LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')]"
TIMEOUT=10

# Health check endpoints (localhost, not via Cloudflare)
PROD_URL="http://localhost:3000/api/health/ping"
BETA_URL="http://localhost:3100/api/health/ping"

check_and_recover() {
    local name="$1"
    local url="$2"
    local pm2_name="$3"
    
    # Check health
    response=$(curl -s --max-time $TIMEOUT "$url" 2>/dev/null)
    
    if echo "$response" | grep -q '"status":"ok"'; then
        # Healthy - do nothing
        return 0
    else
        echo "$LOG_PREFIX ALERT: $name is unhealthy. Restarting $pm2_name..."
        
        # Check if PM2 process exists
        if pm2 describe "$pm2_name" > /dev/null 2>&1; then
            pm2 restart "$pm2_name"
        else
            echo "$LOG_PREFIX Process $pm2_name not found in PM2!"
            return 1
        fi
        
        # Wait and verify
        sleep 10
        
        verify=$(curl -s --max-time $TIMEOUT "$url" 2>/dev/null)
        if echo "$verify" | grep -q '"status":"ok"'; then
            echo "$LOG_PREFIX RECOVERED: $name is back up"
            return 0
        else
            echo "$LOG_PREFIX FAILED: $name still down after restart"
            return 1
        fi
    fi
}

# Check production
check_and_recover "Production" "$PROD_URL" "chefflow-prod"

# Check beta (optional - comment out if not running beta)
# check_and_recover "Beta" "$BETA_URL" "chefflow-beta"

exit 0

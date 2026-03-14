#!/bin/bash
# Pi Health Check — Run via cron on the Raspberry Pi
# Restarts PM2 if Next.js is alive but not responding on port 3100.
# Also checks disk space and logs warnings.
#
# Install on Pi:
#   crontab -e
#   */5 * * * * /home/davidferra/apps/chefflow-beta/scripts/pi-health-check.sh >> /home/davidferra/health-check.log 2>&1
#
# Requires: curl, pm2 (via nvm)

export PATH="/home/davidferra/.nvm/versions/node/v20.20.0/bin:$PATH"

LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')]"
APP_NAME="chefflow-beta"
HEALTH_URL="http://localhost:3100/api/health"
DISK_WARN_PERCENT=85

# ─── HTTP Health Check ──────────────────────────────────────────────────────

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$HEALTH_URL" 2>/dev/null)

if [ "$HTTP_CODE" = "200" ]; then
  # Healthy — no action needed
  :
elif [ "$HTTP_CODE" = "000" ]; then
  # Connection refused or timeout — app is down or frozen
  echo "$LOG_PREFIX WARN: Health check failed (HTTP $HTTP_CODE). Restarting $APP_NAME..."
  pm2 restart "$APP_NAME" --silent
  sleep 5
  RETRY_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$HEALTH_URL" 2>/dev/null)
  if [ "$RETRY_CODE" = "200" ]; then
    echo "$LOG_PREFIX OK: $APP_NAME recovered after restart (HTTP $RETRY_CODE)"
  else
    echo "$LOG_PREFIX ERROR: $APP_NAME still down after restart (HTTP $RETRY_CODE)"
  fi
else
  echo "$LOG_PREFIX WARN: Health check returned HTTP $HTTP_CODE"
fi

# ─── Disk Space Check ───────────────────────────────────────────────────────

DISK_USED=$(df / | awk 'NR==2 {gsub(/%/,""); print $5}')

if [ "$DISK_USED" -ge "$DISK_WARN_PERCENT" ]; then
  echo "$LOG_PREFIX ALERT: Disk usage at ${DISK_USED}% (threshold: ${DISK_WARN_PERCENT}%)"
  # Clean up old PM2 logs to free space
  pm2 flush --silent 2>/dev/null
fi

#!/bin/bash
# ============================================
# ChefFlow Uptime Watchdog
# ============================================
# Lightweight uptime monitor that runs independently of Mission Control.
# Pings beta and production every 5 minutes, logs failures,
# and sends desktop notifications on Windows when a service goes down.
#
# Usage:
#   bash scripts/uptime-watchdog.sh              # foreground (Ctrl+C to stop)
#   bash scripts/uptime-watchdog.sh --daemon &    # background
#
# To run on startup, add to Windows Task Scheduler:
#   Action: bash
#   Arguments: scripts/uptime-watchdog.sh --daemon
#   Start in: C:\Users\david\Documents\CFv1
#   Trigger: At log on
#
# Alternatively, set up UptimeRobot (free, 50 monitors, 5-min interval):
#   1. Sign up at https://uptimerobot.com
#   2. Add HTTP(s) monitor: https://beta.cheflowhq.com/api/health
#   3. Add HTTP(s) monitor: https://app.cheflowhq.com/api/health
#   4. Set alert contacts (email, SMS, Slack)
#   5. Set keyword check: response must contain "ok"
# ============================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="$PROJECT_ROOT/backups/uptime-watchdog.log"
INTERVAL=300  # 5 minutes
TIMEOUT=10    # seconds per check

# Services to monitor
BETA_URL="https://beta.cheflowhq.com/api/health"
PROD_URL="https://app.cheflowhq.com/api/health"
BETA_LOCAL_URL="http://localhost:3200/api/health"

# Track previous state to avoid spam (only notify on state change)
BETA_WAS_DOWN=false
PROD_WAS_DOWN=false
BETA_LOCAL_WAS_DOWN=false

mkdir -p "$(dirname "$LOG_FILE")"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') | $1" >> "$LOG_FILE"
  if [ "$DAEMON" != true ]; then
    echo "$(date '+%H:%M:%S') | $1"
  fi
}

# Windows desktop notification via PowerShell
notify() {
  local title="$1"
  local message="$2"
  powershell -NoProfile -Command "
    [void][System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms')
    \$n = New-Object System.Windows.Forms.NotifyIcon
    \$n.Icon = [System.Drawing.SystemIcons]::Warning
    \$n.BalloonTipTitle = '$title'
    \$n.BalloonTipText = '$message'
    \$n.BalloonTipIcon = 'Error'
    \$n.Visible = \$true
    \$n.ShowBalloonTip(10000)
    Start-Sleep -Seconds 5
    \$n.Dispose()
  " 2>/dev/null &
}

check_http() {
  local url="$1"
  local status
  status=$(curl -s -o /dev/null -w '%{http_code}' --max-time "$TIMEOUT" "$url" 2>/dev/null)
  if [ "$status" = "200" ]; then
    echo "up"
  else
    echo "down:$status"
  fi
}

# Parse args
DAEMON=false
if [ "$1" = "--daemon" ] || [ "$1" = "-d" ]; then
  DAEMON=true
fi

log "Watchdog started (interval: ${INTERVAL}s)"

while true; do
  # Check beta (external via Cloudflare Tunnel)
  BETA_STATUS=$(check_http "$BETA_URL")
  if [ "$BETA_STATUS" = "up" ]; then
    if [ "$BETA_WAS_DOWN" = true ]; then
      log "RECOVERED: Beta (external) is back up"
      BETA_WAS_DOWN=false
    fi
  else
    if [ "$BETA_WAS_DOWN" = false ]; then
      log "ALERT: Beta (external) is DOWN ($BETA_STATUS)"
      notify "ChefFlow Alert" "Beta server is DOWN ($BETA_STATUS)"
      BETA_WAS_DOWN=true
    fi
  fi

  # Check beta (local port 3200)
  BETA_LOCAL_STATUS=$(check_http "$BETA_LOCAL_URL")
  if [ "$BETA_LOCAL_STATUS" = "up" ]; then
    if [ "$BETA_LOCAL_WAS_DOWN" = true ]; then
      log "RECOVERED: Beta (localhost:3200) is back up"
      BETA_LOCAL_WAS_DOWN=false
    fi
  else
    if [ "$BETA_LOCAL_WAS_DOWN" = false ]; then
      log "ALERT: Beta (localhost:3200) is DOWN ($BETA_LOCAL_STATUS)"
      notify "ChefFlow Alert" "Beta local server is DOWN ($BETA_LOCAL_STATUS)"
      BETA_LOCAL_WAS_DOWN=true
    fi
  fi

  # Check production
  PROD_STATUS=$(check_http "$PROD_URL")
  if [ "$PROD_STATUS" = "up" ]; then
    if [ "$PROD_WAS_DOWN" = true ]; then
      log "RECOVERED: Production is back up"
      PROD_WAS_DOWN=false
    fi
  else
    if [ "$PROD_WAS_DOWN" = false ]; then
      log "ALERT: Production is DOWN ($PROD_STATUS)"
      notify "ChefFlow Alert" "Production is DOWN ($PROD_STATUS)"
      PROD_WAS_DOWN=true
    fi
  fi

  sleep "$INTERVAL"
done

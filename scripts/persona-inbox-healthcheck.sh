#!/usr/bin/env bash
# External health check for persona-inbox server (port 3977)
# Run via Task Scheduler every 5 minutes as defense-in-depth behind PM2.
# Logs to system/persona-inbox-healthcheck.log

LOGFILE="$(dirname "$(dirname "$0")")/system/persona-inbox-healthcheck.log"
MAX_LOG_LINES=500

log() {
  echo "[$(date -Iseconds)] $1" >> "$LOGFILE"
}

# Prune log if too large
if [ -f "$LOGFILE" ]; then
  lines=$(wc -l < "$LOGFILE" 2>/dev/null || echo 0)
  if [ "$lines" -gt "$MAX_LOG_LINES" ]; then
    tail -n "$MAX_LOG_LINES" "$LOGFILE" > "$LOGFILE.tmp" && mv "$LOGFILE.tmp" "$LOGFILE"
  fi
fi

# Check if server responds
STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://127.0.0.1:3977/healthz 2>/dev/null)

if [ "$STATUS" = "200" ] || [ "$STATUS" = "503" ]; then
  # 200 = healthy, 503 = degraded (Ollama down) but server is alive
  exit 0
fi

log "ALERT: persona-inbox not responding (HTTP $STATUS)"

# Check if PM2 is running
if ! command -v pm2 &>/dev/null; then
  log "ERROR: pm2 not found in PATH"
  exit 1
fi

# Try PM2 restart
log "Attempting pm2 restart persona-inbox..."
pm2 restart persona-inbox >> "$LOGFILE" 2>&1

# Wait and recheck
sleep 5
RECHECK=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://127.0.0.1:3977/healthz 2>/dev/null)

if [ "$RECHECK" = "200" ] || [ "$RECHECK" = "503" ]; then
  log "RECOVERED: persona-inbox back online after pm2 restart"
else
  log "FAILED: persona-inbox still down after restart (HTTP $RECHECK)"
  # Last resort: try pm2 resurrect in case process was deleted
  log "Attempting pm2 resurrect..."
  pm2 resurrect >> "$LOGFILE" 2>&1
fi

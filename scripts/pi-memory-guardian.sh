#!/bin/bash
# =============================================================
# ChefFlow Pi Memory Guardian
# =============================================================
# Runs every 30 seconds via systemd timer on the Raspberry Pi.
# Monitors system memory and takes escalating action to prevent
# the Pi from becoming unresponsive.
#
# PRIORITY ORDER (what gets killed first → last):
#   1. Ollama (5.2GB — biggest hog, non-critical, can restart)
#   2. PM2/Next.js app (~1-2GB — important but recoverable)
#   3. cloudflared (tiny — NEVER kill, it's our tunnel)
#   4. sshd (tiny — NEVER kill, it's our lifeline)
#
# THRESHOLDS:
#   < 1000MB free → WARNING: unload Ollama model from memory
#   <  500MB free → CRITICAL: stop Ollama entirely
#   <  200MB free → EMERGENCY: restart PM2 app (force GC)
#   <  100MB free → LAST RESORT: kill all non-essential processes
#
# Install: sudo bash /home/davidferra/apps/chefflow-beta/scripts/pi-safeguard-install.sh
# =============================================================

set -uo pipefail

LOG_PREFIX="[memory-guardian]"
GUARDIAN_LOG="/var/log/chefflow-memory-guardian.log"
STATE_FILE="/tmp/chefflow-guardian-state"

# Thresholds in MB
WARN_THRESHOLD=1000
CRITICAL_THRESHOLD=500
EMERGENCY_THRESHOLD=200
LAST_RESORT_THRESHOLD=100

# ── Logging ──────────────────────────────────────────────────

log() {
  local msg="$(date '+%Y-%m-%d %H:%M:%S') $LOG_PREFIX $1"
  echo "$msg" >> "$GUARDIAN_LOG"
}

log_warn() {
  local msg="$(date '+%Y-%m-%d %H:%M:%S') $LOG_PREFIX [WARN] $1"
  echo "$msg" >> "$GUARDIAN_LOG"
}

log_crit() {
  local msg="$(date '+%Y-%m-%d %H:%M:%S') $LOG_PREFIX [CRITICAL] $1"
  echo "$msg" >> "$GUARDIAN_LOG"
}

log_emergency() {
  local msg="$(date '+%Y-%m-%d %H:%M:%S') $LOG_PREFIX [EMERGENCY] $1"
  echo "$msg" >> "$GUARDIAN_LOG"
}

# ── Memory Check ─────────────────────────────────────────────

get_available_mb() {
  # MemAvailable is the best metric — includes reclaimable cache
  local available_kb
  available_kb=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
  echo $(( available_kb / 1024 ))
}

get_total_mb() {
  local total_kb
  total_kb=$(grep MemTotal /proc/meminfo | awk '{print $2}')
  echo $(( total_kb / 1024 ))
}

get_swap_used_mb() {
  local swap_total swap_free
  swap_total=$(grep SwapTotal /proc/meminfo | awk '{print $2}')
  swap_free=$(grep SwapFree /proc/meminfo | awk '{print $2}')
  echo $(( (swap_total - swap_free) / 1024 ))
}

# ── State Tracking (prevent repeated actions) ────────────────

get_state() {
  if [ -f "$STATE_FILE" ]; then
    cat "$STATE_FILE"
  else
    echo "ok"
  fi
}

set_state() {
  echo "$1" > "$STATE_FILE"
}

# ── Actions (escalating severity) ────────────────────────────

action_unload_model() {
  # Ask Ollama to unload models from memory (keeps service running)
  log_warn "Unloading Ollama models to free memory..."

  # Ollama unloads models if you set keep_alive to 0
  curl -s -X POST http://localhost:11434/api/generate \
    -d '{"model":"qwen3:8b","keep_alive":0}' \
    --max-time 5 > /dev/null 2>&1 || true

  # Also try to drop filesystem caches
  sync
  echo 3 | sudo tee /proc/sys/vm/drop_caches > /dev/null 2>&1 || true

  log_warn "Model unload requested + caches dropped"
}

action_stop_ollama() {
  log_crit "Stopping Ollama to free ~5GB memory..."
  sudo systemctl stop ollama 2>/dev/null || true

  # Kill any lingering ollama processes
  pkill -f ollama_llama_server 2>/dev/null || true
  pkill -f "ollama serve" 2>/dev/null || true

  sleep 2
  local after=$(get_available_mb)
  log_crit "Ollama stopped. Available memory: ${after}MB"
}

action_restart_app() {
  log_emergency "Restarting PM2 app to reclaim memory..."

  export NVM_DIR="/home/davidferra/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

  # Restart with reduced heap
  cd /home/davidferra/apps/chefflow-beta 2>/dev/null || true
  NODE_OPTIONS="--max-old-space-size=1536" pm2 restart chefflow-beta 2>/dev/null || true

  sleep 3
  local after=$(get_available_mb)
  log_emergency "App restarted. Available memory: ${after}MB"
}

action_last_resort() {
  log_emergency "LAST RESORT: Killing non-essential processes..."

  # Stop Ollama if somehow still running
  sudo systemctl stop ollama 2>/dev/null || true
  pkill -9 -f ollama 2>/dev/null || true

  # Kill any stray node processes (not PM2 daemon)
  pkill -f "next build" 2>/dev/null || true
  pkill -f "npm ci" 2>/dev/null || true

  # Force drop caches
  sync
  echo 3 | sudo tee /proc/sys/vm/drop_caches > /dev/null 2>&1 || true

  sleep 2
  local after=$(get_available_mb)
  log_emergency "Last resort actions taken. Available memory: ${after}MB"

  if [ "$after" -lt "$LAST_RESORT_THRESHOLD" ]; then
    log_emergency "MEMORY STILL CRITICALLY LOW (${after}MB). System may need physical reboot."
  fi
}

# ── Recovery (bring services back when memory is healthy) ─────

action_recover() {
  local prev_state=$(get_state)

  if [ "$prev_state" = "critical" ] || [ "$prev_state" = "emergency" ]; then
    log "Memory recovered. Restarting Ollama..."
    sudo systemctl start ollama 2>/dev/null || true
    sleep 3
    log "Ollama restarted after recovery"
  fi
}

# ── Main ─────────────────────────────────────────────────────

main() {
  local available=$(get_available_mb)
  local total=$(get_total_mb)
  local swap_used=$(get_swap_used_mb)
  local prev_state=$(get_state)

  # Last resort
  if [ "$available" -lt "$LAST_RESORT_THRESHOLD" ]; then
    log_emergency "AVAILABLE: ${available}MB / ${total}MB (swap used: ${swap_used}MB) — LAST RESORT"
    action_stop_ollama
    action_last_resort
    set_state "last_resort"
    return
  fi

  # Emergency
  if [ "$available" -lt "$EMERGENCY_THRESHOLD" ]; then
    log_emergency "AVAILABLE: ${available}MB / ${total}MB (swap used: ${swap_used}MB) — EMERGENCY"
    action_stop_ollama
    action_restart_app
    set_state "emergency"
    return
  fi

  # Critical
  if [ "$available" -lt "$CRITICAL_THRESHOLD" ]; then
    log_crit "AVAILABLE: ${available}MB / ${total}MB (swap used: ${swap_used}MB) — CRITICAL"
    action_stop_ollama
    set_state "critical"
    return
  fi

  # Warning
  if [ "$available" -lt "$WARN_THRESHOLD" ]; then
    log_warn "AVAILABLE: ${available}MB / ${total}MB (swap used: ${swap_used}MB) — WARNING"
    action_unload_model
    set_state "warning"
    return
  fi

  # Healthy — recover if we were in a bad state
  if [ "$prev_state" != "ok" ]; then
    log "AVAILABLE: ${available}MB / ${total}MB — RECOVERED (was: $prev_state)"
    action_recover
  fi

  set_state "ok"
}

main "$@"

#!/bin/bash
# =============================================================
# ChefFlow Pi Watchdog — Self-Healing Cron Script
# Runs on the Raspberry Pi every 60 seconds via cron.
#
# Best practices adopted:
#   - Google SRE: health check with golden signals (latency, errors)
#   - Kubernetes: liveness probes + restart policies
#   - Netflix: circuit breaker (don't restart in tight loops)
#
# What it does:
#   1. Pings local Ollama /api/tags (liveness probe)
#   2. If hung (no response in 10s): restart Ollama via systemd
#   3. If model not loaded: pull it automatically
#   4. If Ollama service not running: start it
#   5. Logs everything to /var/log/chefflow-watchdog.log
#   6. Circuit breaker: max 3 restarts per hour to prevent loops
#
# Install via cron:
#   crontab -e
#   * * * * * /home/davidferra/chefflow-watchdog.sh >> /var/log/chefflow-watchdog.log 2>&1
#
# Or install via systemd timer (preferred — more reliable than cron):
#   See pi-watchdog.service + pi-watchdog.timer below
# =============================================================

set -euo pipefail

OLLAMA_URL="http://localhost:11434"
EXPECTED_MODEL="${CHEFFLOW_PI_MODEL:-qwen3:8b}"
LOG_PREFIX="[chefflow-watchdog]"
RESTART_COUNTER_FILE="/tmp/chefflow-watchdog-restarts"
MAX_RESTARTS_PER_HOUR=3
HEALTH_TIMEOUT=10

# ── Logging ──────────────────────────────────────────────────

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $LOG_PREFIX $1"
}

log_warn() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $LOG_PREFIX [WARN] $1"
}

log_error() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $LOG_PREFIX [ERROR] $1"
}

# ── Circuit Breaker ──────────────────────────────────────────
# Prevents restart loops: max 3 restarts per hour.
# Inspired by Netflix Hystrix — if the service keeps failing,
# stop restarting and wait for human intervention.

check_circuit_breaker() {
  if [ ! -f "$RESTART_COUNTER_FILE" ]; then
    echo "0 $(date +%s)" > "$RESTART_COUNTER_FILE"
  fi

  read -r count timestamp < "$RESTART_COUNTER_FILE"
  now=$(date +%s)
  elapsed=$(( now - timestamp ))

  # Reset counter after 1 hour
  if [ "$elapsed" -ge 3600 ]; then
    echo "0 $now" > "$RESTART_COUNTER_FILE"
    return 0  # Circuit closed (allow restarts)
  fi

  if [ "$count" -ge "$MAX_RESTARTS_PER_HOUR" ]; then
    log_error "CIRCUIT BREAKER OPEN: $count restarts in the last hour. Refusing to restart. Manual intervention required."
    return 1  # Circuit open (block restarts)
  fi

  return 0  # Circuit closed
}

increment_restart_counter() {
  if [ ! -f "$RESTART_COUNTER_FILE" ]; then
    echo "1 $(date +%s)" > "$RESTART_COUNTER_FILE"
    return
  fi

  read -r count timestamp < "$RESTART_COUNTER_FILE"
  echo "$(( count + 1 )) $timestamp" > "$RESTART_COUNTER_FILE"
}

# ── Health Check (Liveness Probe) ────────────────────────────
# Google SRE pattern: check with timeout, measure latency,
# classify response as healthy/degraded/unhealthy.

check_ollama_health() {
  local start_ms
  start_ms=$(date +%s%3N 2>/dev/null || date +%s)

  local response
  response=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time "$HEALTH_TIMEOUT" \
    "$OLLAMA_URL/api/tags" 2>/dev/null) || response="000"

  local end_ms
  end_ms=$(date +%s%3N 2>/dev/null || date +%s)

  local latency=$(( end_ms - start_ms ))

  if [ "$response" = "200" ]; then
    if [ "$latency" -gt 5000 ]; then
      log_warn "Ollama responding but slow (${latency}ms) — may be under load"
      return 0  # Still healthy, just slow
    fi
    return 0  # Healthy
  fi

  return 1  # Unhealthy
}

# ── Model Check (Readiness Probe) ────────────────────────────
# Kubernetes pattern: service is alive but not ready to serve
# if the required model isn't loaded.

check_model_loaded() {
  local models
  models=$(curl -s --max-time 5 "$OLLAMA_URL/api/tags" 2>/dev/null) || return 1

  # Check if expected model (or its base name) is in the list
  local base_model
  base_model=$(echo "$EXPECTED_MODEL" | cut -d':' -f1)

  if echo "$models" | grep -q "\"$EXPECTED_MODEL\""; then
    return 0  # Exact match
  elif echo "$models" | grep -q "\"$base_model:"; then
    return 0  # Base name match (e.g., qwen3:8b matches qwen3:latest)
  fi

  return 1  # Model not found
}

# ── Check for Hung Processes ─────────────────────────────────
# Detects Ollama processes consuming CPU for too long without
# making progress. This catches infinite generation loops.

check_for_hung_ollama() {
  # Check if any ollama_llama_server process has been running > 5 minutes
  local hung_pids
  hung_pids=$(ps aux | grep -E 'ollama|llama' | grep -v grep | awk '{
    split($10, a, ":")
    if (length(a) >= 2) {
      minutes = a[1] * 60 + a[2]
      if (minutes > 5) print $2
    }
  }')

  if [ -n "$hung_pids" ]; then
    log_warn "Potentially hung Ollama processes detected: $hung_pids"
    return 1
  fi

  return 0
}

# ── Restart Ollama ───────────────────────────────────────────

restart_ollama() {
  if ! check_circuit_breaker; then
    return 1
  fi

  log "Restarting Ollama via systemd..."
  sudo systemctl restart ollama

  # Wait for startup (Ollama needs a few seconds to bind the port)
  sleep 5

  if check_ollama_health; then
    log "Ollama restarted successfully"
    increment_restart_counter
    return 0
  else
    log_error "Ollama restart failed — service did not become healthy"
    increment_restart_counter
    return 1
  fi
}

# ── Pull Model ───────────────────────────────────────────────

pull_model() {
  log "Model $EXPECTED_MODEL not found — pulling..."

  # Run pull in background with a timeout (30 minutes max for large models)
  timeout 1800 ollama pull "$EXPECTED_MODEL" &
  local pull_pid=$!

  # Don't block the watchdog — just kick off the pull
  log "Model pull started (PID $pull_pid). Will verify on next run."
}

# ── Main ─────────────────────────────────────────────────────

main() {
  # Step 1: Check if Ollama service is running at all
  if ! systemctl is-active --quiet ollama 2>/dev/null; then
    log_warn "Ollama service is not running"
    restart_ollama
    return
  fi

  # Step 2: Liveness probe — is Ollama responding?
  if ! check_ollama_health; then
    log_warn "Ollama health check failed (no response within ${HEALTH_TIMEOUT}s)"
    restart_ollama
    return
  fi

  # Step 3: Readiness probe — is the expected model loaded?
  if ! check_model_loaded; then
    log_warn "Expected model $EXPECTED_MODEL not found"
    pull_model
    return
  fi

  # Step 4: Check for hung processes
  if ! check_for_hung_ollama; then
    log_warn "Hung Ollama process detected — restarting"
    restart_ollama
    return
  fi

  # All checks passed
  log "OK — Ollama healthy, model $EXPECTED_MODEL ready"
}

main "$@"

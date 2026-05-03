#!/usr/bin/env bash
# =============================================================================
# ChefFlow Service Manager
# =============================================================================
# Single on/off switch for all project-related services.
# Usage: bash scripts/services.sh [command] [service]
#
# Commands:
#   status    - Show what's running with RAM usage and verdict
#   up        - Kill garbage, start essentials (postgres + prod server)
#   down      - Stop all project-related processes
#   start X   - Start a specific service
#   stop X    - Stop a specific service
#   clean     - Kill ALL project node processes (nuclear option)
#
# Services: prod, dev, ollama, openclaw, anythingllm, playwright, persona, pm2
# =============================================================================

set -euo pipefail
cd "$(dirname "$0")/.."
ROOT_DIR="$(pwd)"
ROOT_NORMALIZED=$(echo "$ROOT_DIR" | tr '\\' '/' | tr '[:upper:]' '[:lower:]')

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# --- Helpers ---
log() { echo -e "${CYAN}[services]${NC} $*"; }
ok() { echo -e "${GREEN}[OK]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err() { echo -e "${RED}[ERR]${NC} $*"; }

# Get all node processes with RAM and command lines (Windows)
get_node_processes() {
  powershell.exe -NoProfile -Command '
    Get-CimInstance Win32_Process -Filter "Name=''node.exe''" |
    Select-Object ProcessId, @{N="MB";E={[math]::Round($_.WorkingSetSize/1MB)}}, CommandLine |
    Sort-Object MB -Descending |
    ForEach-Object { "$($_.ProcessId)|$($_.MB)|$($_.CommandLine)" }
  ' 2>/dev/null || true
}

# Kill a PID on Windows
kill_pid() {
  local pid=$1
  taskkill //PID "$pid" //F //T > /dev/null 2>&1 || true
}

# Check if a port is listening
port_listening() {
  netstat -ano 2>/dev/null | grep -q ":${1}.*LISTENING"
}

# Get PID on a port
get_port_pid() {
  netstat -ano 2>/dev/null | grep ":${1}.*LISTENING" | head -1 | awk '{print $NF}'
}

# --- Service Definitions ---
# Each service: name, detection pattern, port (if any), required (yes/no)

is_prod() { port_listening 3000; }
is_dev() { port_listening 3100; }
is_ollama() { port_listening 11434; }
is_openclaw_docker() { docker ps 2>/dev/null | grep -q "openclaw-engine"; }
is_anythingllm_docker() { docker ps 2>/dev/null | grep -q "anythingllm"; }
is_postgres_docker() { docker ps 2>/dev/null | grep -q "chefflow_postgres"; }
is_playwright() { get_node_processes | grep -qi "playwright"; }
is_persona() { get_node_processes | grep -qi "persona"; }
is_pm2() { get_node_processes | grep -qi "pm2"; }

# --- Commands ---

cmd_status() {
  echo ""
  echo -e "${CYAN}=== ChefFlow Service Status ===${NC}"
  echo ""

  # Essential services
  echo -e "${GREEN}--- ESSENTIAL (needed for localhost) ---${NC}"
  if is_postgres_docker; then
    ok "PostgreSQL (Docker)        - running"
  else
    err "PostgreSQL (Docker)        - DOWN (required!)"
  fi

  if is_prod; then
    local pid=$(get_port_pid 3000)
    ok "Production server (:3000)  - running (PID $pid)"
  else
    warn "Production server (:3000)  - not running"
  fi

  echo ""
  echo -e "${YELLOW}--- OPTIONAL (stop to save resources) ---${NC}"

  if is_dev; then
    local pid=$(get_port_pid 3100)
    warn "Dev server (:3100)         - running (PID $pid) - HEAVY RAM"
  else
    echo "    Dev server (:3100)         - stopped"
  fi

  if is_ollama; then
    warn "Ollama (:11434)            - running"
  else
    echo "    Ollama (:11434)            - stopped"
  fi

  if is_openclaw_docker; then
    warn "OpenClaw engine (Docker)   - running"
  else
    echo "    OpenClaw engine (Docker)   - stopped"
  fi

  if is_anythingllm_docker; then
    warn "AnythingLLM (Docker)       - running"
  else
    echo "    AnythingLLM (Docker)       - stopped"
  fi

  if is_playwright; then
    warn "Playwright test server     - running"
  else
    echo "    Playwright test server     - stopped"
  fi

  if is_persona; then
    warn "Persona tools              - running"
  else
    echo "    Persona tools              - stopped"
  fi

  if is_pm2; then
    warn "PM2 daemon                 - running"
  else
    echo "    PM2 daemon                 - stopped"
  fi

  echo ""

  # RAM summary
  echo -e "${CYAN}--- Node.js RAM Usage ---${NC}"
  local total_mb=0
  while IFS='|' read -r pid mb cmd; do
    if [[ -n "$pid" && -n "$mb" ]]; then
      total_mb=$((total_mb + mb))
      local short_cmd="${cmd:0:80}"
      printf "  PID %-7s %6s MB  %s\n" "$pid" "$mb" "$short_cmd"
    fi
  done <<< "$(get_node_processes)"
  echo ""
  echo -e "  ${CYAN}Total Node.js RAM: ${total_mb} MB${NC}"
  echo ""
}

cmd_up() {
  log "Starting essential services only..."
  echo ""

  # Step 1: Kill non-essential stuff
  cmd_stop_garbage

  # Step 2: Ensure postgres is running
  if ! is_postgres_docker; then
    log "Starting PostgreSQL..."
    docker start chefflow_postgres > /dev/null 2>&1 || {
      err "Failed to start chefflow_postgres container"
      exit 1
    }
    ok "PostgreSQL started"
  else
    ok "PostgreSQL already running"
  fi

  # Step 3: Start production server
  if ! is_prod; then
    log "Starting production server on port 3000..."
    node scripts/run-next-prod.mjs &
    disown
    # Wait for it to come up
    for i in $(seq 1 30); do
      if port_listening 3000; then
        break
      fi
      sleep 1
    done
    if is_prod; then
      ok "Production server running on :3000"
    else
      err "Production server failed to start within 30s"
    fi
  else
    ok "Production server already running on :3000"
  fi

  echo ""
  ok "ChefFlow is ready at http://localhost:3000"
}

cmd_down() {
  log "Stopping all project services..."

  # Kill all project node processes
  while IFS='|' read -r pid mb cmd; do
    if [[ -n "$pid" ]]; then
      local cmd_lower=$(echo "$cmd" | tr '[:upper:]' '[:lower:]' | tr '\\' '/')
      if echo "$cmd_lower" | grep -q "$ROOT_NORMALIZED"; then
        kill_pid "$pid"
        log "  Killed PID $pid ($mb MB)"
      fi
    fi
  done <<< "$(get_node_processes)"

  # Stop Docker containers (except postgres by default)
  if is_openclaw_docker; then
    docker stop openclaw-engine > /dev/null 2>&1 || true
    log "  Stopped OpenClaw engine"
  fi
  if is_anythingllm_docker; then
    docker stop anythingllm-hosted-54390 anythingllm_sql_postgres > /dev/null 2>&1 || true
    log "  Stopped AnythingLLM"
  fi

  # Stop Ollama
  if is_ollama; then
    powershell.exe -NoProfile -Command "Get-Process ollama* | Stop-Process -Force" 2>/dev/null || true
    log "  Stopped Ollama"
  fi

  # Stop PM2
  if is_pm2; then
    npx pm2 kill > /dev/null 2>&1 || true
    log "  Stopped PM2"
  fi

  echo ""
  ok "All project services stopped."
  warn "PostgreSQL Docker kept running (use 'services stop postgres' to stop it too)"
}

cmd_stop_garbage() {
  log "Killing non-essential processes..."

  # Kill dev server (biggest RAM hog)
  if is_dev; then
    local pid=$(get_port_pid 3100)
    if [[ -n "$pid" ]]; then
      kill_pid "$pid"
      log "  Killed dev server (:3100) PID $pid"
    fi
  fi

  # Kill any duplicate prod servers (port 3300, etc)
  for extra_port in 3300 3200 3400; do
    if port_listening "$extra_port"; then
      local pid=$(get_port_pid "$extra_port")
      if [[ -n "$pid" ]]; then
        kill_pid "$pid"
        log "  Killed extra server (:$extra_port) PID $pid"
      fi
    fi
  done

  # Kill persona tools
  while IFS='|' read -r pid mb cmd; do
    if [[ -n "$pid" ]]; then
      local cmd_lower=$(echo "$cmd" | tr '[:upper:]' '[:lower:]')
      if echo "$cmd_lower" | grep -qE "persona|pipeline-audit|playwright.*test-server|pm2"; then
        kill_pid "$pid"
        log "  Killed PID $pid ($mb MB) - $(echo "$cmd" | grep -oE '[^ ]+$')"
      fi
    fi
  done <<< "$(get_node_processes)"

  # Stop non-essential Docker
  if is_openclaw_docker; then
    docker stop openclaw-engine > /dev/null 2>&1 || true
    log "  Stopped OpenClaw engine"
  fi
  if is_anythingllm_docker; then
    docker stop anythingllm-hosted-54390 anythingllm_sql_postgres > /dev/null 2>&1 || true
    log "  Stopped AnythingLLM"
  fi

  # Stop Ollama
  if is_ollama; then
    powershell.exe -NoProfile -Command "Get-Process ollama* | Stop-Process -Force" 2>/dev/null || true
    log "  Stopped Ollama"
  fi

  # Stop PM2
  if is_pm2; then
    npx pm2 kill > /dev/null 2>&1 || true
    log "  Stopped PM2"
  fi

  ok "Garbage cleared"
}

cmd_start() {
  local service="${1:-}"
  case "$service" in
    prod)
      if is_prod; then ok "Already running on :3000"; return; fi
      log "Starting production server..."
      node scripts/run-next-prod.mjs &
      disown
      for i in $(seq 1 30); do port_listening 3000 && break; sleep 1; done
      is_prod && ok "Production server up on :3000" || err "Failed to start"
      ;;
    dev)
      if is_dev; then ok "Already running on :3100"; return; fi
      warn "Dev server uses 15-20GB RAM. Prefer prod server."
      log "Starting dev server..."
      npx next dev -p 3100 -H 0.0.0.0 &
      disown
      for i in $(seq 1 15); do port_listening 3100 && break; sleep 1; done
      is_dev && ok "Dev server up on :3100" || err "Failed to start"
      ;;
    ollama)
      if is_ollama; then ok "Already running on :11434"; return; fi
      log "Starting Ollama..."
      powershell.exe -NoProfile -Command "Start-Process ollama -ArgumentList 'serve' -WindowStyle Hidden" 2>/dev/null || true
      sleep 3
      is_ollama && ok "Ollama up on :11434" || err "Failed to start Ollama"
      ;;
    openclaw)
      if is_openclaw_docker; then ok "Already running"; return; fi
      log "Starting OpenClaw engine..."
      docker start openclaw-engine > /dev/null 2>&1 || err "Failed"
      ok "OpenClaw engine started"
      ;;
    anythingllm)
      if is_anythingllm_docker; then ok "Already running"; return; fi
      log "Starting AnythingLLM..."
      docker start anythingllm_sql_postgres anythingllm-hosted-54390 > /dev/null 2>&1 || err "Failed"
      ok "AnythingLLM started"
      ;;
    postgres)
      if is_postgres_docker; then ok "Already running"; return; fi
      log "Starting PostgreSQL..."
      docker start chefflow_postgres > /dev/null 2>&1 || err "Failed"
      ok "PostgreSQL started"
      ;;
    *)
      err "Unknown service: $service"
      echo "Available: prod, dev, ollama, openclaw, anythingllm, postgres"
      exit 1
      ;;
  esac
}

cmd_stop() {
  local service="${1:-}"
  case "$service" in
    prod)
      if ! is_prod; then ok "Already stopped"; return; fi
      local pid=$(get_port_pid 3000)
      kill_pid "$pid"
      ok "Production server stopped"
      ;;
    dev)
      if ! is_dev; then ok "Already stopped"; return; fi
      local pid=$(get_port_pid 3100)
      kill_pid "$pid"
      ok "Dev server stopped"
      ;;
    ollama)
      if ! is_ollama; then ok "Already stopped"; return; fi
      powershell.exe -NoProfile -Command "Get-Process ollama* | Stop-Process -Force" 2>/dev/null || true
      ok "Ollama stopped"
      ;;
    openclaw)
      docker stop openclaw-engine > /dev/null 2>&1 || true
      ok "OpenClaw engine stopped"
      ;;
    anythingllm)
      docker stop anythingllm-hosted-54390 anythingllm_sql_postgres > /dev/null 2>&1 || true
      ok "AnythingLLM stopped"
      ;;
    postgres)
      docker stop chefflow_postgres > /dev/null 2>&1 || true
      ok "PostgreSQL stopped"
      ;;
    *)
      err "Unknown service: $service"
      echo "Available: prod, dev, ollama, openclaw, anythingllm, postgres"
      exit 1
      ;;
  esac
}

cmd_clean() {
  warn "Nuclear option: killing ALL project node processes..."
  while IFS='|' read -r pid mb cmd; do
    if [[ -n "$pid" ]]; then
      local cmd_lower=$(echo "$cmd" | tr '[:upper:]' '[:lower:]' | tr '\\' '/')
      if echo "$cmd_lower" | grep -q "$ROOT_NORMALIZED"; then
        kill_pid "$pid"
        log "  Killed PID $pid ($mb MB)"
      fi
    fi
  done <<< "$(get_node_processes)"
  ok "All project node processes killed"
}

# --- Main ---
command="${1:-status}"
shift || true

case "$command" in
  status) cmd_status ;;
  up) cmd_up ;;
  down) cmd_down ;;
  start) cmd_start "$@" ;;
  stop) cmd_stop "$@" ;;
  clean) cmd_clean ;;
  *)
    echo "Usage: bash scripts/services.sh [command] [service]"
    echo ""
    echo "Commands:"
    echo "  status          Show what's running"
    echo "  up              Start essentials only (postgres + prod)"
    echo "  down            Stop everything project-related"
    echo "  start <svc>     Start a specific service"
    echo "  stop <svc>      Stop a specific service"
    echo "  clean           Kill ALL project node processes"
    echo ""
    echo "Services: prod, dev, ollama, openclaw, anythingllm, postgres"
    exit 1
    ;;
esac

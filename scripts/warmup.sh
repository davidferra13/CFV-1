#!/usr/bin/env bash
# warmup.sh - Get a chef account warm and on standby
# Usage: bash scripts/warmup.sh [account] [port]
#   account: chef-bob (default), agent, developer
#   port: 3100 (default)
#
# What "warm standby" means:
#   1. Dev server confirmed running on port
#   2. Session authenticated via e2e auth endpoint
#   3. Top routes pre-compiled (no cold-compile lag when clicking)
#   4. Browser launched with authenticated session
#   5. Screenshot proof saved

set -euo pipefail

ACCOUNT="${1:-chef-bob}"
PORT="${2:-3100}"
BASE="http://localhost:${PORT}"
COOKIE_FILE="/tmp/warmup-${ACCOUNT}-cookies.txt"
SCREENSHOT_DIR="tmp-warmup"

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

step() { echo -e "${GREEN}[warmup]${NC} $1"; }
warn() { echo -e "${YELLOW}[warmup]${NC} $1"; }
fail() { echo -e "${RED}[warmup]${NC} $1"; exit 1; }

# --- Load credentials ---
AUTH_FILE=".auth/${ACCOUNT}.json"
if [ ! -f "$AUTH_FILE" ]; then
  fail "No auth file at ${AUTH_FILE}. Run setup first."
fi

EMAIL=$(node -e "console.log(require('./${AUTH_FILE}').email)")
PASSWORD=$(node -e "console.log(require('./${AUTH_FILE}').password)")
step "Account: ${EMAIL}"

# --- Step 1: Check server ---
step "Checking server on port ${PORT}..."
HTTP_CODE=$(curl -s --max-time 5 -o /dev/null -w "%{http_code}" "${BASE}/" 2>&1 || true)
HTTP_CODE="${HTTP_CODE: -3}"

if [ "$HTTP_CODE" = "000" ]; then
  warn "Server not responding on ${PORT}. Attempting to start..."

  # Check if port is bound but stuck
  STUCK_PID=$(netstat -ano 2>/dev/null | grep ":${PORT}" | grep LISTENING | awk '{print $5}' | head -1)
  if [ -n "$STUCK_PID" ]; then
    warn "Killing stuck process ${STUCK_PID} on port ${PORT}"
    taskkill //F //PID "$STUCK_PID" 2>/dev/null || true
    sleep 2
  fi

  # Start dev server in background
  npm run dev &
  DEV_PID=$!

  # Wait for it to come up (max 30s)
  for i in $(seq 1 30); do
    HTTP_CODE=$(curl -s --max-time 3 -o /dev/null -w "%{http_code}" "${BASE}/" 2>&1 || true)
    HTTP_CODE="${HTTP_CODE: -3}"
    if [ "$HTTP_CODE" != "000" ]; then
      break
    fi
    sleep 1
  done

  if [ "$HTTP_CODE" = "000" ]; then
    fail "Server failed to start after 30s"
  fi
fi
step "Server alive (HTTP ${HTTP_CODE})"

# --- Step 2: Authenticate ---
step "Authenticating as ${EMAIL}..."
AUTH_RESPONSE=$(curl -s -X POST "${BASE}/api/e2e/auth" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}" \
  -c "$COOKIE_FILE" \
  -w "\n%{http_code}" 2>/dev/null)

AUTH_STATUS=$(echo "$AUTH_RESPONSE" | tail -1)
AUTH_BODY=$(echo "$AUTH_RESPONSE" | head -1)

if [ "$AUTH_STATUS" != "200" ]; then
  fail "Auth failed (HTTP ${AUTH_STATUS}): ${AUTH_BODY}"
fi

# Extract session cookie
SESSION_TOKEN=$(grep "session-token" "$COOKIE_FILE" | awk '{print $NF}')
if [ -z "$SESSION_TOKEN" ]; then
  fail "No session token in response"
fi
step "Authenticated (session token acquired)"

# --- Step 3: Warm routes ---
ROUTES=(
  "/dashboard"
  "/events"
  "/clients"
  "/culinary/recipes"
  "/settings"
  "/inquiries"
)

step "Warming ${#ROUTES[@]} routes..."
for route in "${ROUTES[@]}"; do
  CODE=$(curl -s --max-time 30 -o /dev/null -w "%{http_code}" \
    -b "$COOKIE_FILE" "${BASE}${route}" 2>&1 || true)
  CODE="${CODE: -3}"
  if [ "$CODE" = "200" ] || [ "$CODE" = "307" ] || [ "$CODE" = "302" ]; then
    echo "  ${route} -> ${CODE} OK"
  else
    warn "  ${route} -> ${CODE} (may need auth or doesn't exist)"
  fi
done
step "Routes warm"

# --- Step 4: Save state for browser launcher ---
mkdir -p "$SCREENSHOT_DIR"
cat > "${SCREENSHOT_DIR}/warmup-state.json" <<STATEJSON
{
  "account": "${ACCOUNT}",
  "email": "${EMAIL}",
  "port": ${PORT},
  "base": "${BASE}",
  "sessionToken": "${SESSION_TOKEN}",
  "cookieFile": "${COOKIE_FILE}",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
STATEJSON

step "State saved to ${SCREENSHOT_DIR}/warmup-state.json"

# --- Step 5: Launch browser ---
step "Launching browser..."
node scripts/warmup-browser.mjs "${SCREENSHOT_DIR}/warmup-state.json" &
BROWSER_PID=$!

# Wait for screenshot
for i in $(seq 1 60); do
  if [ -f "${SCREENSHOT_DIR}/dashboard.png" ]; then
    break
  fi
  sleep 1
done

if [ -f "${SCREENSHOT_DIR}/dashboard.png" ]; then
  step "Dashboard screenshot: ${SCREENSHOT_DIR}/dashboard.png"
else
  warn "Screenshot not captured yet (browser may still be loading)"
fi

echo ""
echo -e "${GREEN}=== STANDBY READY ===${NC}"
echo "  Account:  ${EMAIL}"
echo "  Server:   ${BASE}"
echo "  Browser:  PID ${BROWSER_PID} (Ctrl+C to close)"
echo "  State:    ${SCREENSHOT_DIR}/warmup-state.json"
echo ""
echo "Browser is open and interactive. Go."

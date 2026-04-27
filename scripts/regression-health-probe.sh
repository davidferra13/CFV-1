#!/usr/bin/env bash
# ============================================================================
# ChefFlow Route Health Probe
# ============================================================================
# Probes critical routes via HTTP to verify they respond correctly.
# Uses the regression registry as the source of truth for which routes exist.
#
# Usage:
#   bash scripts/regression-health-probe.sh              # probe localhost:3000
#   bash scripts/regression-health-probe.sh --port 3100   # probe localhost:3100
#
# Exit codes: 0 = all healthy (or server not running), 1 = 500s detected
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGISTRY="$SCRIPT_DIR/regression-registry.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

PORT=3000
TIMEOUT=5
FAILURES=0
PROBED=0
FAILED_ROUTES=()

# --------------------------------------------------------------------------
# Parse args
# --------------------------------------------------------------------------

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)
      PORT="$2"
      shift 2
      ;;
    --port=*)
      PORT="${1#*=}"
      shift
      ;;
    *)
      shift
      ;;
  esac
done

BASE="http://localhost:${PORT}"

# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------

# Convert a file path like "app/(public)/pricing/page.tsx" to a URL path "/pricing"
file_to_url() {
  node -e "
    const f = process.argv[1];
    // Strip app/ prefix and /page.tsx suffix
    let p = f.replace(/^app\//, '').replace(/\/page\.tsx$/, '');
    // Strip route groups like (chef), (public), (client)
    p = p.replace(/\([^)]+\)\/?/g, '');
    // Handle root: empty string -> /
    if (!p || p === '') { console.log('/'); return; }
    console.log('/' + p);
  " "$1"
}

# Convert an API route file path to a URL path
api_file_to_url() {
  node -e "
    const f = process.argv[1];
    // Strip app/ prefix and /route.ts suffix
    let p = f.replace(/^app\//, '').replace(/\/route\.ts$/, '');
    console.log('/' + p);
  " "$1"
}

probe() {
  local url="$1"
  local expect_desc="$2"
  local allow_codes="$3"  # comma-separated list of OK status codes

  PROBED=$((PROBED + 1))

  local status
  status=$(curl -s -o /dev/null -w '%{http_code}' --max-time "$TIMEOUT" "${BASE}${url}" 2>/dev/null) || status="000"

  # Check for 500
  if [ "$status" = "500" ] || [ "$status" = "502" ] || [ "$status" = "503" ]; then
    FAILURES=$((FAILURES + 1))
    FAILED_ROUTES+=("$url ($status)")
    printf "  ${RED}FAIL${NC}   %-35s %s\n" "$url" "$status"
    return
  fi

  # Check for connection failure
  if [ "$status" = "000" ]; then
    FAILURES=$((FAILURES + 1))
    FAILED_ROUTES+=("$url (timeout/refused)")
    printf "  ${RED}FAIL${NC}   %-35s %s\n" "$url" "timeout/refused"
    return
  fi

  # Check if status is in the allowed list
  local ok=false
  IFS=',' read -ra CODES <<< "$allow_codes"
  for code in "${CODES[@]}"; do
    if [ "$status" = "$code" ]; then
      ok=true
      break
    fi
  done

  if [ "$ok" = true ]; then
    local suffix=""
    if [ "$status" = "302" ] || [ "$status" = "307" ] || [ "$status" = "308" ]; then
      suffix=" (auth redirect)"
    fi
    printf "  ${GREEN}OK${NC}     %-35s %s%s\n" "$url" "$status" "$suffix"
  else
    # Unexpected status, but not a 5xx, so warn but don't fail
    printf "  ${YELLOW}WARN${NC}   %-35s %s (%s)\n" "$url" "$status" "$expect_desc"
  fi
}

# --------------------------------------------------------------------------
# Server check
# --------------------------------------------------------------------------

echo -e "${BOLD}[ROUTE HEALTH PROBE]${NC} (localhost:${PORT})"
echo ""

SERVER_STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "${BASE}/api/health/ping" 2>/dev/null) || SERVER_STATUS="000"

if [ "$SERVER_STATUS" = "000" ]; then
  echo -e "  ${YELLOW}SKIP${NC}   Server not running on port ${PORT} - skipping health probe"
  echo ""
  exit 0
fi

# --------------------------------------------------------------------------
# Probe public routes
# --------------------------------------------------------------------------

echo -e "${CYAN}  Public routes${NC}"

PUBLIC_ROUTES=$(node -e "
  const r = require(process.argv[1]).routes.public || [];
  r.forEach(f => {
    let p = f.replace(/^app\//, '').replace(/\/page\.tsx$/, '');
    p = p.replace(/\([^)]+\)\/?/g, '');
    if (!p) { console.log('/'); return; }
    // Skip dynamic routes with [param] - we can't probe them without real data
    if (p.includes('[')) return;
    console.log('/' + p);
  });
" "$REGISTRY")

while IFS= read -r route; do
  [ -z "$route" ] && continue
  probe "$route" "expect 200" "200"
done <<< "$PUBLIC_ROUTES"

# --------------------------------------------------------------------------
# Probe auth routes
# --------------------------------------------------------------------------

echo -e "${CYAN}  Auth routes${NC}"

AUTH_ROUTES=$(node -e "
  const r = require(process.argv[1]).routes.auth || [];
  r.forEach(f => {
    let p = f.replace(/^app\//, '').replace(/\/page\.tsx$/, '');
    p = p.replace(/\([^)]+\)\/?/g, '');
    if (!p) return;
    if (p.includes('[')) return;
    console.log('/' + p);
  });
" "$REGISTRY")

while IFS= read -r route; do
  [ -z "$route" ] && continue
  probe "$route" "expect 200 or 302" "200,302,307"
done <<< "$AUTH_ROUTES"

# --------------------------------------------------------------------------
# Probe API health endpoints
# --------------------------------------------------------------------------

echo -e "${CYAN}  API health${NC}"

probe "/api/health/ping" "expect 200" "200"
probe "/api/health" "expect 200" "200"

# --------------------------------------------------------------------------
# Probe chef routes (expect auth redirect)
# --------------------------------------------------------------------------

echo -e "${CYAN}  Chef routes (expect auth redirect)${NC}"

CHEF_GROUPS="core,sell,plan,cook,stock,money,grow"

CHEF_ROUTES=$(node -e "
  const r = require(process.argv[1]).routes;
  const groups = '${CHEF_GROUPS}'.split(',');
  const seen = new Set();
  groups.forEach(g => {
    (r[g] || []).forEach(f => {
      let p = f.replace(/^app\//, '').replace(/\/page\.tsx$/, '');
      p = p.replace(/\([^)]+\)\/?/g, '');
      if (!p) return;
      // Skip dynamic routes
      if (p.includes('[')) return;
      // Deduplicate
      if (seen.has(p)) return;
      seen.add(p);
      console.log('/' + p);
    });
  });
" "$REGISTRY")

while IFS= read -r route; do
  [ -z "$route" ] && continue
  probe "$route" "expect 302/307 redirect" "200,302,307,308"
done <<< "$CHEF_ROUTES"

# --------------------------------------------------------------------------
# Probe critical API routes (non-dynamic only)
# --------------------------------------------------------------------------

echo -e "${CYAN}  API routes${NC}"

API_ROUTES=$(node -e "
  const r = require(process.argv[1]).api_routes;
  const groups = Object.keys(r).filter(k => k !== '_doc');
  groups.forEach(g => {
    (r[g] || []).forEach(f => {
      let p = f.replace(/^app\//, '').replace(/\/route\.ts$/, '');
      // Skip dynamic segments
      if (p.includes('[')) return;
      // Skip webhook endpoints (would need POST + signature)
      if (p.includes('webhook')) return;
      console.log('/' + p);
    });
  });
" "$REGISTRY")

while IFS= read -r route; do
  [ -z "$route" ] && continue
  # API routes may require auth or specific methods; accept a range of codes
  probe "$route" "expect response" "200,302,307,401,403,405"
done <<< "$API_ROUTES"

# --------------------------------------------------------------------------
# Report
# --------------------------------------------------------------------------

echo ""
echo "  ------------------------------------------------"

if [ "$FAILURES" -gt 0 ]; then
  echo -e "  ${RED}${BOLD}${FAILURES} failure(s)${NC} / ${PROBED} probed"
  echo ""
  echo -e "  ${BOLD}Broken routes:${NC}"
  for item in "${FAILED_ROUTES[@]}"; do
    echo "    - $item"
  done
  exit 1
else
  echo -e "  ${GREEN}${BOLD}All healthy${NC} - ${PROBED} routes probed"
  exit 0
fi

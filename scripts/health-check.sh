#!/bin/bash
# ============================================
# ChefFlow Post-Deploy Health Check
# ============================================
# Verifies a ChefFlow instance is running and healthy.
# Used standalone or called by deploy-beta.sh after deploy.
#
# Usage:
#   bash scripts/health-check.sh [URL]
#
# Examples:
#   bash scripts/health-check.sh                        # default: http://localhost:3200
#   bash scripts/health-check.sh http://localhost:3100   # check dev server
#   bash scripts/health-check.sh https://beta.cheflowhq.com
#
# Exit codes: 0 = all checks passed, 1 = one or more checks failed
# ============================================

BASE_URL="${1:-http://localhost:3200}"
MAX_RETRIES=3
RETRY_DELAY=5
TIMEOUT=30
PASSED=0
FAILED=0
TOTAL=0

# Strip trailing slash
BASE_URL="${BASE_URL%/}"

# ---- helpers ----

green()  { echo -e "  \033[32mPASS\033[0m $1"; }
red()    { echo -e "  \033[31mFAIL\033[0m $1"; }
yellow() { echo -e "  \033[33mWARN\033[0m $1"; }

record_pass() { PASSED=$((PASSED + 1)); TOTAL=$((TOTAL + 1)); green "$1"; }
record_fail() { FAILED=$((FAILED + 1)); TOTAL=$((TOTAL + 1)); red "$1"; }

# Retry wrapper: run a check function up to MAX_RETRIES times
# Usage: with_retry "check name" check_function
with_retry() {
  local name="$1"
  shift
  for attempt in $(seq 1 $MAX_RETRIES); do
    if "$@" 2>/dev/null; then
      return 0
    fi
    if [ "$attempt" -lt "$MAX_RETRIES" ]; then
      yellow "$name - attempt $attempt/$MAX_RETRIES failed, retrying in ${RETRY_DELAY}s..."
      sleep $RETRY_DELAY
    fi
  done
  return 1
}

# ---- checks ----

# 1. Main page returns 200 or redirect (302/307) to login
check_main_page() {
  local status
  status=$(curl -s -o /dev/null -w '%{http_code}' --max-time $TIMEOUT "$BASE_URL" 2>/dev/null)
  [ "$status" = "200" ] || [ "$status" = "302" ] || [ "$status" = "307" ]
}

run_main_page() {
  local status
  if with_retry "Main page" check_main_page; then
    status=$(curl -s -o /dev/null -w '%{http_code}' --max-time $TIMEOUT "$BASE_URL" 2>/dev/null)
    record_pass "Main page responds (HTTP $status)"
  else
    status=$(curl -s -o /dev/null -w '%{http_code}' --max-time $TIMEOUT "$BASE_URL" 2>/dev/null)
    record_fail "Main page unreachable (HTTP $status)"
  fi
}

# 2. Ping endpoint (fast, no dependencies)
check_ping() {
  local body
  body=$(curl -s --max-time $TIMEOUT "$BASE_URL/api/health/ping" 2>/dev/null)
  echo "$body" | grep -q '"status":"ok"'
}

run_ping() {
  if with_retry "Ping" check_ping; then
    record_pass "Ping endpoint (/api/health/ping) returns ok"
  else
    record_fail "Ping endpoint (/api/health/ping) not responding"
  fi
}

# 3. Full health endpoint (checks env vars + DB connectivity)
check_health_api() {
  local status
  status=$(curl -s -o /dev/null -w '%{http_code}' --max-time $TIMEOUT "$BASE_URL/api/health" 2>/dev/null)
  [ "$status" = "200" ]
}

run_health_api() {
  if with_retry "Health API" check_health_api; then
    record_pass "Health API (/api/health) returns 200"
  else
    local status body
    status=$(curl -s -o /dev/null -w '%{http_code}' --max-time $TIMEOUT "$BASE_URL/api/health" 2>/dev/null)
    body=$(curl -s --max-time $TIMEOUT "$BASE_URL/api/health" 2>/dev/null)
    record_fail "Health API (/api/health) returned HTTP $status"
    if [ -n "$body" ]; then
      echo "         Response: $(echo "$body" | head -c 200)"
    fi
  fi
}

# 4. Response contains "ChefFlow" (confirms the right app is serving)
check_content() {
  local body
  # Follow redirects to get actual page content
  body=$(curl -s -L --max-time $TIMEOUT "$BASE_URL" 2>/dev/null)
  echo "$body" | grep -qi "chefflow"
}

run_content() {
  if with_retry "Content check" check_content; then
    record_pass "Page content contains 'ChefFlow'"
  else
    record_fail "Page content missing 'ChefFlow' (wrong app or broken render)"
  fi
}

# 5. Response time check (ping should be fast)
run_response_time() {
  local time_ms
  time_ms=$(curl -s -o /dev/null -w '%{time_total}' --max-time $TIMEOUT "$BASE_URL/api/health/ping" 2>/dev/null)
  # Convert to milliseconds (time_total is in seconds with decimals)
  local ms
  ms=$(echo "$time_ms" | awk '{printf "%.0f", $1 * 1000}')
  if [ "$ms" -lt 5000 ]; then
    record_pass "Ping response time: ${ms}ms"
  else
    record_fail "Ping response time too slow: ${ms}ms (>5000ms)"
  fi
}

# ---- run all checks ----

echo ""
echo "=========================================="
echo "  ChefFlow Health Check"
echo "  Target: $BASE_URL"
echo "  Retries: $MAX_RETRIES (${RETRY_DELAY}s delay)"
echo "  Timeout: ${TIMEOUT}s per request"
echo "=========================================="
echo ""

run_main_page
run_ping
run_health_api
run_content
run_response_time

echo ""
echo "=========================================="
echo "  Results: $PASSED/$TOTAL passed, $FAILED failed"
if [ "$FAILED" -eq 0 ]; then
  echo -e "  \033[32mALL CHECKS PASSED\033[0m"
  echo "=========================================="
  exit 0
else
  echo -e "  \033[31m$FAILED CHECK(S) FAILED\033[0m"
  echo "=========================================="
  exit 1
fi

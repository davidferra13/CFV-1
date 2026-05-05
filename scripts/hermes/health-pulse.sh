#!/bin/bash
# Hermes Job 1: App Health Pulse (v2)
# Runs every 15 minutes. Deep health check: status codes, response times, body scanning.
# Output: docs/hermes/health-pulse.jsonl

CHEFFLOW="/mnt/c/Users/david/Documents/CFv1"
OUTPUT="$CHEFFLOW/docs/hermes/health-pulse.jsonl"
ALERTS="$CHEFFLOW/docs/hermes/ALERTS.md"
BASE="http://localhost:3100"
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

mkdir -p "$(dirname "$OUTPUT")"

# Check if server is even running
if ! curl -s -o /dev/null -m 5 "$BASE/" 2>/dev/null; then
  echo "{\"ts\":\"$TS\",\"server_running\":false,\"routes\":{},\"slow_routes\":[],\"error_routes\":[]}" >> "$OUTPUT"
  echo "- **$TS** [CRITICAL] ChefFlow server not responding on port 3100" >> "$ALERTS"
  exit 0
fi

# Route groups: public, chef, client, admin, API
declare -a ROUTE_LIST=(
  "/"
  "/chefs"
  "/book"
  "/ingredients"
  "/how-it-works"
  "/faq"
  "/about"
  "/services"
  "/api/health"
  "/api/openclaw/status"
  "/api/ai/monitor"
  "/api/kiosk/status"
  "/signin"
)

ROUTE_JSON="{"
SLOW_ROUTES="["
ERROR_ROUTES="["
FIRST=true
FIRST_SLOW=true
FIRST_ERR=true
TOTAL=0
OK_COUNT=0
SLOW_COUNT=0
ERR_COUNT=0

for route in "${ROUTE_LIST[@]}"; do
  TOTAL=$((TOTAL + 1))

  # Capture status code, response time, and body size
  RESULT=$(curl -s -o /tmp/hermes_body -w "%{http_code}|%{time_total}|%{size_download}" -m 15 "${BASE}${route}" 2>/dev/null)
  CODE=$(echo "$RESULT" | cut -d'|' -f1)
  TIME=$(echo "$RESULT" | cut -d'|' -f2)
  SIZE=$(echo "$RESULT" | cut -d'|' -f3)

  # Default on timeout
  [ -z "$CODE" ] && CODE="000"
  [ -z "$TIME" ] && TIME="0"
  [ -z "$SIZE" ] && SIZE="0"

  # Build route entry
  if [ "$FIRST" = true ]; then FIRST=false; else ROUTE_JSON+=","; fi
  ROUTE_JSON+="\"$route\":{\"code\":$CODE,\"time\":$TIME,\"size\":$SIZE}"

  # Check for errors (non-2xx)
  if [[ "$CODE" != 2* ]]; then
    ERR_COUNT=$((ERR_COUNT + 1))
    if [ "$FIRST_ERR" = true ]; then FIRST_ERR=false; else ERROR_ROUTES+=","; fi
    ERROR_ROUTES+="\"$route ($CODE)\""
    echo "- **$TS** [ERROR] Route \`$route\` returned HTTP $CODE (${TIME}s)" >> "$ALERTS"
  else
    OK_COUNT=$((OK_COUNT + 1))
  fi

  # Check for slow responses (>3 seconds)
  SLOW=$(echo "$TIME" | awk '{print ($1 > 3.0) ? "1" : "0"}')
  if [ "$SLOW" = "1" ]; then
    SLOW_COUNT=$((SLOW_COUNT + 1))
    if [ "$FIRST_SLOW" = true ]; then FIRST_SLOW=false; else SLOW_ROUTES+=","; fi
    SLOW_ROUTES+="\"$route (${TIME}s)\""
  fi

  # Check for suspiciously small body (broken render)
  if [[ "$CODE" == 2* ]] && [ "$SIZE" -lt 500 ] && [[ "$route" != /api/* ]]; then
    echo "- **$TS** [WARN] Route \`$route\` returned only ${SIZE} bytes (possible broken render)" >> "$ALERTS"
  fi

  # Scan body for error signatures
  if [ -f /tmp/hermes_body ]; then
    if grep -qi "internal server error\|NEXT_NOT_FOUND\|application error\|unhandled runtime error\|hydration failed" /tmp/hermes_body 2>/dev/null; then
      echo "- **$TS** [ERROR] Route \`$route\` body contains error signature" >> "$ALERTS"
    fi
  fi
done

ROUTE_JSON+="}"
SLOW_ROUTES+="]"
ERROR_ROUTES+="]"

ALL_OK=true
[ "$ERR_COUNT" -gt 0 ] && ALL_OK=false

echo "{\"ts\":\"$TS\",\"server_running\":true,\"total\":$TOTAL,\"ok\":$OK_COUNT,\"errors\":$ERR_COUNT,\"slow\":$SLOW_COUNT,\"routes\":$ROUTE_JSON,\"slow_routes\":$SLOW_ROUTES,\"error_routes\":$ERROR_ROUTES,\"all_ok\":$ALL_OK}" >> "$OUTPUT"

rm -f /tmp/hermes_body

# Rotate: keep last 7 days (~672 entries at 15min intervals)
if [ -f "$OUTPUT" ]; then
  LINES=$(wc -l < "$OUTPUT")
  if [ "$LINES" -gt 700 ]; then
    tail -672 "$OUTPUT" > "$OUTPUT.tmp" && mv "$OUTPUT.tmp" "$OUTPUT"
  fi
fi

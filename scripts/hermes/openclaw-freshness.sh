#!/bin/bash
# Hermes Job 2: OpenClaw Data Freshness
# Runs every 2 hours. Checks Pi health, price counts, sync age.
# Output: docs/hermes/openclaw-freshness.jsonl

CHEFFLOW="/mnt/c/Users/david/Documents/CFv1"
OUTPUT="$CHEFFLOW/docs/hermes/openclaw-freshness.jsonl"
ALERTS="$CHEFFLOW/docs/hermes/ALERTS.md"
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

mkdir -p "$(dirname "$OUTPUT")"

PI_HOST="10.0.0.177"
PI_API="http://$PI_HOST:8081"

# Check Pi alive
PI_ALIVE=false
PI_HEALTH=$(curl -s -m 10 "$PI_API/api/health" 2>/dev/null)
if [ $? -eq 0 ] && [ -n "$PI_HEALTH" ]; then
  PI_ALIVE=true
fi

# Get stats from Pi
PRICE_COUNT=0
if [ "$PI_ALIVE" = true ]; then
  PI_STATS=$(curl -s -m 10 "$PI_API/api/stats" 2>/dev/null)
  if [ -n "$PI_STATS" ]; then
    PRICE_COUNT=$(echo "$PI_STATS" | jq -r '.total_prices // .prices_count // 0' 2>/dev/null || echo "0")
  fi
fi

# Check ChefFlow sync status
SYNC_STATUS=$(curl -s -m 10 "http://localhost:3100/api/openclaw/status" 2>/dev/null)
LAST_SYNC=""
if [ -n "$SYNC_STATUS" ]; then
  LAST_SYNC=$(echo "$SYNC_STATUS" | jq -r '.lastSync // .last_sync // ""' 2>/dev/null || echo "")
fi

# Fallback: read local sync file
if [ -z "$LAST_SYNC" ] && [ -f "$CHEFFLOW/docs/sync-status.json" ]; then
  LAST_SYNC=$(jq -r '.lastSync // .last_sync // ""' "$CHEFFLOW/docs/sync-status.json" 2>/dev/null || echo "")
fi

# Calculate sync age in hours
SYNC_AGE_HOURS="null"
STALE=false
if [ -n "$LAST_SYNC" ] && [ "$LAST_SYNC" != "null" ] && [ "$LAST_SYNC" != "" ]; then
  SYNC_EPOCH=$(date -d "$LAST_SYNC" +%s 2>/dev/null || echo "0")
  NOW_EPOCH=$(date +%s)
  if [ "$SYNC_EPOCH" -gt 0 ]; then
    SYNC_AGE_HOURS=$(( (NOW_EPOCH - SYNC_EPOCH) / 3600 ))
    if [ "$SYNC_AGE_HOURS" -gt 36 ]; then
      STALE=true
    fi
  fi
fi

# Alerts
if [ "$PI_ALIVE" = false ]; then
  echo "- **$TS** - OpenClaw Pi ($PI_HOST) unreachable" >> "$ALERTS"
fi
if [ "$STALE" = true ]; then
  echo "- **$TS** - OpenClaw sync stale (${SYNC_AGE_HOURS}h since last sync)" >> "$ALERTS"
fi

echo "{\"ts\":\"$TS\",\"pi_alive\":$PI_ALIVE,\"price_count\":$PRICE_COUNT,\"last_sync\":\"$LAST_SYNC\",\"sync_age_hours\":$SYNC_AGE_HOURS,\"stale\":$STALE}" >> "$OUTPUT"

# Rotate: keep last 7 days (~84 entries at 2h intervals)
if [ -f "$OUTPUT" ]; then
  LINES=$(wc -l < "$OUTPUT")
  if [ "$LINES" -gt 100 ]; then
    tail -84 "$OUTPUT" > "$OUTPUT.tmp" && mv "$OUTPUT.tmp" "$OUTPUT"
  fi
fi

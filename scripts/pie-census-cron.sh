#!/bin/bash
# ============================================
# PIE Census & Compliance Cron
# ============================================
# Runs the full PIE law enforcement pipeline via the ChefFlow API.
# Triggers: Census build, synthetic pricing, freshness enforcement,
# compound learning, anomaly detection, compliance report.
#
# Install on Pi:
#   crontab -e
#   0 */6 * * * /home/davidferra/apps/chefflow-prod/scripts/pie-census-cron.sh >> /home/davidferra/.pm2/logs/pie-census.log 2>&1
#
# Or run manually:
#   bash scripts/pie-census-cron.sh
# ============================================

LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')]"
TIMEOUT=300  # 5 min max (pipeline can be slow)

# ChefFlow API (localhost, not via Cloudflare)
CHEFFLOW_URL="http://localhost:3000"
CRON_SECRET="${CRON_SECRET:-$(grep CRON_SECRET /home/davidferra/apps/chefflow-prod/.env.local 2>/dev/null | cut -d= -f2)}"

if [ -z "$CRON_SECRET" ]; then
    echo "$LOG_PREFIX [ERROR] CRON_SECRET not set. Cannot authenticate."
    exit 1
fi

echo "$LOG_PREFIX [PIE] Starting census pipeline..."

# Check ChefFlow is healthy first
health=$(curl -s --max-time 10 "$CHEFFLOW_URL/api/health/ping" 2>/dev/null)
if ! echo "$health" | grep -q '"status":"ok"'; then
    echo "$LOG_PREFIX [PIE] ChefFlow not responding. Skipping census run."
    exit 1
fi

# Trigger the full PIE pipeline
response=$(curl -s --max-time $TIMEOUT \
    -H "Authorization: Bearer $CRON_SECRET" \
    "$CHEFFLOW_URL/api/cron/pie-census" 2>/dev/null)

if echo "$response" | grep -q '"success":true'; then
    # Extract key metrics
    coverage=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('censusStats',{}).get('coveragePct','?'))" 2>/dev/null || echo "?")
    census_size=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('censusStats',{}).get('totalIngredients','?'))" 2>/dev/null || echo "?")
    synthetics=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('synthetic',{}).get('syntheticsGenerated','?'))" 2>/dev/null || echo "?")
    stale=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('freshness',{}).get('totalStale','?'))" 2>/dev/null || echo "?")

    echo "$LOG_PREFIX [PIE] SUCCESS: census=$census_size coverage=${coverage}% synthetics=$synthetics stale=$stale"
else
    error=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error','unknown'))" 2>/dev/null || echo "unknown")
    echo "$LOG_PREFIX [PIE] FAILED: $error"
    exit 1
fi

# Also check Pi Bridge health
pi_health=$(curl -s --max-time 5 "http://localhost:7700/health" 2>/dev/null)
if echo "$pi_health" | grep -q '"status":"ok"'; then
    total_prices=$(echo "$pi_health" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('total_prices','?'))" 2>/dev/null || echo "?")
    echo "$LOG_PREFIX [PIE] Pi Bridge healthy: $total_prices prices"
else
    echo "$LOG_PREFIX [PIE] WARNING: Pi Bridge not responding on port 7700"
fi

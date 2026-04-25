#!/bin/bash
# Deploy nationwide pricing expansion to the Raspberry Pi
#
# Deploys updated scrapers that cover 110 chains across all 50 states + DC.
# The Pi's existing cron jobs will pick up the new configs automatically.
#
# Usage: bash scripts/deploy-nationwide-to-pi.sh
#
# Prerequisites:
#   - SSH access to Pi (ssh davidferra@10.0.0.177)
#   - OpenClaw price-intel profile active on Pi

set -e

PI_HOST="davidferra@10.0.0.177"
PI_DIR="/home/davidferra/openclaw-prices"
LOCAL_BUILD=".openclaw-build"

echo "=== Nationwide Pricing Deployment ==="
echo "Target: $PI_HOST:$PI_DIR"
echo ""
echo "Coverage: 110 chains, 1842 scrape targets, all 50 states + DC"
echo ""

# 1. Copy the nationwide store registry (central config)
echo "[1/5] Deploying nationwide store registry..."
scp "$LOCAL_BUILD/services/nationwide-stores.mjs" "$PI_HOST:$PI_DIR/services/"

# 2. Copy updated scrapers
echo "[2/7] Deploying updated scrapers..."
scp "$LOCAL_BUILD/services/scraper-instacart-bulk.mjs" "$PI_HOST:$PI_DIR/services/"
scp "$LOCAL_BUILD/services/scraper-wholefoodsapfresh.mjs" "$PI_HOST:$PI_DIR/services/"
scp "$LOCAL_BUILD/services/scraper-flipp.mjs" "$PI_HOST:$PI_DIR/services/"
scp "$LOCAL_BUILD/services/scraper-walmart-nationwide.mjs" "$PI_HOST:$PI_DIR/services/"
scp "$LOCAL_BUILD/services/scraper-target-nationwide.mjs" "$PI_HOST:$PI_DIR/services/"
scp "$LOCAL_BUILD/services/nationwide-config.mjs" "$PI_HOST:$PI_DIR/services/"

# 3. Copy updated orchestrator
echo "[3/5] Deploying catalog orchestrator..."
scp ".openclaw-deploy/catalog-orchestrator.mjs" "$PI_HOST:$PI_DIR/services/"

# 4. Verify files landed
echo "[4/5] Verifying deployment..."
ssh "$PI_HOST" "ls -la $PI_DIR/services/nationwide-stores.mjs $PI_DIR/services/scraper-instacart-bulk.mjs $PI_DIR/services/scraper-flipp.mjs $PI_DIR/services/scraper-wholefoodsapfresh.mjs"

# 5. Run validation on the Pi
echo "[5/5] Validating nationwide store registry on Pi..."
ssh "$PI_HOST" "cd $PI_DIR && node services/nationwide-stores.mjs"

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "To start the nationwide scrape:"
echo ""
echo "  # Instacart (all chains, all states - will take days):"
echo "  ssh $PI_HOST"
echo "  cd $PI_DIR"
echo "  nohup node services/scraper-instacart-bulk.mjs > logs/nationwide-instacart.log 2>&1 &"
echo ""
echo "  # Flipp (weekly ads, all regions):"
echo "  nohup node services/scraper-flipp.mjs > logs/nationwide-flipp.log 2>&1 &"
echo ""
echo "  # Whole Foods (21 regions):"
echo "  nohup node services/scraper-wholefoodsapfresh.mjs > logs/nationwide-wholefoods.log 2>&1 &"
echo ""
echo "  # Monitor:"
echo "  tail -f logs/nationwide-instacart.log"
echo ""
echo "After data exists, sync to ChefFlow:"
echo "  node scripts/openclaw-pull/sync-all.mjs"

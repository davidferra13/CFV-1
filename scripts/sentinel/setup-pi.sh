#!/bin/bash
# One-time setup for Playwright Sentinel on Raspberry Pi
# Run this ON the Pi after SSH-ing in
# Usage: bash setup-pi.sh

set -e

echo "=== Sentinel Setup for Raspberry Pi ==="

# 1. Ensure Node.js is available
if ! command -v node &> /dev/null; then
  echo "ERROR: Node.js not found. Install Node.js 18+ first."
  exit 1
fi
echo "Node.js $(node -v) found"

# 2. Create sentinel working directory
SENTINEL_DIR="$HOME/sentinel"
mkdir -p "$SENTINEL_DIR"
mkdir -p "$SENTINEL_DIR/results"
mkdir -p "$SENTINEL_DIR/test-results"
echo "Created $SENTINEL_DIR"

# 3. Install Playwright and dependencies
cd "$SENTINEL_DIR"

# Init package.json if missing
if [ ! -f package.json ]; then
  cat > package.json << 'PJSON'
{
  "name": "chefflow-sentinel",
  "private": true,
  "type": "module",
  "dependencies": {
    "@playwright/test": "^1.49.0",
    "dotenv": "^16.4.0"
  }
}
PJSON
fi

npm install

# Install Chromium for ARM64
npx playwright install chromium
echo "Playwright + Chromium installed"

# 4. Create .env file template (user fills in credentials)
if [ ! -f .env.local ]; then
  cat > .env.local << 'ENV'
# Sentinel Configuration
SENTINEL_BASE_URL=https://app.cheflowhq.com
SENTINEL_EMAIL=agent@local.chefflow
SENTINEL_PASSWORD=CHEF.jdgyuegf9924092.FLOW
CRON_SECRET=SaltyPhish7!
DISCORD_SENTINEL_WEBHOOK=
ENV
  echo "Created .env.local template - verify credentials are correct"
else
  echo ".env.local already exists, skipping"
fi

# 5. Set up cron jobs
CRON_TMP=$(mktemp)
crontab -l 2>/dev/null > "$CRON_TMP" || true

# Remove old sentinel entries if any
grep -v "sentinel" "$CRON_TMP" > "${CRON_TMP}.clean" || true
mv "${CRON_TMP}.clean" "$CRON_TMP"

# Add sentinel cron schedule (with Discord notifications)
cat >> "$CRON_TMP" << CRON
# ChefFlow Sentinel - Automated QA (with Discord alerts)
# T0: Smoke - every 4 hours
0 */4 * * * cd $SENTINEL_DIR && npx playwright test --config=playwright.sentinel.config.ts --project=sentinel-smoke >> results/cron-smoke.log 2>&1; bash scripts/sentinel/notify-discord.sh smoke \$? results/sentinel-report.json
# T1: Critical Paths - daily 6 AM
0 6 * * * cd $SENTINEL_DIR && npx playwright test --config=playwright.sentinel.config.ts --project=sentinel-critical >> results/cron-critical.log 2>&1; bash scripts/sentinel/notify-discord.sh critical \$? results/sentinel-report.json
# T2: Data Verification - daily 11:15 PM (after 11 PM price sync)
15 23 * * * cd $SENTINEL_DIR && npx playwright test --config=playwright.sentinel.config.ts --project=sentinel-data >> results/cron-data.log 2>&1; bash scripts/sentinel/notify-discord.sh data \$? results/sentinel-report.json
# T3: Full Regression - Sunday 3 AM
0 3 * * 0 cd $SENTINEL_DIR && npx playwright test --config=playwright.sentinel.config.ts --project=sentinel-regression >> results/cron-regression.log 2>&1; bash scripts/sentinel/notify-discord.sh regression \$? results/sentinel-report.json
CRON

crontab "$CRON_TMP"
rm "$CRON_TMP"
echo "Cron jobs installed:"
crontab -l | grep sentinel

echo ""
echo "=== Setup Complete ==="
echo "Next: run 'bash deploy-to-pi.sh' from your dev machine to copy test files"
echo "Then: run a smoke test to verify: cd ~/sentinel && npx playwright test --config=playwright.sentinel.config.ts --project=sentinel-smoke"

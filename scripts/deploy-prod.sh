#!/bin/bash
# Deploy latest main to Pi production
# Usage: bash scripts/deploy-prod.sh
set -e

PI="davidferra@10.0.0.177"
APP="/home/davidferra/apps/chefflow-prod"

echo "=== Deploying to Pi production ==="

# Check connectivity
ssh -o ConnectTimeout=5 "$PI" "echo 'Pi reachable'" || { echo "FAIL: Pi unreachable"; exit 1; }

# Pull, build, restart
ssh "$PI" "cd $APP && git pull origin main && npm run build -- --no-lint && pm2 restart chefflow-prod"

echo ""
echo "=== Deploy complete. Verifying... ==="
sleep 5
curl -s --max-time 10 https://app.cheflowhq.com/api/build-version
echo ""
echo "=== Done ==="

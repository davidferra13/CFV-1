#!/usr/bin/env bash
set -euo pipefail

echo "=== ChefFlow Production Deploy ==="

# Build
echo "[1/3] Building containers..."
docker compose -f docker-compose.prod.yml build

# Start
echo "[2/3] Starting services..."
docker compose -f docker-compose.prod.yml up -d

# Health check (wait up to 60s)
echo "[3/3] Waiting for health check..."
for i in $(seq 1 12); do
  if curl -sf http://localhost:3200/api/health > /dev/null 2>&1; then
    echo "Health check passed."
    echo ""
    echo "=== Deploy complete ==="
    echo "App running at http://localhost:3200"
    echo ""
    echo "To expose via Cloudflare Tunnel:"
    echo "  cloudflared tunnel run chefflow-beta"
    exit 0
  fi
  echo "  Waiting... ($((i * 5))s)"
  sleep 5
done

echo "ERROR: Health check failed after 60s"
exit 1

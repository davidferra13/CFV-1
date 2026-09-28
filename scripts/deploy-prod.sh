#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

# This is the legacy Docker/3200 path, not the documented Windows/3100 runtime.
# Refuse before mutating services when its required build inputs are absent.
for required in Dockerfile .env.production; do
  if [ ! -f "$required" ]; then
    echo "ERROR: Legacy Docker deployment requires $required. See docs/production-tunnel-recovery.md."
    exit 1
  fi
done
command -v node >/dev/null || { echo "ERROR: Node.js is required for the public reachability gate."; exit 1; }

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
    echo "Local Docker origin healthy at http://localhost:3200; checking both public domains..."
    node scripts/production-public-check.mjs
    echo "Public reachability passed. Release readiness and deployed revision still require verification."
    exit 0
  fi
  echo "  Waiting... ($((i * 5))s)"
  sleep 5
done

echo "ERROR: Health check failed after 60s"
exit 1

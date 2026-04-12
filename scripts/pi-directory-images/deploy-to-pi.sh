#!/bin/bash
# Deploy directory-images cartridge to Pi
# Usage: bash scripts/pi-directory-images/deploy-to-pi.sh

set -e

PI_HOST="davidferra@10.0.0.177"
PI_DIR="/home/davidferra/openclaw-directory-images"
LOCAL_DIR="scripts/pi-directory-images"

echo "=== Deploying directory-images cartridge to Pi ==="

# Step 1: Copy files to Pi
echo "[1/5] Copying files to Pi..."
ssh $PI_HOST "mkdir -p $PI_DIR/storage"
scp $LOCAL_DIR/package.json $PI_HOST:$PI_DIR/
scp $LOCAL_DIR/server.mjs $PI_HOST:$PI_DIR/
scp $LOCAL_DIR/scraper.mjs $PI_HOST:$PI_DIR/
scp $LOCAL_DIR/seed-queue.mjs $PI_HOST:$PI_DIR/
scp $LOCAL_DIR/db.mjs $PI_HOST:$PI_DIR/

# Step 2: Install dependencies on Pi
echo "[2/5] Installing dependencies on Pi..."
ssh $PI_HOST "cd $PI_DIR && npm install --production"

# Step 3: Install systemd service
echo "[3/5] Installing systemd service..."
scp $LOCAL_DIR/openclaw-directory-images.service $PI_HOST:/tmp/
ssh $PI_HOST "sudo cp /tmp/openclaw-directory-images.service /etc/systemd/system/ && sudo systemctl daemon-reload"

# Step 4: Start service
echo "[4/5] Starting service..."
ssh $PI_HOST "sudo systemctl enable openclaw-directory-images && sudo systemctl restart openclaw-directory-images"
sleep 2
ssh $PI_HOST "sudo systemctl status openclaw-directory-images --no-pager -l | head -15"

# Step 5: Verify
echo "[5/5] Verifying..."
ssh $PI_HOST "curl -s http://localhost:8085/health" | python3 -m json.tool 2>/dev/null || ssh $PI_HOST "curl -s http://localhost:8085/health"

echo ""
echo "=== Deployed! ==="
echo "Next steps:"
echo "  1. Seed the queue:  ssh $PI_HOST 'cd $PI_DIR && node seed-queue.mjs --chefflow-db=postgresql://postgres:postgres@<CHEFFLOW_IP>:54322/postgres'"
echo "  2. Run scraper:     ssh $PI_HOST 'cd $PI_DIR && node scraper.mjs --batch=1000'"
echo "  3. Check stats:     curl http://10.0.0.177:8085/api/stats"

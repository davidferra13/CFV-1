#!/bin/bash
# =============================================================
# ChefFlow Pi Setup Script
# Run this FROM your Windows laptop (in Git Bash or WSL) after
# the Raspberry Pi is plugged in and powered on.
#
# Usage:
#   bash scripts/pi-setup.sh
#   bash scripts/pi-setup.sh chefflow-pi.local   # custom hostname
#   bash scripts/pi-setup.sh 192.168.1.42        # or use IP directly
# =============================================================

PI_HOST="${1:-chefflow-pi.local}"
PI_USER="${2:-pi}"
MODEL="qwen3:8b"

echo ""
echo "============================================="
echo "  ChefFlow Raspberry Pi Setup"
echo "  Connecting to: $PI_USER@$PI_HOST"
echo "============================================="
echo ""

# --- Step 1: Test SSH connection ---
echo "[1/5] Testing SSH connection to $PI_HOST..."
if ! ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$PI_USER@$PI_HOST" "echo OK" 2>/dev/null; then
  echo ""
  echo "ERROR: Cannot connect to $PI_HOST"
  echo ""
  echo "Make sure:"
  echo "  - The Pi is powered on and ethernet is plugged into your router"
  echo "  - SSH was enabled during Raspberry Pi Imager setup"
  echo "  - Username is '$PI_USER' (default for Pi OS)"
  echo ""
  echo "If the hostname doesn't work, try:"
  echo "  bash scripts/pi-setup.sh 192.168.1.xxx"
  echo "(Replace xxx with the Pi's actual IP from your router's device list)"
  exit 1
fi
echo "  SSH connection OK."
echo ""

# --- Step 2: Install Ollama ---
echo "[2/5] Installing Ollama on the Pi..."
ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_HOST" "
  if command -v ollama &> /dev/null; then
    echo '  Ollama already installed — skipping.'
  else
    curl -fsSL https://ollama.com/install.sh | sh
    echo '  Ollama installed.'
  fi
"
echo ""

# --- Step 3: Configure Ollama to listen on all network interfaces ---
echo "[3/5] Configuring Ollama to accept network connections..."
ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_HOST" "
  # Create systemd override so Ollama listens on 0.0.0.0 (not just localhost)
  sudo mkdir -p /etc/systemd/system/ollama.service.d
  echo '[Service]
Environment=\"OLLAMA_HOST=0.0.0.0\"' | sudo tee /etc/systemd/system/ollama.service.d/override.conf > /dev/null
  sudo systemctl daemon-reload
  echo '  Network binding configured.'
"
echo ""

# --- Step 4: Enable + start Ollama service ---
echo "[4/5] Enabling Ollama to start automatically on boot..."
ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_HOST" "
  sudo systemctl enable ollama
  sudo systemctl restart ollama
  sleep 3
  if sudo systemctl is-active --quiet ollama; then
    echo '  Ollama service is running.'
  else
    echo '  WARNING: Ollama service may not be running. Check with: sudo systemctl status ollama'
  fi
"
echo ""

# --- Step 5: Pull the AI model ---
echo "[5/5] Downloading AI model ($MODEL) — this may take 5-10 minutes on first run..."
ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_HOST" "
  ollama pull $MODEL
  echo '  Model ready.'
"
echo ""

# --- Done: Show Pi IP ---
echo "============================================="
echo "  Setup Complete!"
echo "============================================="
echo ""
echo "Pi's IP address (you'll need this next):"
ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_HOST" "hostname -I | awk '{print \$1}'"
echo ""
echo "Next step: Run the connect script to point ChefFlow at the Pi:"
echo "  bash scripts/connect-pi.sh \$(ssh $PI_USER@$PI_HOST hostname -I | awk '{print \$1}')"
echo ""

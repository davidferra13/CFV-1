#!/bin/bash
# =============================================================
# ChefFlow Pi Connect Script
# Updates .env.local to point ChefFlow's AI at your Raspberry Pi.
# Run this FROM your Windows laptop (in Git Bash) after pi-setup.sh completes.
#
# Usage:
#   bash scripts/connect-pi.sh 192.168.1.42
# =============================================================

PI_IP="${1}"
MODEL="qwen3:8b"
ENV_FILE=".env.local"

if [ -z "$PI_IP" ]; then
  echo ""
  echo "ERROR: Please provide the Pi's IP address."
  echo "Usage: bash scripts/connect-pi.sh 192.168.1.42"
  echo ""
  echo "To find the Pi's IP, run:"
  echo "  ssh pi@chefflow-pi.local hostname -I"
  exit 1
fi

echo ""
echo "============================================="
echo "  ChefFlow — Connecting to Raspberry Pi"
echo "  Pi IP: $PI_IP"
echo "============================================="
echo ""

# --- Verify Ollama is reachable at the Pi IP before changing anything ---
echo "Verifying Ollama is reachable at $PI_IP:11434 ..."
if curl -s --max-time 5 "http://$PI_IP:11434/api/tags" > /dev/null 2>&1; then
  echo "  Ollama is reachable."
else
  echo ""
  echo "ERROR: Cannot reach Ollama at http://$PI_IP:11434"
  echo ""
  echo "Make sure:"
  echo "  - The Pi is powered on"
  echo "  - You ran pi-setup.sh successfully"
  echo "  - Your laptop and Pi are on the same network"
  echo ""
  echo ".env.local has NOT been changed."
  exit 1
fi
echo ""

# --- Back up current .env.local ---
if [ -f "$ENV_FILE" ]; then
  cp "$ENV_FILE" "${ENV_FILE}.backup"
  echo "Backed up $ENV_FILE to ${ENV_FILE}.backup"
fi

# --- Update OLLAMA_BASE_URL ---
if grep -q "^OLLAMA_BASE_URL=" "$ENV_FILE"; then
  # Replace existing line
  sed -i "s|^OLLAMA_BASE_URL=.*|OLLAMA_BASE_URL=http://$PI_IP:11434|" "$ENV_FILE"
  echo "Updated OLLAMA_BASE_URL → http://$PI_IP:11434"
else
  # Append if not present
  echo "" >> "$ENV_FILE"
  echo "# Raspberry Pi Ollama (always-on AI)" >> "$ENV_FILE"
  echo "OLLAMA_BASE_URL=http://$PI_IP:11434" >> "$ENV_FILE"
  echo "Added OLLAMA_BASE_URL=http://$PI_IP:11434"
fi

# --- Update OLLAMA_MODEL ---
if grep -q "^OLLAMA_MODEL=" "$ENV_FILE"; then
  sed -i "s|^OLLAMA_MODEL=.*|OLLAMA_MODEL=$MODEL|" "$ENV_FILE"
  echo "Updated OLLAMA_MODEL → $MODEL"
else
  echo "OLLAMA_MODEL=$MODEL" >> "$ENV_FILE"
  echo "Added OLLAMA_MODEL=$MODEL"
fi

echo ""
echo "============================================="
echo "  Done! ChefFlow now points to your Pi."
echo "============================================="
echo ""
echo "Restart the dev server to apply changes:"
echo "  (stop the server with Ctrl+C, then restart it)"
echo ""
echo "Then open ChefFlow — the status badge should show:"
echo "  Pi · [latency]ms  (green)"
echo ""

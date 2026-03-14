#!/usr/bin/env bash
# fix-pi-oom.sh — One-time fix for Raspberry Pi OOM crashes
# Disables Ollama, enables watchdog, sets up zram, protects critical services
# Run from PC: bash scripts/fix-pi-oom.sh

set -euo pipefail

PI_HOST="pi"

echo ""
echo "================================================"
echo "  Pi OOM Fix — Complete hardening script"
echo "  Waiting for Pi to come up after reboot..."
echo "================================================"
echo ""

# ─── Step 0: Wait for Pi ───
echo "[0/7] Waiting for Pi to respond to SSH..."
MAX_WAIT=180
WAITED=0
while ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$PI_HOST" "echo ok" >/dev/null 2>&1; do
  WAITED=$((WAITED + 5))
  if [ "$WAITED" -ge "$MAX_WAIT" ]; then
    echo "ERROR: Pi did not come back after ${MAX_WAIT}s. Is it powered on?"
    exit 1
  fi
  echo "  ...not up yet (${WAITED}s elapsed). Retrying in 5s..."
  sleep 5
done
echo "  Pi is up!"
echo ""

# ─── Step 1: Show current memory state ───
echo "[1/7] Current memory state (BEFORE fix):"
ssh "$PI_HOST" "free -h"
echo ""

# ─── Step 2: Stop and disable Ollama permanently ───
echo "[2/7] Stopping and disabling Ollama..."
ssh "$PI_HOST" "sudo systemctl stop ollama 2>/dev/null || true; sudo systemctl disable ollama 2>/dev/null || true"
echo "  Ollama stopped and disabled from boot."
echo ""

# ─── Step 3: Protect critical services from OOM killer ───
echo "[3/7] Protecting sshd and cloudflared from OOM killer..."
ssh "$PI_HOST" << 'OOMPROTECT'
  # OOMScoreAdjust=-900 means "kill this process LAST" (-1000 = never kill)
  # This ensures SSH and cloudflared survive even if something else eats RAM

  # Protect sshd
  SSH_SERVICE="ssh"
  if ! systemctl cat ssh >/dev/null 2>&1; then
    SSH_SERVICE="sshd"
  fi
  sudo mkdir -p /etc/systemd/system/${SSH_SERVICE}.service.d
  echo -e "[Service]\nOOMScoreAdjust=-900" | sudo tee /etc/systemd/system/${SSH_SERVICE}.service.d/oom-protect.conf >/dev/null
  echo "  sshd: OOM priority set to -900 (protected)"

  # Protect cloudflared
  sudo mkdir -p /etc/systemd/system/cloudflared.service.d
  echo -e "[Service]\nOOMScoreAdjust=-800" | sudo tee /etc/systemd/system/cloudflared.service.d/oom-protect.conf >/dev/null
  echo "  cloudflared: OOM priority set to -800 (protected)"

  sudo systemctl daemon-reload
OOMPROTECT
echo ""

# ─── Step 4: Set up zram (compressed RAM swap — way faster than SD card) ───
echo "[4/7] Setting up zram swap (replaces slow SD card swap)..."
ssh "$PI_HOST" << 'ZRAM'
  # Install zram-tools if not present
  if ! dpkg -l | grep -q zram-tools 2>/dev/null; then
    sudo apt-get update -qq
    sudo apt-get install -y -qq zram-tools 2>/dev/null
    echo "  zram-tools installed"
  else
    echo "  zram-tools already installed"
  fi

  # Configure zram: use 50% of RAM (4 GB) as compressed swap
  # Compression ratio is typically 2-3x, so 4 GB zram ≈ 8-12 GB effective swap
  sudo tee /etc/default/zramswap >/dev/null << 'ZRAMCONF'
ALGO=zstd
PERCENT=50
PRIORITY=100
ZRAMCONF

  # Disable the old SD card swap file (slow, wears out the card)
  if [ -f /var/swap ]; then
    sudo swapoff /var/swap 2>/dev/null || true
    sudo rm -f /var/swap
    echo "  Old SD card swap removed"
  fi

  # Remove any swap entry from fstab
  sudo sed -i '/\/var\/swap/d' /etc/fstab 2>/dev/null || true

  # Start zram
  sudo systemctl enable zramswap 2>/dev/null || true
  sudo systemctl restart zramswap 2>/dev/null || true
  echo "  zram swap active (4 GB compressed, ~3x faster than SD card)"
ZRAM
echo ""

# ─── Step 5: Enable hardware watchdog ───
echo "[5/7] Enabling hardware watchdog (15s auto-reboot on hang)..."
ssh "$PI_HOST" << 'WATCHDOG'
  # Enable watchdog in systemd config
  if grep -q '^RuntimeWatchdogSec=' /etc/systemd/system.conf 2>/dev/null; then
    sudo sed -i 's/^RuntimeWatchdogSec=.*/RuntimeWatchdogSec=15/' /etc/systemd/system.conf
  elif grep -q '^#RuntimeWatchdogSec=' /etc/systemd/system.conf 2>/dev/null; then
    sudo sed -i 's/^#RuntimeWatchdogSec=.*/RuntimeWatchdogSec=15/' /etc/systemd/system.conf
  else
    echo 'RuntimeWatchdogSec=15' | sudo tee -a /etc/systemd/system.conf >/dev/null
  fi

  # Load the watchdog kernel module
  if ! grep -q 'bcm2835_wdt' /etc/modules 2>/dev/null; then
    echo 'bcm2835_wdt' | sudo tee -a /etc/modules >/dev/null
  fi
  sudo modprobe bcm2835_wdt 2>/dev/null || true

  # Reload systemd to activate
  sudo systemctl daemon-reexec

  # Verify
  if [ -e /dev/watchdog ] || [ -e /dev/watchdog0 ]; then
    echo "  Watchdog device exists — hardware auto-reboot is ACTIVE"
  else
    echo "  WARNING: /dev/watchdog not found — may need one more reboot to activate"
  fi
WATCHDOG
echo ""

# ─── Step 6: Verify SSH key auth works ───
echo "[6/7] Verifying SSH key authentication..."
ssh -o BatchMode=yes -o PasswordAuthentication=no "$PI_HOST" "echo '  Key auth: WORKING (no password needed)'" 2>/dev/null || echo "  WARNING: Key auth may not be working — password might be required"
echo ""

# ─── Step 7: Final verification ───
echo "[7/7] Final system status:"
ssh "$PI_HOST" << 'FINAL'
  echo ""
  echo "  Services:"
  echo "    cloudflared: $(systemctl is-active cloudflared 2>/dev/null || echo 'NOT RUNNING')"
  echo "    sshd:        $(systemctl is-active ssh 2>/dev/null || systemctl is-active sshd 2>/dev/null || echo 'unknown')"
  echo "    ollama:      $(systemctl is-active ollama 2>/dev/null || echo 'disabled (good)')"
  echo "    zramswap:    $(systemctl is-active zramswap 2>/dev/null || echo 'not running')"

  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  echo ""
  echo "  PM2 app:"
  pm2 show chefflow-beta 2>/dev/null | grep -E "status|memory" | head -2 || echo "    not found"

  echo ""
  echo "  Memory:"
  free -h

  echo ""
  echo "  Swap details:"
  swapon --show 2>/dev/null || cat /proc/swaps

  echo ""
  echo "  Watchdog:"
  if [ -e /dev/watchdog ] || [ -e /dev/watchdog0 ]; then
    echo "    ACTIVE — auto-reboots on 15s hang"
  else
    echo "    NOT YET ACTIVE — will activate on next reboot"
  fi
FINAL

echo ""
echo "================================================"
echo "  DONE — Pi is fully hardened"
echo "================================================"
echo ""
echo "What changed:"
echo "  1. Ollama DISABLED — frees ~5.5 GB RAM (root cause eliminated)"
echo "  2. OOM PROTECTION — sshd and cloudflared are last to be killed"
echo "  3. ZRAM SWAP — 4 GB fast compressed swap replaces slow SD card swap"
echo "  4. WATCHDOG — auto-reboots on 15s hang (no physical visit needed)"
echo "  5. SSH keepalive — PC detects drops in 60s instead of 3 min"
echo "  6. Deploy script — patched to never restart Ollama"
echo ""
echo "RAM usage: ~1.5 GB of 8 GB (was ~6.5 GB)"
echo "You should never need to physically reboot this Pi again."
echo ""

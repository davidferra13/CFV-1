#!/bin/bash
# =============================================================
# ChefFlow Pi Safeguard Installer
# =============================================================
# Run this ON the Raspberry Pi (via SSH or direct terminal).
# Sets up all memory protections so the Pi never becomes
# unresponsive again.
#
# What it does:
#   1. Protects sshd from OOM killer (NEVER gets killed)
#   2. Makes Ollama the FIRST thing OOM killer targets
#   3. Caps Ollama memory usage via systemd
#   4. Caps Node.js/PM2 memory usage
#   5. Increases swap to 4GB
#   6. Installs memory guardian (runs every 30s)
#   7. Configures staggered boot (services start in order)
#   8. Sets kernel OOM tuning for server workloads
#
# Usage:
#   sudo bash scripts/pi-safeguard-install.sh
#
# Or remotely:
#   ssh pi "cd ~/apps/chefflow-beta && sudo bash scripts/pi-safeguard-install.sh"
# =============================================================

set -euo pipefail

echo ""
echo "============================================="
echo "  ChefFlow Pi Safeguard Installer"
echo "============================================="
echo ""

# Must run as root
if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: Must run as root (sudo)"
  exit 1
fi

APP_DIR="/home/davidferra/apps/chefflow-beta"
GUARDIAN_SCRIPT="$APP_DIR/scripts/pi-memory-guardian.sh"
WATCHDOG_SCRIPT="$APP_DIR/scripts/pi-watchdog.sh"

# ── 1. Protect sshd from OOM killer ──────────────────────────
echo "[1/8] Protecting sshd from OOM killer..."

# OOM score of -1000 = immune from OOM killer
mkdir -p /etc/systemd/system/ssh.service.d
cat > /etc/systemd/system/ssh.service.d/oom-protect.conf << 'EOF'
[Service]
OOMScoreAdjust=-1000
EOF

# Also protect sshd.service (some distros use this name)
mkdir -p /etc/systemd/system/sshd.service.d 2>/dev/null || true
cat > /etc/systemd/system/sshd.service.d/oom-protect.conf << 'EOF'
[Service]
OOMScoreAdjust=-1000
EOF

echo "  sshd is now OOM-immune (score: -1000)"

# ── 2. Protect cloudflared from OOM killer ────────────────────
echo "[2/8] Protecting cloudflared from OOM killer..."

mkdir -p /etc/systemd/system/cloudflared.service.d
cat > /etc/systemd/system/cloudflared.service.d/oom-protect.conf << 'EOF'
[Service]
OOMScoreAdjust=-900
EOF

echo "  cloudflared is now OOM-resistant (score: -900)"

# ── 3. Make Ollama the OOM killer's first target ──────────────
echo "[3/8] Configuring Ollama as OOM killer's first target..."

mkdir -p /etc/systemd/system/ollama.service.d
cat > /etc/systemd/system/ollama.service.d/memory-limits.conf << 'EOF'
[Service]
# OOM killer targets Ollama FIRST (highest positive score = killed first)
OOMScoreAdjust=800

# Hard memory cap: 6GB (prevents runaway model loading)
MemoryMax=6G

# Soft memory target: 5GB (kernel will reclaim above this under pressure)
MemoryHigh=5G

# Keep the existing OLLAMA_HOST override
Environment="OLLAMA_HOST=0.0.0.0"

# Don't auto-restart immediately — let guardian decide
Restart=on-failure
RestartSec=30
EOF

echo "  Ollama will be killed first, capped at 6GB"

# ── 4. Cap PM2/Node.js memory ────────────────────────────────
echo "[4/8] Creating PM2 ecosystem config with memory limits..."

cat > "$APP_DIR/ecosystem.config.cjs" << 'EOF'
// PM2 Ecosystem Config — Memory-Safe for Raspberry Pi (8GB)
module.exports = {
  apps: [{
    name: 'chefflow-beta',
    cwd: '/home/davidferra/apps/chefflow-beta',
    script: 'node_modules/.bin/next',
    args: 'start -p 3100',
    // Memory limits
    node_args: '--max-old-space-size=1536',  // 1.5GB heap max (not 4GB!)
    max_memory_restart: '1800M',             // Auto-restart if exceeds 1.8GB
    // Process management
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    // Logging
    error_file: '/home/davidferra/.pm2/logs/chefflow-beta-error.log',
    out_file: '/home/davidferra/.pm2/logs/chefflow-beta-out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    // Environment
    env: {
      NODE_ENV: 'production',
      PORT: 3100,
      NODE_OPTIONS: '--max-old-space-size=1536',
    },
  }]
}
EOF

chown davidferra:davidferra "$APP_DIR/ecosystem.config.cjs"
echo "  PM2 config created: 1.5GB heap, auto-restart at 1.8GB"

# ── 5. Increase swap to 4GB ──────────────────────────────────
echo "[5/8] Configuring swap space..."

CURRENT_SWAP_MB=$(free -m | grep Swap | awk '{print $2}')
TARGET_SWAP_MB=4096

if [ "$CURRENT_SWAP_MB" -lt 3500 ]; then
  echo "  Current swap: ${CURRENT_SWAP_MB}MB — increasing to ${TARGET_SWAP_MB}MB..."

  # Disable existing swap
  swapoff -a 2>/dev/null || true

  # Remove old swap file if exists
  rm -f /var/swap 2>/dev/null || true

  # Create new 4GB swap file
  dd if=/dev/zero of=/var/swap bs=1M count=$TARGET_SWAP_MB status=progress
  chmod 600 /var/swap
  mkswap /var/swap
  swapon /var/swap

  # Make permanent
  if ! grep -q "/var/swap" /etc/fstab; then
    echo "/var/swap none swap sw 0 0" >> /etc/fstab
  fi

  echo "  Swap increased to ${TARGET_SWAP_MB}MB"
else
  echo "  Swap already ${CURRENT_SWAP_MB}MB — sufficient"
fi

# ── 6. Install Memory Guardian (systemd timer) ───────────────
echo "[6/8] Installing Memory Guardian service..."

# Make guardian executable
chmod +x "$GUARDIAN_SCRIPT" 2>/dev/null || true
chmod +x "$WATCHDOG_SCRIPT" 2>/dev/null || true

# Create the guardian service
cat > /etc/systemd/system/chefflow-memory-guardian.service << EOF
[Unit]
Description=ChefFlow Memory Guardian
After=network.target

[Service]
Type=oneshot
ExecStart=/bin/bash $GUARDIAN_SCRIPT
User=root
EOF

# Create timer (runs every 30 seconds)
cat > /etc/systemd/system/chefflow-memory-guardian.timer << 'EOF'
[Unit]
Description=ChefFlow Memory Guardian Timer

[Timer]
OnBootSec=30
OnUnitActiveSec=30
AccuracySec=5

[Install]
WantedBy=timers.target
EOF

# Create the Ollama watchdog service (existing script)
cat > /etc/systemd/system/chefflow-ollama-watchdog.service << EOF
[Unit]
Description=ChefFlow Ollama Watchdog
After=ollama.service

[Service]
Type=oneshot
ExecStart=/bin/bash $WATCHDOG_SCRIPT
User=davidferra
EOF

# Create watchdog timer (runs every 60 seconds)
cat > /etc/systemd/system/chefflow-ollama-watchdog.timer << 'EOF'
[Unit]
Description=ChefFlow Ollama Watchdog Timer

[Timer]
OnBootSec=90
OnUnitActiveSec=60
AccuracySec=10

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable chefflow-memory-guardian.timer
systemctl start chefflow-memory-guardian.timer
systemctl enable chefflow-ollama-watchdog.timer
systemctl start chefflow-ollama-watchdog.timer

echo "  Memory Guardian: runs every 30s (systemd timer)"
echo "  Ollama Watchdog: runs every 60s (systemd timer)"

# ── 7. Staggered boot order ──────────────────────────────────
echo "[7/8] Configuring staggered boot order..."

# Create a boot sequencer that starts services with delays
cat > /etc/systemd/system/chefflow-boot-sequence.service << 'EOF'
[Unit]
Description=ChefFlow Staggered Boot Sequence
After=network-online.target ssh.service cloudflared.service
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
# Wait 10s after boot, then start PM2 app, wait, then start Ollama
ExecStartPre=/bin/sleep 10
ExecStart=/bin/bash -c '\
  echo "[boot-sequence] Starting PM2 app..." >> /var/log/chefflow-memory-guardian.log; \
  su - davidferra -c "export NVM_DIR=/home/davidferra/.nvm && . /home/davidferra/.nvm/nvm.sh && cd /home/davidferra/apps/chefflow-beta && pm2 start ecosystem.config.cjs 2>/dev/null || pm2 restart chefflow-beta 2>/dev/null" && \
  echo "[boot-sequence] PM2 app started, waiting 15s..." >> /var/log/chefflow-memory-guardian.log && \
  sleep 15 && \
  echo "[boot-sequence] Starting Ollama..." >> /var/log/chefflow-memory-guardian.log && \
  systemctl start ollama && \
  echo "[boot-sequence] Boot sequence complete" >> /var/log/chefflow-memory-guardian.log \
'

[Install]
WantedBy=multi-user.target
EOF

# Disable Ollama auto-start (boot sequence will start it after PM2)
systemctl disable ollama 2>/dev/null || true

systemctl daemon-reload
systemctl enable chefflow-boot-sequence.service

echo "  Boot order: sshd → cloudflared → PM2 (10s delay) → Ollama (15s after PM2)"
echo "  Ollama no longer auto-starts — boot sequence controls it"

# ── 8. Kernel OOM tuning ─────────────────────────────────────
echo "[8/8] Tuning kernel memory management..."

# vm.overcommit_memory=0 — kernel estimates if there's enough memory (default, safe)
# vm.swappiness=60 — moderate swap usage (don't wait until RAM is gone)
# vm.min_free_kbytes=65536 — keep 64MB always free for kernel
cat > /etc/sysctl.d/99-chefflow-memory.conf << 'EOF'
# ChefFlow Pi Memory Tuning
# Keep 64MB always free for kernel operations (prevents sshd starvation)
vm.min_free_kbytes=65536
# Moderate swap usage — start swapping before RAM is critical
vm.swappiness=60
# Don't overcommit memory — safer for constrained systems
vm.overcommit_memory=0
EOF

sysctl -p /etc/sysctl.d/99-chefflow-memory.conf > /dev/null 2>&1

echo "  Kernel: 64MB reserved, moderate swappiness, no overcommit"

# ── Create log file with correct permissions ──────────────────
touch /var/log/chefflow-memory-guardian.log
chmod 666 /var/log/chefflow-memory-guardian.log

# ── Summary ──────────────────────────────────────────────────
echo ""
echo "============================================="
echo "  Safeguard Installation Complete!"
echo "============================================="
echo ""
echo "  PROTECTION LAYERS:"
echo "  1. sshd: OOM-immune (score -1000) — NEVER killed"
echo "  2. cloudflared: OOM-resistant (score -900)"
echo "  3. Ollama: OOM target (score +800), capped at 6GB"
echo "  4. PM2/Next.js: 1.5GB heap, auto-restart at 1.8GB"
echo "  5. Swap: 4GB (was $(echo $CURRENT_SWAP_MB)MB)"
echo "  6. Memory Guardian: checks every 30s, escalating actions"
echo "  7. Staggered boot: sshd → cloudflared → PM2 → Ollama"
echo "  8. Kernel: 64MB reserved, no overcommit"
echo ""
echo "  MEMORY BUDGET (8GB total):"
echo "  ┌──────────────────────────────────────┐"
echo "  │ OS + kernel reserve    ~1.0 GB       │"
echo "  │ sshd + cloudflared     ~0.1 GB       │"
echo "  │ PM2 / Next.js          ~1.5 GB (cap) │"
echo "  │ Ollama + model         ~5.0 GB (cap) │"
echo "  │ Headroom               ~0.4 GB       │"
echo "  │ Swap (emergency)        4.0 GB       │"
echo "  └──────────────────────────────────────┘"
echo ""
echo "  LOGS:"
echo "  tail -f /var/log/chefflow-memory-guardian.log"
echo ""
echo "  To verify:"
echo "  systemctl list-timers | grep chefflow"
echo "  systemctl status chefflow-memory-guardian.timer"
echo ""

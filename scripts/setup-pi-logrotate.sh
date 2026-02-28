#!/bin/bash
# ============================================
# ChefFlow Pi Log Rotation Setup
# ============================================
# One-time setup: installs pm2-logrotate on the Pi
# and configures reasonable limits for 128GB microSD.
#
# Usage: bash scripts/setup-pi-logrotate.sh
# ============================================
set -e

REMOTE="pi"
SSH_OPTS="-o ConnectTimeout=10 -o ServerAliveInterval=30 -o ServerAliveCountMax=20"

echo ""
echo "=========================================="
echo "  PM2 Log Rotation Setup"
echo "=========================================="
echo ""

echo "[1/3] Installing pm2-logrotate..."
ssh $SSH_OPTS "$REMOTE" << 'INSTALL'
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

  # Check if already installed
  if pm2 list 2>/dev/null | grep -q "pm2-logrotate"; then
    echo "  pm2-logrotate already installed"
  else
    pm2 install pm2-logrotate
    echo "  pm2-logrotate installed"
  fi
INSTALL

echo "[2/3] Configuring log rotation limits..."
ssh $SSH_OPTS "$REMOTE" << 'CONFIGURE'
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

  # Max 10MB per log file before rotation
  pm2 set pm2-logrotate:max_size 10M

  # Keep 5 rotated files (50MB max total per log type)
  pm2 set pm2-logrotate:retain 5

  # Compress rotated logs to save space
  pm2 set pm2-logrotate:compress true

  # Rotate at midnight daily
  pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
  pm2 set pm2-logrotate:rotateInterval '0 0 * * *'

  # Save PM2 config so it persists across reboots
  pm2 save

  echo "  Configuration applied"
CONFIGURE

echo "[3/3] Verifying..."
ssh $SSH_OPTS "$REMOTE" << 'VERIFY'
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

  echo "  Current PM2 processes:"
  pm2 list
  echo ""
  echo "  Log file sizes:"
  ls -lh ~/.pm2/logs/ 2>/dev/null || echo "  No log files yet"
VERIFY

echo ""
echo "=========================================="
echo "  Log rotation configured:"
echo "  - Max file size: 10 MB"
echo "  - Retention: 5 files per log"
echo "  - Compression: enabled"
echo "  - Max total: ~100 MB of logs"
echo "=========================================="

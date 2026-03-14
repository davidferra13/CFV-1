#!/bin/bash
# =============================================================
# ChefFlow Pi SSH Helper
# Reads credentials from .auth/pi.json and SSHes into the Pi.
# Uses key-based auth (key already copied). Falls back to
# sshpass if key auth fails and sshpass is available.
#
# Usage:
#   bash scripts/pi-ssh.sh "command to run on pi"
#   bash scripts/pi-ssh.sh   # interactive shell
# =============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CREDS_FILE="$SCRIPT_DIR/../.auth/pi.json"

if [ ! -f "$CREDS_FILE" ]; then
  echo "ERROR: $CREDS_FILE not found. Create it with host, username, password."
  exit 1
fi

PI_HOST=$(grep '"host"' "$CREDS_FILE" | sed 's/.*: *"\(.*\)".*/\1/')
PI_USER=$(grep '"username"' "$CREDS_FILE" | sed 's/.*: *"\(.*\)".*/\1/')
PI_PASS=$(grep '"password"' "$CREDS_FILE" | sed 's/.*: *"\(.*\)".*/\1/')

SSH_OPTS="-o ConnectTimeout=10 -o StrictHostKeyChecking=no -o BatchMode=yes"

if [ -z "$1" ]; then
  # Interactive shell
  ssh $SSH_OPTS "$PI_USER@$PI_HOST"
else
  # Run command
  ssh $SSH_OPTS "$PI_USER@$PI_HOST" "$1"
fi

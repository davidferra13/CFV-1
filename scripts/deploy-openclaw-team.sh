#!/usr/bin/env bash
# Deploy OpenClaw autonomous team configuration to the Pi sandbox
# Usage: bash scripts/deploy-openclaw-team.sh

set -euo pipefail

DEPLOY_DIR="config/openclaw-deploy"
PI_USER="openclawcf"
PI_HOST="pi"
PI_SANDBOX="/home/openclawcf/apps/CFv1-openclaw-sandbox"

echo "=== Deploying OpenClaw Team Config ==="

# Check files exist locally
for file in SOUL.md USER.md HEARTBEAT.md ROADMAP.md PROGRESS.md; do
  if [ ! -f "$DEPLOY_DIR/$file" ]; then
    echo "ERROR: Missing $DEPLOY_DIR/$file"
    exit 1
  fi
done

echo "Copying team files to Pi sandbox..."

# Copy each file via SSH (using sudo since openclawcf owns the dir)
for file in SOUL.md USER.md HEARTBEAT.md ROADMAP.md PROGRESS.md; do
  echo "  -> $file"
  cat "$DEPLOY_DIR/$file" | ssh "$PI_HOST" "sudo -u $PI_USER tee $PI_SANDBOX/$file > /dev/null"
done

# Create memory directory if it doesn't exist
echo "  -> Ensuring memory/ directory exists"
ssh "$PI_HOST" "sudo -u $PI_USER mkdir -p $PI_SANDBOX/memory"

# Create today's memory file
TODAY=$(date +%Y-%m-%d)
echo "  -> Creating memory/$TODAY.md"
cat <<EOF | ssh "$PI_HOST" "sudo -u $PI_USER tee $PI_SANDBOX/memory/$TODAY.md > /dev/null"
# $TODAY - Team Deployment Day

## Events
- Autonomous team configuration deployed
- ROADMAP loaded with 6 priority areas
- Priority 1: Menu Builder System
- All decision-making rules set (see HEARTBEAT.md)

## Decisions Made
- Team operates autonomously 24/7
- Only ask David about: data loss risks, security, auth changes, production deploys
- Everything else: make the call, document it, move on

## Next Steps
- Start Priority 1: Recipe Library (foundation for everything else)
- Read existing recipe code in the codebase first
- Build on what exists, don't rebuild
EOF

# Create MEMORY.md for long-term context
echo "  -> Creating MEMORY.md"
cat <<'EOF' | ssh "$PI_HOST" "sudo -u $PI_USER tee $PI_SANDBOX/MEMORY.md > /dev/null"
# MEMORY.md - Long-Term Context

## About This Project

ChefFlow is an operating system for private chefs. It handles all admin, organizational, and business operations so the chef only has to focus on creative work (cooking, plating, menu design, client relationships).

## Key Architecture Rules

- Server actions with 'use server' for all business logic
- Tenant-scoped queries on everything (tenant_id or chef_id from session, never from request body)
- All money in cents (integer minor units)
- Ledger-first financials (immutable, append-only, computed balances)
- Ollama for private data AI (never cloud LLMs for client data)
- No em dashes anywhere, ever
- No AI-generated recipes or menus, ever
- Formula over AI (deterministic code beats LLM when both can do it)

## About David (the developer/founder)

- Private chef with 10+ years experience
- Built ChefFlow from lived experience, not startup theory
- Uses voice-to-text (messages will be messy, read for intent)
- Direct communicator, hates wasted time
- Wants autonomous progress, not questions
- Core belief: ChefFlow handles the business, chef handles the art

## Team Operating Principles

- Work autonomously 24/7
- Pick up tasks from ROADMAP.md, top to bottom
- Make decisions, document them, move on
- Only escalate: data loss risk, security changes, production deploys
- Test your own work, fix your own bugs
- Commit meaningful chunks, update PROGRESS.md
EOF

# Restart the OpenClaw service to pick up new files
echo ""
echo "Restarting openclaw-chefflow service..."
ssh "$PI_HOST" "sudo systemctl restart openclaw-chefflow"
sleep 3

# Verify it's running
STATUS=$(ssh "$PI_HOST" "systemctl is-active openclaw-chefflow" 2>&1)
if [ "$STATUS" = "active" ]; then
  echo "Service is ACTIVE"
else
  echo "WARNING: Service status is $STATUS"
  ssh "$PI_HOST" "sudo journalctl -u openclaw-chefflow --no-pager -n 10"
fi

echo ""
echo "=== Deployment Complete ==="
echo "Files deployed:"
echo "  SOUL.md     - Team identity and values"
echo "  USER.md     - Developer profile"
echo "  HEARTBEAT.md - Autonomous work loop"
echo "  ROADMAP.md  - Priority work queue"
echo "  PROGRESS.md - Progress tracker"
echo "  MEMORY.md   - Long-term context"
echo "  memory/$TODAY.md - Today's log"
echo ""
echo "OpenClaw is now configured as an autonomous dev team."
echo "Monitor with: ssh pi 'sudo journalctl -u openclaw-chefflow -f'"

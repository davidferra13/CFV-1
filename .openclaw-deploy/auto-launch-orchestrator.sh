#!/bin/bash
# Wait for the current walker run to finish, then launch the orchestrator.
# Usage: nohup bash auto-launch-orchestrator.sh &

echo "[$(date)] Waiting for current walker to finish..."

while pgrep -f "instacart-catalog-walker.mjs market-basket" > /dev/null 2>&1; do
  sleep 30
done

echo "[$(date)] Walker finished. Launching orchestrator for all chains..."

cd ~/openclaw-prices

# Run orchestrator: all chains, all states
nohup node scrapers/catalog-orchestrator.mjs --all > /tmp/orchestrator.log 2>&1 &
ORCH_PID=$!

echo "[$(date)] Orchestrator launched (PID $ORCH_PID). Logs: /tmp/orchestrator.log"

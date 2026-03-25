#!/usr/bin/env bash
# =============================================================================
# ChefFlow Beta Server — Production build + Cloudflare Tunnel
# =============================================================================
# Usage:
#   npm run beta          → Quick tunnel (random URL, instant)
#   npm run beta:named    → Named tunnel (beta.cheflowhq.com, permanent)
#
# Prerequisites:
#   - cloudflared installed (already done)
#   - For named tunnel: cloudflared tunnel login (one-time)
#   - .env.local configured with production the database credentials
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PORT="${PORT:-3100}"
TUNNEL_NAME="chefflow-beta"

cd "$PROJECT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "  ╔═══════════════════════════════════════════╗"
echo "  ║       ChefFlow Beta Server                ║"
echo "  ║       Ops for Artists                      ║"
echo "  ╚═══════════════════════════════════════════╝"
echo -e "${NC}"

# -------------------------------------------------------------------
# Step 1: Build the production app
# -------------------------------------------------------------------
echo -e "${YELLOW}[1/3] Building production app...${NC}"

# Clean previous build to avoid stale artifacts
if [ -d ".next" ]; then
  echo "  Cleaning previous build..."
  rm -rf .next
fi

npx next build --no-lint
echo -e "${GREEN}  ✓ Production build complete${NC}"

# -------------------------------------------------------------------
# Step 2: Start the production server in the background
# -------------------------------------------------------------------
echo -e "${YELLOW}[2/3] Starting production server on port ${PORT}...${NC}"

npx next start -p "$PORT" &
SERVER_PID=$!

# Wait for server to be ready
echo "  Waiting for server to start..."
for i in {1..30}; do
  if curl -s "http://localhost:${PORT}" -o /dev/null 2>/dev/null; then
    echo -e "${GREEN}  ✓ Server running at http://localhost:${PORT} (PID: ${SERVER_PID})${NC}"
    break
  fi
  if [ $i -eq 30 ]; then
    echo -e "${RED}  ✗ Server failed to start after 30 seconds${NC}"
    kill $SERVER_PID 2>/dev/null
    exit 1
  fi
  sleep 1
done

# -------------------------------------------------------------------
# Step 3: Start Cloudflare Tunnel
# -------------------------------------------------------------------
MODE="${1:-quick}"

if [ "$MODE" = "named" ]; then
  echo -e "${YELLOW}[3/3] Starting named Cloudflare Tunnel → beta.cheflowhq.com${NC}"
  echo ""
  echo -e "${GREEN}  Your beta testers can visit: https://beta.cheflowhq.com${NC}"
  echo ""
  cloudflared tunnel --config "$PROJECT_DIR/.cloudflared/config.yml" run f48ab139-b448-4fd9-a431-bcf6b09902f0
else
  echo -e "${YELLOW}[3/3] Starting quick Cloudflare Tunnel...${NC}"
  echo ""
  echo -e "${CYAN}  Copy the URL below and send it to your testers!${NC}"
  echo ""
  cloudflared tunnel --url "http://localhost:${PORT}"
fi

# Cleanup on exit
trap "echo -e '${YELLOW}\nShutting down...${NC}'; kill $SERVER_PID 2>/dev/null; echo -e '${GREEN}Done.${NC}'" EXIT

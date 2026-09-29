#!/bin/bash
# OpenClaw - Daily Scraper Schedule
# Run via cron: 0 4 * * * /path/to/schedule-all.sh >> /path/to/logs/schedule.log 2>&1
# Each scraper runs sequentially. If one fails, retry once after 30min.
# Pi RAM is limited - never parallelize.
#
# Make executable: chmod +x schedule-all.sh

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
mkdir -p "$LOG_DIR"

log() {
  echo "[$(date -Iseconds)] $1"
}

has_isolated_egress() {
  [ "${OPENCLAW_EGRESS_PROFILE:-}" = "isolated" ]
}

run_scraper() {
  local name="$1"
  local script="$2"

  log "Starting $name..."
  if node "$SCRIPT_DIR/$script" 2>&1; then
    log "$name completed successfully"
    return 0
  else
    log "$name FAILED - retrying in 30 minutes..."
    sleep 1800
    if node "$SCRIPT_DIR/$script" 2>&1; then
      log "$name retry succeeded"
      return 0
    else
      log "$name retry FAILED - moving on"
      return 1
    fi
  fi
}

log "=== OpenClaw daily scrape started ==="

# 1. Whole Foods (both regions)
run_scraper "Whole Foods" "services/scraper-wholefoodsapfresh.mjs"

# 2. Session-derived scraping is opt-in only.
# It must never reuse a personal browser profile or ambient login state.
if [ "${OPENCLAW_ALLOW_SESSION_SCRAPERS:-0}" = "1" ] && has_isolated_egress; then
  run_scraper "Instacart Bulk" "services/scraper-instacart-bulk.mjs"
else
  log "Skipping Instacart Bulk (requires isolated egress + explicit session-scraper opt-in)"
fi

# 3. Direct website scraping never runs from an unisolated network.
if has_isolated_egress; then
  run_scraper "Walmart" "services/scraper-walmart.mjs"
else
  log "Skipping Walmart direct scrape (isolated egress required)"
fi

# 4. Target
run_scraper "Target" "services/scraper-target.mjs"

# 4b. Walmart Nationwide (52 stores, all 50 states)
if has_isolated_egress; then
  run_scraper "Walmart Nationwide" "services/scraper-walmart-nationwide.mjs"
else
  log "Skipping Walmart Nationwide (isolated egress required)"
fi

# 4c. Target Nationwide (24 stores, 24 states)
run_scraper "Target Nationwide" "services/scraper-target-nationwide.mjs"

# 5-6. Direct retailer sites require isolated egress.
if has_isolated_egress; then
  run_scraper "Hannaford" "services/scraper-hannaford.mjs"
  run_scraper "Stop & Shop / Shaw's" "services/scraper-stopsandshop.mjs"
else
  log "Skipping Hannaford + Stop & Shop direct scrapes (isolated egress required)"
fi

# 7. Flipp flyers
run_scraper "Flipp Flyers" "services/scraper-flipp.mjs"

# 8. Cross-match new items
run_scraper "Cross-Match" "services/cross-match.mjs"

# 9. Stats report
log "Running stats check..."
node "$SCRIPT_DIR/scripts/check-stats.mjs" 2>&1 || log "Stats check failed"

log "=== OpenClaw daily scrape complete ==="

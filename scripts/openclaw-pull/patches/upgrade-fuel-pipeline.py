#!/usr/bin/env python3
"""
OpenClaw fuels ChefFlow - Fuel Pipeline Upgrade

Reinforces the data flow from OpenClaw (Pi) to ChefFlow (PC) with three additions:

1. /api/health/pipeline endpoint on Pi sync-api - real-time pipeline health dashboard data
2. sync_ready auto-push from aggregator after scrape completion - tells ChefFlow new data is available
3. /api/coverage endpoint on Pi sync-api - ingredient category price coverage report
"""
import os
import sys

# --------------------------------------------------------------------------
# 1. Patch Pi sync-api: add /api/health/pipeline endpoint
# --------------------------------------------------------------------------

API = os.path.expanduser("~/openclaw-prices/services/sync-api.mjs")
if not os.path.exists(API):
    print(f"ERROR: sync-api.mjs not found at {API}")
    sys.exit(1)

c = open(API).read()
patched_api = False

# Insert /api/health/pipeline before the /api/changes endpoint
old_changes_marker = """    // Get price changes (recent"""

new_health_plus_marker = """    // Pipeline health dashboard - overall sync health at a glance
    if (path === '/api/health/pipeline') {
      const lastScrape = db.prepare(`
        SELECT MAX(completed_at) as last_scrape_at, COUNT(*) as sessions_24h
        FROM scrape_sessions
        WHERE completed_at >= datetime('now', '-24 hours')
      `).get();

      const totals = db.prepare(`
        SELECT
          (SELECT COUNT(*) FROM canonical_ingredients) as total_ingredients,
          (SELECT COUNT(*) FROM current_prices) as total_prices,
          (SELECT COUNT(*) FROM price_anomalies WHERE acknowledged = 0) as total_anomalies_unacked,
          (SELECT COUNT(DISTINCT source_id) FROM current_prices) as chains_active
      `).get();

      // Check sync log for last ChefFlow pull (if table exists)
      let lastChefflowSync = null;
      try {
        const syncRow = db.prepare(`
          SELECT MAX(synced_at) as last_sync FROM sync_log WHERE target = 'chefflow'
        `).get();
        lastChefflowSync = syncRow?.last_sync || null;
      } catch {
        // sync_log table may not exist yet
      }

      const lastScrapeAt = lastScrape?.last_scrape_at || null;
      const freshnessHours = lastScrapeAt
        ? ((Date.now() - new Date(lastScrapeAt + 'Z').getTime()) / 3600000).toFixed(1)
        : null;

      let status = 'healthy';
      if (!lastScrapeAt || parseFloat(freshnessHours) > 24) {
        status = 'stale';
      } else if (parseFloat(freshnessHours) > 12) {
        status = 'degraded';
      }

      return jsonResponse(res, {
        status,
        last_scrape_at: lastScrapeAt,
        scrape_sessions_24h: lastScrape?.sessions_24h || 0,
        total_ingredients: totals?.total_ingredients || 0,
        total_prices: totals?.total_prices || 0,
        total_anomalies_unacked: totals?.total_anomalies_unacked || 0,
        chains_active: totals?.chains_active || 0,
        last_chefflow_sync_at: lastChefflowSync,
        data_freshness_hours: freshnessHours ? parseFloat(freshnessHours) : null,
      });
    }

    // Get price changes (recent"""

if old_changes_marker in c:
    c = c.replace(old_changes_marker, new_health_plus_marker, 1)
    print("1. Added /api/health/pipeline endpoint to sync-api")
    patched_api = True
else:
    print("1. SKIP: Could not find /api/changes marker in sync-api")

# --------------------------------------------------------------------------
# 3. Patch Pi sync-api: add /api/coverage endpoint
#    (numbered 3 to match spec; done here since we already have the file open)
# --------------------------------------------------------------------------

# Insert /api/coverage before the /api/health/pipeline block we just added
# (or before /api/changes if health wasn't added)
old_health_marker = """    // Pipeline health dashboard"""

new_coverage_plus_health = """    // Data coverage report - which categories have good price data
    if (path === '/api/coverage') {
      // Category mapping: map category tags to human-readable names
      const categories = db.prepare(`
        SELECT
          COALESCE(ci.category, 'uncategorized') as name,
          COUNT(DISTINCT ci.ingredient_id) as ingredients,
          COUNT(DISTINCT CASE WHEN cp.canonical_ingredient_id IS NOT NULL THEN ci.ingredient_id END) as with_prices
        FROM canonical_ingredients ci
        LEFT JOIN current_prices cp ON ci.ingredient_id = cp.canonical_ingredient_id
        GROUP BY COALESCE(ci.category, 'uncategorized')
        ORDER BY COUNT(DISTINCT ci.ingredient_id) DESC
      `).all();

      const totalIngredients = categories.reduce((s, r) => s + r.ingredients, 0);
      const totalWithPrices = categories.reduce((s, r) => s + r.with_prices, 0);
      const overallPct = totalIngredients > 0
        ? Math.round((totalWithPrices / totalIngredients) * 100)
        : 0;

      const chainsReporting = db.prepare(`
        SELECT COUNT(DISTINCT source_id) as cnt FROM current_prices
      `).get();

      return jsonResponse(res, {
        categories: categories.map(r => ({
          name: r.name,
          ingredients: r.ingredients,
          with_prices: r.with_prices,
          coverage_pct: r.ingredients > 0 ? Math.round((r.with_prices / r.ingredients) * 100) : 0,
        })),
        overall_coverage_pct: overallPct,
        chains_reporting: chainsReporting?.cnt || 0,
        last_updated: new Date().toISOString(),
      });
    }

    // Pipeline health dashboard"""

if old_health_marker in c:
    c = c.replace(old_health_marker, new_coverage_plus_health, 1)
    print("3. Added /api/coverage endpoint to sync-api")
    patched_api = True
else:
    print("3. SKIP: Could not find health pipeline marker (may need manual placement)")

if patched_api:
    open(API, "w").write(c)
    print("   -> sync-api.mjs written")

# --------------------------------------------------------------------------
# 2. Patch Pi aggregator: push sync_ready event after scrape aggregation
# --------------------------------------------------------------------------

AGG = os.path.expanduser("~/openclaw-prices/services/aggregator.mjs")
if not os.path.exists(AGG):
    print(f"ERROR: aggregator.mjs not found at {AGG}")
    sys.exit(1)

a = open(AGG).read()
patched_agg = False

# Find the end of the main aggregation function where it logs completion.
# The pushAnomalies call was added by upgrade-aggregator-push.py.
# We insert the sync_ready push after anomaly pushing (or after the main log line).
old_push_complete = """  console.log('  Push complete');
}"""

new_push_complete = """  console.log('  Push complete');
}

/**
 * After aggregation completes, notify ChefFlow that new data is ready for sync.
 * Sends a summary of what changed so ChefFlow can decide whether to pull.
 */
function pushSyncReady(db) {
  const CHEFFLOW_URL = process.env.CHEFFLOW_URL || 'http://10.0.0.153:3000';
  const WEBHOOK_SECRET = process.env.OPENCLAW_WEBHOOK_SECRET || 'openclaw-internal-2026';

  // Count what changed in the last aggregation window (1 hour)
  const newPrices = db.prepare(`
    SELECT COUNT(*) as cnt FROM current_prices
    WHERE first_seen_at >= datetime('now', '-1 hour')
  `).get();

  const priceChanges = db.prepare(`
    SELECT COUNT(*) as cnt FROM price_changes
    WHERE observed_at >= datetime('now', '-1 hour')
  `).get();

  const newAnomalies = db.prepare(`
    SELECT COUNT(*) as cnt FROM price_anomalies
    WHERE detected_at >= datetime('now', '-1 hour') AND acknowledged = 0
  `).get();

  const chainsUpdated = db.prepare(`
    SELECT DISTINCT sr.name FROM current_prices cp
    JOIN source_registry sr ON cp.source_id = sr.source_id
    WHERE cp.last_seen_at >= datetime('now', '-1 hour')
    ORDER BY sr.name
  `).all().map(r => r.name);

  const summary = {
    new_prices: newPrices?.cnt || 0,
    price_changes: priceChanges?.cnt || 0,
    new_anomalies: newAnomalies?.cnt || 0,
    chains_updated: chainsUpdated,
    suggested_action: (priceChanges?.cnt || 0) > 0 ? 'delta_sync' : 'skip',
  };

  // Only push if there is something worth syncing
  if (summary.new_prices === 0 && summary.price_changes === 0 && summary.new_anomalies === 0) {
    console.log('  No changes to report to ChefFlow, skipping sync_ready push');
    return;
  }

  console.log('  Pushing sync_ready to ChefFlow: ' + summary.new_prices + ' new, ' +
    summary.price_changes + ' changes, ' + summary.new_anomalies + ' anomalies');

  try {
    const { execSync } = require('child_process');
    const payload = JSON.stringify({ type: 'sync_ready', data: summary });
    execSync(
      'curl -s -X POST ' + CHEFFLOW_URL + '/api/openclaw/webhook ' +
      '-H "Content-Type: application/json" ' +
      '-H "Authorization: Bearer ' + WEBHOOK_SECRET + '" ' +
      "-d '" + payload.replace(/'/g, "'\\''") + "' > /dev/null 2>&1",
      { timeout: 10000 }
    );
    console.log('  sync_ready push complete');
  } catch {
    console.log('  sync_ready push failed (ChefFlow may be offline, non-blocking)');
  }
}"""

if old_push_complete in a:
    a = a.replace(old_push_complete, new_push_complete, 1)
    print("2. Added pushSyncReady() function to aggregator")
    patched_agg = True
else:
    print("2. SKIP: Could not find pushAnomalies end marker in aggregator")

# Now wire pushSyncReady into the aggregation completion flow
# Look for the aggregation complete log line
old_agg_done = """  console.log('Aggregation complete');"""

new_agg_done = """  console.log('Aggregation complete');

  // Notify ChefFlow that fresh data is available
  pushSyncReady(db);"""

if old_agg_done in a:
    a = a.replace(old_agg_done, new_agg_done, 1)
    print("   -> Wired pushSyncReady() call after aggregation complete")
else:
    print("   -> SKIP: Could not find 'Aggregation complete' log line, wire manually")

if patched_agg:
    open(AGG, "w").write(a)
    print("   -> aggregator.mjs written")

print("\nFuel pipeline upgrade complete!")
print("  - Pi sync-api: /api/health/pipeline, /api/coverage")
print("  - Pi aggregator: pushSyncReady() after every aggregation")
print("  - ChefFlow webhook: update route.ts separately (see companion edit)")

#!/usr/bin/env python3
"""
Add incremental sync support to Pi's sync API:
1. Add 'since' parameter to /api/changes
2. Add /api/sync/delta endpoint for incremental pulls
"""
import os

API = os.path.expanduser("~/openclaw-prices/services/sync-api.mjs")
c = open(API).read()

# 1. Add 'since' parameter to /api/changes
old_changes = """    // Get price changes (recent)
    if (path === '/api/changes') {
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const rows = db.prepare(`
        SELECT pc.*, ci.name as ingredient_name, sr.name as source_name
        FROM price_changes pc
        JOIN canonical_ingredients ci ON pc.canonical_ingredient_id = ci.ingredient_id
        JOIN source_registry sr ON pc.source_id = sr.source_id
        ORDER BY pc.observed_at DESC
        LIMIT ?
      `).all(limit);
      return jsonResponse(res, { count: rows.length, changes: rows });
    }"""

new_changes = """    // Get price changes (recent, with optional 'since' filter)
    if (path === '/api/changes') {
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const since = url.searchParams.get('since'); // ISO timestamp
      let rows;
      if (since) {
        rows = db.prepare(`
          SELECT pc.*, ci.name as ingredient_name, sr.name as source_name
          FROM price_changes pc
          JOIN canonical_ingredients ci ON pc.canonical_ingredient_id = ci.ingredient_id
          JOIN source_registry sr ON pc.source_id = sr.source_id
          WHERE pc.observed_at > ?
          ORDER BY pc.observed_at DESC
          LIMIT ?
        `).all(since, limit);
      } else {
        rows = db.prepare(`
          SELECT pc.*, ci.name as ingredient_name, sr.name as source_name
          FROM price_changes pc
          JOIN canonical_ingredients ci ON pc.canonical_ingredient_id = ci.ingredient_id
          JOIN source_registry sr ON pc.source_id = sr.source_id
          ORDER BY pc.observed_at DESC
          LIMIT ?
        `).all(limit);
      }
      return jsonResponse(res, { count: rows.length, since: since || null, changes: rows });
    }"""

if old_changes in c:
    c = c.replace(old_changes, new_changes)
    print("1. Added 'since' parameter to /api/changes")
else:
    print("1. SKIP: /api/changes not found")

# 2. Add /api/sync/delta endpoint (incremental data export)
# Insert before the smart lookup endpoint
old_lookup = """    // Smart lookup - find an ingredient with price priority"""

new_delta_plus_lookup = """    // Incremental sync: export changes since a timestamp
    // Returns changed prices, new ingredients, and anomalies since 'since' param
    if (path === '/api/sync/delta') {
      const since = url.searchParams.get('since');
      if (!since) return jsonResponse(res, { error: 'Missing ?since= (ISO timestamp)' }, 400);

      // Changed prices since timestamp
      const priceChanges = db.prepare(`
        SELECT pc.canonical_ingredient_id, pc.source_id, pc.new_price_cents,
               pc.price_unit, pc.pricing_tier, pc.change_pct, pc.observed_at,
               ci.name as ingredient_name, sr.name as source_name
        FROM price_changes pc
        JOIN canonical_ingredients ci ON pc.canonical_ingredient_id = ci.ingredient_id
        JOIN source_registry sr ON pc.source_id = sr.source_id
        WHERE pc.observed_at > ?
        ORDER BY pc.observed_at DESC
        LIMIT 5000
      `).all(since);

      // New current_prices updated since timestamp
      const updatedPrices = db.prepare(`
        SELECT cp.*, ci.name as ingredient_name
        FROM current_prices cp
        JOIN canonical_ingredients ci ON cp.canonical_ingredient_id = ci.ingredient_id
        WHERE cp.last_seen_at > ?
        LIMIT 10000
      `).all(since);

      // New anomalies since timestamp
      const newAnomalies = db.prepare(`
        SELECT pa.*, ci.name as ingredient_name
        FROM price_anomalies pa
        JOIN canonical_ingredients ci ON pa.canonical_ingredient_id = ci.ingredient_id
        WHERE pa.detected_at > ? AND pa.acknowledged = 0
        ORDER BY pa.detected_at DESC
        LIMIT 500
      `).all(since);

      return jsonResponse(res, {
        since,
        server_time: new Date().toISOString(),
        price_changes: { count: priceChanges.length, data: priceChanges },
        updated_prices: { count: updatedPrices.length, data: updatedPrices },
        new_anomalies: { count: newAnomalies.length, data: newAnomalies },
      });
    }

    // Smart lookup - find an ingredient with price priority"""

if old_lookup in c:
    c = c.replace(old_lookup, new_delta_plus_lookup)
    print("2. Added /api/sync/delta endpoint")
else:
    print("2. SKIP: Lookup marker not found")

open(API, "w").write(c)
print("\nSync API upgrade complete!")

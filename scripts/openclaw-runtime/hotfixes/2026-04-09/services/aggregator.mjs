/**
 * OpenClaw - Aggregator Service
 * Runs periodically to:
 *   1. Age old data (compress price_changes older than 90 days into monthly summaries)
 *   2. Compute price trends (7d, 30d, 90d)
 *   3. Generate price intelligence reports
 *   4. Flag anomalies (sudden price spikes/drops)
 *   5. Clean stale prices (mark sources with no update in 30+ days)
 */

import { existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../lib/db.mjs';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isBusyError(err) {
  return err?.code === 'SQLITE_BUSY' || /database is locked/i.test(err?.message || '');
}

async function runWithBusyRetries(label, fn, attempts = 3) {
  let lastErr;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isBusyError(err) || attempt === attempts) {
        throw err;
      }

      const delayMs = attempt * 30000;
      console.warn(`${label}: database is locked; retrying in ${delayMs / 1000}s (${attempt}/${attempts - 1})`);
      await sleep(delayMs);
    }
  }

  throw lastErr;
}

function ensureDeleteOverrideTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS archived_deletions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      archived_at TEXT NOT NULL DEFAULT (datetime('now')),
      table_name TEXT NOT NULL,
      row_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_archived_deletions_table ON archived_deletions(table_name);
    CREATE INDEX IF NOT EXISTS idx_archived_deletions_ts ON archived_deletions(archived_at);

    CREATE TABLE IF NOT EXISTS _maintenance_override (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      allow_delete INTEGER NOT NULL DEFAULT 0,
      reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );
  `);
}

function withDeleteOverride(db, reason, fn) {
  ensureDeleteOverrideTables(db);

  const cleanupStmt = db.prepare(`
    DELETE FROM _maintenance_override
    WHERE expires_at <= datetime('now') OR reason = ?
  `);
  const overrideStmt = db.prepare(`
    INSERT INTO _maintenance_override (allow_delete, reason, expires_at)
    VALUES (1, ?, datetime('now', '+10 minutes'))
  `);

  cleanupStmt.run(reason);
  overrideStmt.run(reason);

  try {
    return fn();
  } finally {
    cleanupStmt.run(reason);
  }
}

function ensureLearnedPatternsSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS learned_patterns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern_type TEXT NOT NULL,
      ingredient_category TEXT,
      pattern_data TEXT NOT NULL DEFAULT '{}',
      observations INTEGER DEFAULT 1,
      last_updated TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const cols = new Set(
    db.prepare("PRAGMA table_info(learned_patterns)").all().map((col) => col.name)
  );

  if (!cols.has('pattern_type') || !cols.has('ingredient_category')) {
    console.warn('  learned_patterns schema is missing required columns; skipping unique-index repair');
    return;
  }

  const deduped = db.prepare(`
    DELETE FROM learned_patterns
    WHERE id NOT IN (
      SELECT MAX(id)
      FROM learned_patterns
      GROUP BY pattern_type, ingredient_category
    )
  `).run();

  if (deduped.changes > 0) {
    console.log(`  Deduped ${deduped.changes} learned pattern rows`);
  }

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_learned_patterns_type_cat
    ON learned_patterns(pattern_type, ingredient_category)
  `);
}

/**
 * Add aggregation tables if they don't exist.
 */
function ensureAggTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS price_monthly_summary (
      id TEXT PRIMARY KEY,
      canonical_ingredient_id TEXT NOT NULL,
      source_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      avg_price_cents INTEGER,
      min_price_cents INTEGER,
      max_price_cents INTEGER,
      sample_count INTEGER,
      pricing_tier TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(canonical_ingredient_id, source_id, year, month)
    );

    CREATE TABLE IF NOT EXISTS price_trends (
      id TEXT PRIMARY KEY,
      canonical_ingredient_id TEXT NOT NULL,
      pricing_tier TEXT NOT NULL,
      avg_7d_cents INTEGER,
      avg_30d_cents INTEGER,
      avg_90d_cents INTEGER,
      min_current_cents INTEGER,
      max_current_cents INTEGER,
      cheapest_source_id TEXT,
      most_expensive_source_id TEXT,
      change_7d_pct REAL,
      change_30d_pct REAL,
      change_90d_pct REAL,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(canonical_ingredient_id, pricing_tier)
    );

    CREATE TABLE IF NOT EXISTS price_anomalies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      canonical_ingredient_id TEXT NOT NULL,
      source_id TEXT NOT NULL,
      anomaly_type TEXT NOT NULL,
      old_price_cents INTEGER,
      new_price_cents INTEGER,
      change_pct REAL,
      detected_at TEXT DEFAULT (datetime('now')),
      acknowledged INTEGER DEFAULT 0
    );
  `);

  try {
    ensureLearnedPatternsSchema(db);
  } catch (err) {
    console.warn(`  learned_patterns schema repair skipped: ${err.message}`);
  }
}

/**
 * Compress old price_changes into monthly summaries.
 * Keeps individual changes for the last 90 days, summarizes the rest.
 */
function ageOldData(db) {
  console.log('\n--- Aging old price data ---');

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);
  const cutoff = cutoffDate.toISOString();

  // Get data to summarize
  const oldChanges = db.prepare(`
    SELECT canonical_ingredient_id, source_id, pricing_tier,
           strftime('%Y', observed_at) as year,
           strftime('%m', observed_at) as month,
           AVG(new_price_cents) as avg_cents,
           MIN(new_price_cents) as min_cents,
           MAX(new_price_cents) as max_cents,
           COUNT(*) as sample_count
    FROM price_changes
    WHERE observed_at < ?
    GROUP BY canonical_ingredient_id, source_id, strftime('%Y-%m', observed_at)
  `).all(cutoff);

  let summarized = 0;
  for (const row of oldChanges) {
    const id = `${row.canonical_ingredient_id}:${row.source_id}:${row.year}-${row.month}`;
    db.prepare(`
      INSERT OR REPLACE INTO price_monthly_summary (id, canonical_ingredient_id, source_id, year, month, avg_price_cents, min_price_cents, max_price_cents, sample_count, pricing_tier)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, row.canonical_ingredient_id, row.source_id, parseInt(row.year), parseInt(row.month),
      Math.round(row.avg_cents), row.min_cents, row.max_cents, row.sample_count, row.pricing_tier);
    summarized++;
  }

  // Delete the old individual records (now summarized)
  const deleted = oldChanges.length === 0
    ? { changes: 0 }
    : withDeleteOverride(db, 'aggregator ageOldData price_changes cleanup', () =>
        db.prepare('DELETE FROM price_changes WHERE observed_at < ?').run(cutoff)
      );

  console.log(`  Summarized ${summarized} monthly groups, deleted ${deleted.changes} old change records`);
}

/**
 * Compute price trends for each ingredient+tier combination.
 */
function computeTrends(db) {
  console.log('\n--- Computing price trends ---');

  const now = new Date();
  const d7 = new Date(now - 7 * 86400000).toISOString();
  const d30 = new Date(now - 30 * 86400000).toISOString();
  const d90 = new Date(now - 90 * 86400000).toISOString();

  // Get all unique ingredient+tier combos from current prices
  const combos = db.prepare(`
    SELECT DISTINCT canonical_ingredient_id, pricing_tier
    FROM current_prices
  `).all();

  let updated = 0;

  for (const combo of combos) {
    const { canonical_ingredient_id: ingId, pricing_tier: tier } = combo;

    // Current prices for this ingredient+tier
    const current = db.prepare(`
      SELECT price_cents, source_id FROM current_prices
      WHERE canonical_ingredient_id = ? AND pricing_tier = ?
      ORDER BY price_cents ASC
    `).all(ingId, tier);

    if (current.length === 0) continue;

    const minCurrent = current[0].price_cents;
    const maxCurrent = current[current.length - 1].price_cents;
    const cheapestSource = current[0].source_id;
    const mostExpensiveSource = current[current.length - 1].source_id;

    // Average from price_changes over different windows
    const avg7d = db.prepare(`
      SELECT AVG(new_price_cents) as avg FROM price_changes
      WHERE canonical_ingredient_id = ? AND pricing_tier = ? AND observed_at >= ?
    `).get(ingId, tier, d7)?.avg;

    const avg30d = db.prepare(`
      SELECT AVG(new_price_cents) as avg FROM price_changes
      WHERE canonical_ingredient_id = ? AND pricing_tier = ? AND observed_at >= ?
    `).get(ingId, tier, d30)?.avg;

    const avg90d = db.prepare(`
      SELECT AVG(new_price_cents) as avg FROM price_changes
      WHERE canonical_ingredient_id = ? AND pricing_tier = ? AND observed_at >= ?
    `).get(ingId, tier, d90)?.avg;

    // Current average
    const currentAvg = current.reduce((s, r) => s + r.price_cents, 0) / current.length;

    // Percentage changes
    const change7d = avg7d ? ((currentAvg - avg7d) / avg7d * 100) : null;
    const change30d = avg30d ? ((currentAvg - avg30d) / avg30d * 100) : null;
    const change90d = avg90d ? ((currentAvg - avg90d) / avg90d * 100) : null;

    const id = `${ingId}:${tier}`;
    db.prepare(`
      INSERT OR REPLACE INTO price_trends (id, canonical_ingredient_id, pricing_tier,
        avg_7d_cents, avg_30d_cents, avg_90d_cents, min_current_cents, max_current_cents,
        cheapest_source_id, most_expensive_source_id, change_7d_pct, change_30d_pct, change_90d_pct, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(id, ingId, tier,
      avg7d ? Math.round(avg7d) : null,
      avg30d ? Math.round(avg30d) : null,
      avg90d ? Math.round(avg90d) : null,
      minCurrent, maxCurrent, cheapestSource, mostExpensiveSource,
      change7d ? Math.round(change7d * 10) / 10 : null,
      change30d ? Math.round(change30d * 10) / 10 : null,
      change90d ? Math.round(change90d * 10) / 10 : null
    );
    updated++;
  }

  console.log(`  Updated trends for ${updated} ingredient/tier combinations`);
}


/**
 * Auto-triage old/resolved anomalies to keep the backlog manageable.
 */
function triageAnomalies(db) {
  console.log("\n--- Auto-triaging anomalies ---");
  // Rule 1: Stale anomalies (older than 14 days)
  const stale = db.prepare(`
    UPDATE price_anomalies SET acknowledged = 1
    WHERE acknowledged = 0
      AND detected_at < datetime('now', '-14 days')
  `).run();
  console.log(`  Stale (>14 days): ${stale.changes} auto-acknowledged`);

  // Rule 2: Resolved anomalies (current price back within 10% of old price)
  const resolved = db.prepare(`
    UPDATE price_anomalies SET acknowledged = 1
    WHERE acknowledged = 0
      AND id IN (
        SELECT pa.id FROM price_anomalies pa
        JOIN current_prices cp ON pa.canonical_ingredient_id = cp.canonical_ingredient_id
          AND pa.source_id = cp.source_id
        WHERE pa.acknowledged = 0
          AND ABS(cp.price_cents - pa.old_price_cents) * 100.0 / pa.old_price_cents < 10
      )
  `).run();
  console.log(`  Resolved (<10% from original): ${resolved.changes} auto-acknowledged`);

  // Rule 3: Non-food sources
  const nonFood = db.prepare(`
    UPDATE price_anomalies SET acknowledged = 1
    WHERE acknowledged = 0
      AND (source_id LIKE 'ic-cvs%' OR source_id LIKE 'cvs-%'
        OR source_id LIKE 'ic-seven-eleven%' OR source_id LIKE 'ic-711%'
        OR source_id LIKE 'walgreens%')
  `).run();
  console.log(`  Non-food sources: ${nonFood.changes} auto-acknowledged`);

  const remaining = db.prepare('SELECT COUNT(*) as c FROM price_anomalies WHERE acknowledged = 0').get();
  console.log(`  Remaining unacknowledged: ${remaining.c}`);
}

/**
 * Detect price anomalies (sudden spikes or drops > 25%).
 */
function detectAnomalies(db) {
  console.log('\n--- Detecting price anomalies ---');

  const recentChanges = db.prepare(`
    SELECT pc.*, cp.price_cents as current_price
    FROM price_changes pc
    JOIN current_prices cp ON pc.canonical_ingredient_id = cp.canonical_ingredient_id
      AND pc.source_id = cp.source_id
    WHERE pc.observed_at >= datetime('now', '-1 day')
      AND pc.old_price_cents IS NOT NULL
      AND pc.old_price_cents > 0
  `).all();

  let anomalyCount = 0;
  for (const change of recentChanges) {
    const pctChange = ((change.new_price_cents - change.old_price_cents) / change.old_price_cents) * 100;

    if (Math.abs(pctChange) >= 25) {
      const type = pctChange > 0 ? 'price_spike' : 'price_drop';
      db.prepare(`
        INSERT INTO price_anomalies (canonical_ingredient_id, source_id, anomaly_type, old_price_cents, new_price_cents, change_pct)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(change.canonical_ingredient_id, change.source_id, type,
        change.old_price_cents, change.new_price_cents, Math.round(pctChange * 10) / 10);
      anomalyCount++;
    }
  }

  console.log(`  Found ${anomalyCount} anomalies`);

  // Update learned patterns from historical anomalies
  try {
    updateLearnedPatterns(db);
  } catch (err) {
    console.warn(`  Learned pattern update skipped: ${err.message}`);
  }

  // Push significant anomalies to ChefFlow in real-time
  if (anomalyCount > 0) {
    pushAnomalies(db, anomalyCount);
  }
}

/**
 * Push recent unacknowledged anomalies to ChefFlow's webhook endpoint.
 * Only sends anomalies with >= 40% price change (significant ones).
 */

/**
 * Update learned_patterns from recent anomaly history.
 * Groups anomalies by ingredient category and pattern type,
 * computes average swing percentage and seasonal distribution,
 * and stores as JSON so future detection can suppress known patterns.
 */
function updateLearnedPatterns(db) {
  console.log('  Updating learned anomaly patterns...');

  // Learn price swing patterns per category from the last 90 days
  const swingPatterns = db.prepare(`
    SELECT
      ci.category as ingredient_category,
      COUNT(*) as observation_count,
      ROUND(AVG(ABS(pa.change_pct)), 2) as avg_swing_pct,
      ROUND(MIN(ABS(pa.change_pct)), 2) as min_swing_pct,
      ROUND(MAX(ABS(pa.change_pct)), 2) as max_swing_pct,
      GROUP_CONCAT(DISTINCT strftime('%m', pa.detected_at)) as active_months
    FROM price_anomalies pa
    JOIN canonical_ingredients ci ON pa.canonical_ingredient_id = ci.ingredient_id
    WHERE pa.detected_at >= datetime('now', '-90 days')
      AND ci.category IS NOT NULL
    GROUP BY ci.category
    HAVING COUNT(*) >= 3
  `).all();

  const upsert = db.prepare(`
    INSERT INTO learned_patterns (pattern_type, ingredient_category, pattern_data, observations, last_updated)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(pattern_type, ingredient_category) DO UPDATE SET
      pattern_data = excluded.pattern_data,
      observations = excluded.observations,
      last_updated = datetime('now')
  `);

  let updated = 0;
  for (const row of swingPatterns) {
    const patternData = JSON.stringify({
      avg_swing_pct: row.avg_swing_pct,
      min_swing_pct: row.min_swing_pct,
      max_swing_pct: row.max_swing_pct,
      active_months: row.active_months ? row.active_months.split(',') : [],
      typical_range: [row.min_swing_pct, row.max_swing_pct],
    });
    upsert.run('price_swing', row.ingredient_category, patternData, row.observation_count);
    updated++;
  }

  // Learn seasonal patterns: categories that consistently spike in specific months
  const seasonalPatterns = db.prepare(`
    SELECT
      ci.category as ingredient_category,
      strftime('%m', pa.detected_at) as month,
      COUNT(*) as spikes,
      ROUND(AVG(pa.change_pct), 2) as avg_change
    FROM price_anomalies pa
    JOIN canonical_ingredients ci ON pa.canonical_ingredient_id = ci.ingredient_id
    WHERE pa.detected_at >= datetime('now', '-365 days')
      AND ci.category IS NOT NULL
    GROUP BY ci.category, month
    HAVING COUNT(*) >= 2
    ORDER BY ci.category, month
  `).all();

  // Group by category
  const byCat = {};
  for (const row of seasonalPatterns) {
    if (!byCat[row.ingredient_category]) byCat[row.ingredient_category] = [];
    byCat[row.ingredient_category].push({
      month: row.month,
      spikes: row.spikes,
      avg_change: row.avg_change,
    });
  }

  for (const [cat, months] of Object.entries(byCat)) {
    const patternData = JSON.stringify({
      seasonal_months: months,
      peak_month: months.reduce((a, b) => b.spikes > a.spikes ? b : a).month,
    });
    const totalObs = months.reduce((s, m) => s + m.spikes, 0);
    upsert.run('seasonal', cat, patternData, totalObs);
    updated++;
  }

  console.log('  Updated ' + updated + ' learned patterns');
}

/**
 * Check if an anomaly matches a known learned pattern.
 * Returns true if the anomaly is within the expected range for this
 * category/season, meaning it should be suppressed (not alerted).
 */
function isKnownPattern(db, ingredientCategory, changePct) {
  if (!ingredientCategory) return false;

  // Check price swing patterns
  const swing = db.prepare(`
    SELECT pattern_data, observations FROM learned_patterns
    WHERE pattern_type = 'price_swing' AND ingredient_category = ?
  `).get(ingredientCategory);

  if (swing && swing.observations >= 5) {
    const data = JSON.parse(swing.pattern_data);
    const absChange = Math.abs(changePct);
    // If this swing is within the learned typical range, suppress it
    if (absChange <= data.max_swing_pct * 1.1) {
      return true;
    }
  }

  // Check seasonal patterns for current month
  const currentMonth = new Date().toISOString().slice(5, 7);
  const seasonal = db.prepare(`
    SELECT pattern_data, observations FROM learned_patterns
    WHERE pattern_type = 'seasonal' AND ingredient_category = ?
  `).get(ingredientCategory);

  if (seasonal && seasonal.observations >= 3) {
    const data = JSON.parse(seasonal.pattern_data);
    const monthMatch = data.seasonal_months.find(m => m.month === currentMonth);
    if (monthMatch && Math.abs(changePct) <= Math.abs(monthMatch.avg_change) * 1.2) {
      return true;
    }
  }

  return false;
}

function pushAnomalies(db, count) {
  const CHEFFLOW_URL = process.env.CHEFFLOW_URL || 'http://10.0.0.153:3000';
  const WEBHOOK_SECRET = process.env.OPENCLAW_WEBHOOK_SECRET || 'openclaw-internal-2026';

  const significant = db.prepare(`
    SELECT pa.*, ci.name as ingredient_name, sr.name as source_name
    FROM price_anomalies pa
    JOIN canonical_ingredients ci ON pa.canonical_ingredient_id = ci.ingredient_id
    JOIN source_registry sr ON pa.source_id = sr.source_id
    WHERE pa.acknowledged = 0
      AND pa.detected_at >= datetime('now', '-1 hour')
      AND ABS(pa.change_pct) >= 40
    ORDER BY ABS(pa.change_pct) DESC
    LIMIT 10
  `).all();

  if (significant.length === 0) {
    console.log('  No significant anomalies to push (>40% change)');
    return;
  }

  console.log('  Pushing ' + significant.length + ' significant anomalies to ChefFlow...');

  for (const anomaly of significant) {
    try {
      // Use synchronous fetch via child_process (Node 22 has fetch but aggregator is sync-heavy)
      const { execSync } = require('child_process');
      const payload = JSON.stringify({
        type: 'price_anomaly',
        data: {
          ingredient_name: anomaly.ingredient_name,
          source_name: anomaly.source_name,
          old_price_cents: anomaly.old_price_cents,
          new_price_cents: anomaly.new_price_cents,
          change_pct: anomaly.change_pct,
          anomaly_type: anomaly.anomaly_type,
          detected_at: anomaly.detected_at,
        }
      });
      execSync(
        'curl -s -X POST ' + CHEFFLOW_URL + '/api/openclaw/webhook ' +
        '-H "Content-Type: application/json" ' +
        '-H "Authorization: Bearer ' + WEBHOOK_SECRET + '" ' +
        "-d '" + payload.replace(/'/g, "'\''") + "' > /dev/null 2>&1",
        { timeout: 5000 }
      );
    } catch {
      // Non-blocking: if ChefFlow is down, just skip
    }
  }
  console.log('  Push complete');
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
      "-d '" + payload.replace(/'/g, "'\''") + "' > /dev/null 2>&1",
      { timeout: 10000 }
    );
    console.log('  sync_ready push complete');
  } catch {
    console.log('  sync_ready push failed (ChefFlow may be offline, non-blocking)');
  }
}

/**
 * Mark stale sources (no update in 30+ days).
 */
function flagStaleSources(db) {
  console.log('\n--- Checking for stale sources ---');

  const stale = db.prepare(`
    UPDATE source_registry SET status = 'stale'
    WHERE last_scraped_at < datetime('now', '-30 days')
      AND status = 'active'
  `).run();

  if (stale.changes > 0) {
    console.log(`  Marked ${stale.changes} sources as stale`);
  } else {
    console.log('  All sources are fresh');
  }
}

/**
 * Print a summary report.
 */
function printReport(db) {
  console.log('\n=== OpenClaw Price Intelligence Report ===');

  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM source_registry WHERE status = 'active') as active_sources,
      (SELECT COUNT(*) FROM source_registry WHERE status = 'stale') as stale_sources,
      (SELECT COUNT(*) FROM canonical_ingredients) as ingredients,
      (SELECT COUNT(*) FROM current_prices) as current_prices,
      (SELECT COUNT(*) FROM price_changes) as recent_changes,
      (SELECT COUNT(*) FROM price_monthly_summary) as monthly_summaries,
      (SELECT COUNT(*) FROM price_trends) as trends,
      (SELECT COUNT(*) FROM price_anomalies WHERE acknowledged = 0) as unack_anomalies
  `).get();

  console.log(`  Active sources: ${stats.active_sources}`);
  console.log(`  Stale sources: ${stats.stale_sources}`);
  console.log(`  Canonical ingredients: ${stats.ingredients}`);
  console.log(`  Current prices: ${stats.current_prices}`);
  console.log(`  Recent changes: ${stats.recent_changes}`);
  console.log(`  Monthly summaries: ${stats.monthly_summaries}`);
  console.log(`  Trend records: ${stats.trends}`);
  console.log(`  Unacknowledged anomalies: ${stats.unack_anomalies}`);

  // Top price drops (good deals)
  const topDrops = db.prepare(`
    SELECT pt.canonical_ingredient_id, ci.name, pt.change_7d_pct, pt.min_current_cents, pt.cheapest_source_id
    FROM price_trends pt
    JOIN canonical_ingredients ci ON pt.canonical_ingredient_id = ci.ingredient_id
    WHERE pt.change_7d_pct IS NOT NULL AND pt.change_7d_pct < -5
    ORDER BY pt.change_7d_pct ASC LIMIT 5
  `).all();

  if (topDrops.length > 0) {
    console.log('\n  Top price drops (7d):');
    for (const d of topDrops) {
      console.log(`    ${d.name}: ${d.change_7d_pct}% ($${(d.min_current_cents / 100).toFixed(2)} at ${d.cheapest_source_id})`);
    }
  }

  // Top price spikes (watch out)
  const topSpikes = db.prepare(`
    SELECT pt.canonical_ingredient_id, ci.name, pt.change_7d_pct, pt.max_current_cents
    FROM price_trends pt
    JOIN canonical_ingredients ci ON pt.canonical_ingredient_id = ci.ingredient_id
    WHERE pt.change_7d_pct IS NOT NULL AND pt.change_7d_pct > 10
    ORDER BY pt.change_7d_pct DESC LIMIT 5
  `).all();

  if (topSpikes.length > 0) {
    console.log('\n  Top price spikes (7d):');
    for (const s of topSpikes) {
      console.log(`    ${s.name}: +${s.change_7d_pct}%`);
    }
  }

  // Database size
  try {
    const dbPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'prices.db');
    if (existsSync(dbPath)) {
      const dbSize = statSync(dbPath).size;
      console.log(`\n  Database size: ${(dbSize / 1024 / 1024).toFixed(2)} MB`);
    }
  } catch {
    // Skip
  }
}

async function runAggregator() {
  console.log('=== OpenClaw Aggregator ===');
  console.log(`Time: ${new Date().toISOString()}`);

  const db = getDb();
  ensureAggTables(db);

  // Run all aggregation steps
  ageOldData(db);
  computeTrends(db);
  triageAnomalies(db);
  detectAnomalies(db);
  flagStaleSources(db);
  printReport(db);

  // Notify ChefFlow that fresh data is available for sync
  pushSyncReady(db);

  // Update learned anomaly patterns
  if (typeof updateLearnedPatterns === 'function') {
    try { updateLearnedPatterns(db); } catch(e) { console.log('  Learned patterns update skipped:', e.message); }
  }

  console.log('\n=== Aggregator Done ===');
}

async function main() {
  await runWithBusyRetries('Aggregator', () => runAggregator());
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });

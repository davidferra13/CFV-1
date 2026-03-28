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
  const deleted = db.prepare('DELETE FROM price_changes WHERE observed_at < ?').run(cutoff);

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

async function main() {
  console.log('=== OpenClaw Aggregator ===');
  console.log(`Time: ${new Date().toISOString()}`);

  const db = getDb();
  ensureAggTables(db);

  // Run all aggregation steps
  ageOldData(db);
  computeTrends(db);
  detectAnomalies(db);
  flagStaleSources(db);
  printReport(db);

  console.log('\n=== Aggregator Done ===');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });

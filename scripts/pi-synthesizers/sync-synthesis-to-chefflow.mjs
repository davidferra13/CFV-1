#!/usr/bin/env node
/**
 * Sync Synthesis to ChefFlow
 * Exposes synthesis tables via HTTP API for ChefFlow to pull.
 * Called by ChefFlow's extended sync at 11:30pm nightly.
 *
 * This script outputs JSON to stdout for piping, or can be called
 * as an API endpoint by the existing Pi HTTP server.
 *
 * Usage:
 *   node sync-synthesis-to-chefflow.mjs [table]
 *   node sync-synthesis-to-chefflow.mjs anomaly_alerts
 *   node sync-synthesis-to-chefflow.mjs all
 *
 * Schedule: Called by ChefFlow pull, not standalone cron
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'prices.db');

const TABLES = {
  anomaly_alerts: {
    query: `
      SELECT * FROM synthesis_anomaly_alerts
      WHERE synced_to_chefflow = 0 AND is_food = 1 AND severity >= 3
      ORDER BY severity DESC, created_at DESC
      LIMIT 500
    `,
    markSynced: `
      UPDATE synthesis_anomaly_alerts SET synced_to_chefflow = 1
      WHERE id IN (SELECT id FROM synthesis_anomaly_alerts WHERE synced_to_chefflow = 0 AND is_food = 1 AND severity >= 3 LIMIT 500)
    `,
  },
  seasonal_scores: {
    query: `
      SELECT ingredient_name, month, availability_score, price_percentile,
             value_score, status, region, updated_at
      FROM synthesis_seasonal_scores
      WHERE updated_at > datetime('now', '-2 days')
      ORDER BY value_score DESC
    `,
  },
  store_rankings: {
    query: `
      SELECT ingredient_name, store_name, chain_slug, avg_price_cents,
             vs_market_pct, rank, sample_size, category, updated_at
      FROM synthesis_store_rankings
      WHERE rank <= 5
      ORDER BY ingredient_name, rank
    `,
  },
  price_velocity: {
    query: `
      SELECT ingredient_name, change_count_7d, change_count_30d,
             volatility_30d, trend_direction, trend_acceleration,
             stability_score, status, updated_at
      FROM synthesis_price_velocity
      ORDER BY stability_score ASC
    `,
  },
  recall_alerts: {
    query: `
      SELECT * FROM synthesis_recall_alerts
      WHERE synced_to_chefflow = 0
      ORDER BY severity DESC
      LIMIT 100
    `,
    markSynced: `
      UPDATE synthesis_recall_alerts SET synced_to_chefflow = 1
      WHERE id IN (SELECT id FROM synthesis_recall_alerts WHERE synced_to_chefflow = 0 LIMIT 100)
    `,
  },
  category_benchmarks: {
    query: `
      SELECT * FROM synthesis_category_benchmarks
      ORDER BY sample_size DESC
    `,
  },
  substitutions: {
    query: `
      SELECT ingredient_name, substitute_name, category, price_delta_pct,
             seasonal_match, confidence, reason, updated_at
      FROM synthesis_substitutions
      WHERE confidence >= 0.5
      ORDER BY confidence DESC
    `,
  },
  local_markets: {
    query: `
      SELECT market_name, lat, lng, open_season, open_days,
             product_count, is_open_this_week, updated_at
      FROM synthesis_local_markets
      WHERE is_open_this_week = 1
      ORDER BY product_count DESC
    `,
  },
};

async function main() {
  const table = process.argv[2] || 'all';
  const db = new Database(DB_PATH, { timeout: 300000, readonly: true });
  db.pragma('busy_timeout = 300000');

  const result = {};

  if (table === 'all') {
    for (const [name, config] of Object.entries(TABLES)) {
      try {
        result[name] = db.prepare(config.query).all();
      } catch (err) {
        result[name] = { error: err.message };
      }
    }
  } else if (TABLES[table]) {
    try {
      result[table] = db.prepare(TABLES[table].query).all();
    } catch (err) {
      result[table] = { error: err.message };
    }
  } else {
    result.error = `Unknown table: ${table}. Available: ${Object.keys(TABLES).join(', ')}`;
  }

  // Summary stats
  result._meta = {
    exported_at: new Date().toISOString(),
    table: table,
    counts: {},
  };

  for (const [name, data] of Object.entries(result)) {
    if (name === '_meta') continue;
    if (Array.isArray(data)) {
      result._meta.counts[name] = data.length;
    }
  }

  db.close();

  // Mark synced (separate writable connection)
  if (table === 'all' || TABLES[table]?.markSynced) {
    const dbWrite = new Database(DB_PATH, { timeout: 300000 });
    dbWrite.pragma('journal_mode = WAL');
    dbWrite.pragma('busy_timeout = 300000');

    const tablesToMark = table === 'all'
      ? Object.entries(TABLES).filter(([_, c]) => c.markSynced)
      : [[table, TABLES[table]]].filter(([_, c]) => c?.markSynced);

    for (const [name, config] of tablesToMark) {
      try {
        dbWrite.prepare(config.markSynced).run();
      } catch (err) {
        console.error(`  Warning: failed to mark ${name} as synced: ${err.message}`);
      }
    }

    dbWrite.close();
  }

  // Output JSON
  console.log(JSON.stringify(result, null, 2));
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });

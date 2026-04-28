#!/usr/bin/env node
/**
 * S7: Category Cost Benchmarks
 * Computes median/p25/p75 per food category. Tracks 30d trends.
 * Generates "dinner index" (weighted basket cost).
 *
 * Schedule: Daily at 4:30am
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'prices.db');

// Dinner index basket weights (typical private dinner for 6-8)
const DINNER_BASKET = {
  'produce':    { weight: 0.20, typical_lb: 8 },
  'protein':    { weight: 0.35, typical_lb: 6 },
  'seafood':    { weight: 0.15, typical_lb: 3 },
  'dairy':      { weight: 0.10, typical_lb: 4 },
  'pantry':     { weight: 0.08, typical_lb: 5 },
  'bakery':     { weight: 0.05, typical_lb: 2 },
  'beverages':  { weight: 0.05, typical_lb: 6 },
  'snacks':     { weight: 0.02, typical_lb: 1 },
};

function median(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function main() {
  const db = new Database(DB_PATH, { timeout: 300000 });
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 300000');

  console.log('\n=== S7: Category Cost Benchmarks ===');

  // Get food categories with prices
  const categories = db.prepare(`
    SELECT
      ci.category,
      COUNT(DISTINCT ci.ingredient_id) as ingredient_count
    FROM canonical_ingredients ci
    JOIN current_prices cp ON cp.canonical_ingredient_id = ci.ingredient_id
    WHERE ci.is_food = 1
    AND ci.category IS NOT NULL
    AND ci.category != ''
    AND cp.last_confirmed_at > datetime('now', '-14 days')
    AND cp.price_cents > 0
    GROUP BY ci.category
    HAVING ingredient_count >= 5
    ORDER BY ingredient_count DESC
  `).all();

  console.log(`  Food categories: ${categories.length}`);

  const getCategoryPrices = db.prepare(`
    SELECT cp.price_cents
    FROM current_prices cp
    JOIN canonical_ingredients ci ON ci.ingredient_id = cp.canonical_ingredient_id
    WHERE ci.category = ?
    AND ci.is_food = 1
    AND cp.last_confirmed_at > datetime('now', '-14 days')
    AND cp.price_cents > 0
    AND cp.price_cents < 100000
  `);

  const getCategoryPrices30dAgo = db.prepare(`
    SELECT cp.price_cents
    FROM current_prices cp
    JOIN canonical_ingredients ci ON ci.ingredient_id = cp.canonical_ingredient_id
    WHERE ci.category = ?
    AND ci.is_food = 1
    AND cp.last_confirmed_at BETWEEN datetime('now', '-44 days') AND datetime('now', '-30 days')
    AND cp.price_cents > 0
    AND cp.price_cents < 100000
  `);

  const upsert = db.prepare(`
    INSERT INTO synthesis_category_benchmarks
      (category, median_price_cents, p25_price_cents, p75_price_cents,
       trend_direction, trend_pct, vs_30d_pct, sample_size, dinner_index_cents, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(category) DO UPDATE SET
      median_price_cents = excluded.median_price_cents,
      p25_price_cents = excluded.p25_price_cents,
      p75_price_cents = excluded.p75_price_cents,
      trend_direction = excluded.trend_direction,
      trend_pct = excluded.trend_pct,
      vs_30d_pct = excluded.vs_30d_pct,
      sample_size = excluded.sample_size,
      dinner_index_cents = excluded.dinner_index_cents,
      updated_at = excluded.updated_at
  `);

  let dinnerIndexTotal = 0;
  const categoryMedians = {};

  const processBatch = db.transaction(() => {
    for (const cat of categories) {
      const currentPrices = getCategoryPrices.all(cat.category).map(r => r.price_cents);
      if (currentPrices.length < 5) continue;

      const med = Math.round(median(currentPrices));
      const p25 = Math.round(percentile(currentPrices, 25));
      const p75 = Math.round(percentile(currentPrices, 75));

      categoryMedians[cat.category.toLowerCase()] = med;

      // Compare to 30 days ago
      const oldPrices = getCategoryPrices30dAgo.all(cat.category).map(r => r.price_cents);
      const oldMed = oldPrices.length >= 5 ? median(oldPrices) : med;
      const vs30dPct = oldMed > 0
        ? Math.round(((med - oldMed) / oldMed) * 10000) / 100
        : 0;

      let trendDirection = 'flat';
      if (vs30dPct > 3) trendDirection = 'up';
      else if (vs30dPct < -3) trendDirection = 'down';

      // Dinner index contribution
      const basketKey = cat.category.toLowerCase();
      const basketEntry = DINNER_BASKET[basketKey];
      let dinnerContrib = 0;
      if (basketEntry) {
        dinnerContrib = Math.round(med * basketEntry.typical_lb * basketEntry.weight);
      }
      dinnerIndexTotal += dinnerContrib;

      upsert.run(
        cat.category,
        med,
        p25,
        p75,
        trendDirection,
        vs30dPct,
        vs30dPct,
        currentPrices.length,
        dinnerContrib || null
      );
    }
  });

  processBatch();

  console.log(`\n  Categories benchmarked: ${categories.length}`);
  console.log(`  Dinner index: $${(dinnerIndexTotal / 100).toFixed(2)}`);

  // Show all categories with trends
  const results = db.prepare(`
    SELECT category, median_price_cents, trend_direction, vs_30d_pct, sample_size
    FROM synthesis_category_benchmarks
    ORDER BY sample_size DESC
  `).all();

  console.log(`\n  Category Report:`);
  for (const r of results) {
    const arrow = r.trend_direction === 'up' ? '+' : r.trend_direction === 'down' ? '' : '=';
    console.log(`    ${r.category}: $${(r.median_price_cents/100).toFixed(2)} median (${arrow}${r.vs_30d_pct}% 30d, n=${r.sample_size})`);
  }

  console.log('=== S7 Complete ===\n');
  db.close();
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });

#!/usr/bin/env node
/**
 * S4: Price Velocity Tracker
 * Computes volatility, trend direction, stability scores per ingredient.
 * Classifies: stable, trending, volatile, spiking.
 *
 * Schedule: Every 4 hours
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'prices.db');

async function main() {
  const db = new Database(DB_PATH, { timeout: 300000 });
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 300000');

  console.log('\n=== S4: Price Velocity Tracker ===');

  // Get ingredients with enough price history
  const ingredients = db.prepare(`
    SELECT DISTINCT
      pc.canonical_ingredient_id as ingredient_id,
      ci.name as ingredient_name,
      ci.is_food
    FROM price_changes pc
    JOIN canonical_ingredients ci ON ci.ingredient_id = pc.canonical_ingredient_id
    WHERE pc.observed_at > datetime('now', '-30 days')
    AND ci.is_food = 1
    GROUP BY pc.canonical_ingredient_id
    HAVING COUNT(*) >= 3
  `).all();

  console.log(`  Ingredients with 30d price history: ${ingredients.length}`);

  const upsert = db.prepare(`
    INSERT INTO synthesis_price_velocity
      (ingredient_id, ingredient_name, change_count_7d, change_count_30d,
       volatility_30d, trend_direction, trend_acceleration, stability_score, status, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(ingredient_id) DO UPDATE SET
      ingredient_name = excluded.ingredient_name,
      change_count_7d = excluded.change_count_7d,
      change_count_30d = excluded.change_count_30d,
      volatility_30d = excluded.volatility_30d,
      trend_direction = excluded.trend_direction,
      trend_acceleration = excluded.trend_acceleration,
      stability_score = excluded.stability_score,
      status = excluded.status,
      updated_at = excluded.updated_at
  `);

  const get7dChanges = db.prepare(`
    SELECT COUNT(*) as cnt, AVG(change_pct) as avg_pct
    FROM price_changes
    WHERE canonical_ingredient_id = ? AND observed_at > datetime('now', '-7 days')
  `);

  const get30dChanges = db.prepare(`
    SELECT COUNT(*) as cnt, AVG(change_pct) as avg_pct
    FROM price_changes
    WHERE canonical_ingredient_id = ? AND observed_at > datetime('now', '-30 days')
  `);

  // Get daily prices for volatility calculation
  const getDailyPrices = db.prepare(`
    SELECT
      date(observed_at) as day,
      AVG(new_price_cents) as avg_price
    FROM price_changes
    WHERE canonical_ingredient_id = ? AND observed_at > datetime('now', '-30 days')
    GROUP BY date(observed_at)
    ORDER BY day
  `);

  // Get recent vs older trend for acceleration
  const getRecentTrend = db.prepare(`
    SELECT AVG(change_pct) as avg_pct
    FROM price_changes
    WHERE canonical_ingredient_id = ? AND observed_at > datetime('now', '-7 days')
  `);

  const getOlderTrend = db.prepare(`
    SELECT AVG(change_pct) as avg_pct
    FROM price_changes
    WHERE canonical_ingredient_id = ?
    AND observed_at > datetime('now', '-30 days')
    AND observed_at <= datetime('now', '-7 days')
  `);

  let statusCounts = { stable: 0, trending: 0, volatile: 0, spiking: 0 };

  const processBatch = db.transaction((batch) => {
    for (const ing of batch) {
      const d7 = get7dChanges.get(ing.ingredient_id);
      const d30 = get30dChanges.get(ing.ingredient_id);
      const dailyPrices = getDailyPrices.all(ing.ingredient_id);

      // Compute volatility (std dev of daily avg prices)
      let volatility = 0;
      if (dailyPrices.length >= 2) {
        const mean = dailyPrices.reduce((s, p) => s + p.avg_price, 0) / dailyPrices.length;
        const variance = dailyPrices.reduce((s, p) => s + Math.pow(p.avg_price - mean, 2), 0) / dailyPrices.length;
        volatility = Math.sqrt(variance);
        // Normalize as coefficient of variation (percentage)
        if (mean > 0) volatility = (volatility / mean) * 100;
      }

      // Trend direction from 30d average change
      const avgPct30 = d30?.avg_pct || 0;
      let trendDirection = 'flat';
      if (avgPct30 > 2) trendDirection = 'up';
      else if (avgPct30 < -2) trendDirection = 'down';

      // Trend acceleration: recent vs older
      const recent = getRecentTrend.get(ing.ingredient_id);
      const older = getOlderTrend.get(ing.ingredient_id);
      const acceleration = (recent?.avg_pct || 0) - (older?.avg_pct || 0);

      // Stability score: 0-100 (100 = rock stable)
      // Based on: volatility (lower = better), change frequency (lower = better)
      const freqScore = Math.max(0, 100 - (d30?.cnt || 0) * 2); // fewer changes = more stable
      const volScore = Math.max(0, 100 - volatility * 5); // lower volatility = more stable
      const stabilityScore = Math.round((freqScore + volScore) / 2);

      // Status classification
      let status = 'stable';
      if (stabilityScore < 20 || (d7?.cnt > 10 && volatility > 15)) {
        status = 'spiking';
      } else if (stabilityScore < 40) {
        status = 'volatile';
      } else if (Math.abs(avgPct30) > 5) {
        status = 'trending';
      }

      statusCounts[status]++;

      upsert.run(
        ing.ingredient_id,
        ing.ingredient_name,
        d7?.cnt || 0,
        d30?.cnt || 0,
        Math.round(volatility * 100) / 100,
        trendDirection,
        Math.round(acceleration * 100) / 100,
        stabilityScore,
        status
      );
    }
  });

  const batchSize = 500;
  for (let i = 0; i < ingredients.length; i += batchSize) {
    processBatch(ingredients.slice(i, i + batchSize));
    if (i % 5000 === 0 && i > 0) {
      console.log(`  Processed ${i}/${ingredients.length}...`);
    }
  }

  console.log(`\n  Results:`);
  console.log(`    Stable:    ${statusCounts.stable}`);
  console.log(`    Trending:  ${statusCounts.trending}`);
  console.log(`    Volatile:  ${statusCounts.volatile}`);
  console.log(`    Spiking:   ${statusCounts.spiking}`);

  // Show top volatile food items
  const topVolatile = db.prepare(`
    SELECT ingredient_name, stability_score, status, volatility_30d, trend_direction
    FROM synthesis_price_velocity
    WHERE status IN ('volatile', 'spiking')
    ORDER BY stability_score ASC
    LIMIT 10
  `).all();

  if (topVolatile.length) {
    console.log(`\n  Most volatile:`);
    for (const v of topVolatile) {
      console.log(`    ${v.ingredient_name}: score=${v.stability_score}, vol=${v.volatility_30d}%, ${v.trend_direction}`);
    }
  }

  console.log('=== S4 Complete ===\n');
  db.close();
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });

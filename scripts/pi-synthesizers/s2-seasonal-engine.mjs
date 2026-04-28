#!/usr/bin/env node
/**
 * S2: Seasonal Intelligence Engine
 * Computes monthly availability x price value scores per ingredient.
 * Generates: peak_season, good_value, off_season, avoid flags.
 *
 * Schedule: Daily at 2:30am
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'prices.db');

// Known seasonal produce patterns (northeast US)
// month ranges where item is peak season (1-indexed)
const SEASONAL_OVERRIDES = {
  // Spring
  'asparagus':      [4, 5, 6],
  'peas':           [5, 6, 7],
  'rhubarb':        [4, 5, 6],
  'artichoke':      [3, 4, 5],
  'radish':         [4, 5, 6],
  'spring onion':   [4, 5, 6],
  // Summer
  'tomato':         [7, 8, 9],
  'corn':           [7, 8, 9],
  'zucchini':       [6, 7, 8],
  'peach':          [7, 8],
  'blueberry':      [6, 7, 8],
  'strawberry':     [5, 6, 7],
  'raspberry':      [6, 7, 8],
  'watermelon':     [6, 7, 8],
  'cucumber':       [6, 7, 8, 9],
  'bell pepper':    [7, 8, 9],
  'eggplant':       [7, 8, 9],
  'basil':          [6, 7, 8, 9],
  'cherry':         [6, 7],
  // Fall
  'apple':          [9, 10, 11],
  'pear':           [9, 10, 11],
  'pumpkin':        [9, 10, 11],
  'butternut squash': [9, 10, 11, 12],
  'acorn squash':   [9, 10, 11],
  'cranberry':      [10, 11, 12],
  'sweet potato':   [10, 11, 12],
  'turnip':         [10, 11, 12],
  'parsnip':        [10, 11, 12],
  'brussels sprout': [10, 11, 12],
  // Winter
  'citrus':         [12, 1, 2, 3],
  'orange':         [12, 1, 2, 3],
  'grapefruit':     [12, 1, 2, 3],
  'lemon':          [12, 1, 2, 3],
  'kale':           [10, 11, 12, 1, 2],
  'cabbage':        [10, 11, 12, 1, 2],
  'leek':           [10, 11, 12, 1],
  // Year-round (stable prices)
  'onion':          [1,2,3,4,5,6,7,8,9,10,11,12],
  'potato':         [1,2,3,4,5,6,7,8,9,10,11,12],
  'carrot':         [1,2,3,4,5,6,7,8,9,10,11,12],
  'garlic':         [1,2,3,4,5,6,7,8,9,10,11,12],
  'banana':         [1,2,3,4,5,6,7,8,9,10,11,12],
};

function getSeasonalOverride(name) {
  const lower = name.toLowerCase();
  for (const [key, months] of Object.entries(SEASONAL_OVERRIDES)) {
    if (lower.includes(key)) return months;
  }
  return null;
}

async function main() {
  const db = new Database(DB_PATH, { timeout: 300000 });
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 300000');

  console.log('\n=== S2: Seasonal Intelligence Engine ===');

  // Get food ingredients with price data
  const ingredients = db.prepare(`
    SELECT DISTINCT
      ci.ingredient_id as id,
      ci.name,
      ci.category
    FROM canonical_ingredients ci
    WHERE ci.is_food = 1
    AND ci.ingredient_id IN (
      SELECT DISTINCT canonical_ingredient_id FROM current_prices
      WHERE last_confirmed_at > datetime('now', '-90 days')
    )
  `).all();

  console.log(`  Food ingredients with recent prices: ${ingredients.length}`);

  // Get existing seasonal_availability data from Pi
  const existingSeasonal = db.prepare(`
    SELECT * FROM seasonal_availability
  `).all();
  console.log(`  Existing seasonal_availability records: ${existingSeasonal.length}`);

  // Build a lookup from existing data (seasonal_availability has per-month columns: jan, feb, etc.)
  const monthCols = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec_val'];
  const seasonalLookup = new Map();
  for (const s of existingSeasonal) {
    for (let m = 0; m < 12; m++) {
      const val = s[monthCols[m]];
      if (val != null) {
        const key = `${s.canonical_ingredient_id}:${m + 1}`;
        seasonalLookup.set(key, parseFloat(val) || 0.5);
      }
    }
  }

  const upsert = db.prepare(`
    INSERT INTO synthesis_seasonal_scores
      (ingredient_id, ingredient_name, month, availability_score, price_percentile, value_score, status, region, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'northeast', datetime('now'))
    ON CONFLICT(ingredient_id, month, region) DO UPDATE SET
      ingredient_name = excluded.ingredient_name,
      availability_score = excluded.availability_score,
      price_percentile = excluded.price_percentile,
      value_score = excluded.value_score,
      status = excluded.status,
      updated_at = excluded.updated_at
  `);

  // For price percentile, get monthly avg prices
  const getMonthlyPrices = db.prepare(`
    SELECT
      CAST(strftime('%m', last_confirmed_at) AS INTEGER) as month,
      AVG(price_cents) as avg_price
    FROM current_prices
    WHERE canonical_ingredient_id = ?
    AND last_confirmed_at > datetime('now', '-365 days')
    GROUP BY strftime('%m', last_confirmed_at)
  `);

  let totalScores = 0;
  let statusCounts = { peak_season: 0, good_value: 0, off_season: 0, avoid: 0 };

  const processBatch = db.transaction((batch) => {
    for (const ing of batch) {
      const monthlyPrices = getMonthlyPrices.all(ing.id);
      if (monthlyPrices.length < 2) continue; // need at least 2 months

      // Calculate price range for percentile normalization
      const prices = monthlyPrices.map(m => m.avg_price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const priceRange = maxPrice - minPrice;

      // Check for seasonal override
      const overrideMonths = getSeasonalOverride(ing.name);

      // Build lookup of actual monthly prices
      const priceByMonth = new Map();
      for (const mp of monthlyPrices) {
        priceByMonth.set(mp.month, mp.avg_price);
      }

      for (let month = 1; month <= 12; month++) {
        // Availability score (0-1)
        let availability = 0.5; // default moderate

        // Check override first
        if (overrideMonths) {
          availability = overrideMonths.includes(month) ? 0.9 : 0.3;
        }

        // Check existing seasonal_availability data
        const existingKey = `${ing.id}:${month}`;
        if (seasonalLookup.has(existingKey)) {
          availability = seasonalLookup.get(existingKey);
        }

        // Price percentile (0-1, lower = cheaper relative to own range)
        let pricePercentile = 0.5;
        const monthPrice = priceByMonth.get(month);
        if (monthPrice !== undefined && priceRange > 0) {
          pricePercentile = (monthPrice - minPrice) / priceRange;
        }

        // Value score = availability * (1 - pricePercentile)
        // High availability + low price = high value
        const valueScore = Math.round(availability * (1 - pricePercentile) * 100) / 100;

        // Status classification
        let status;
        if (valueScore > 0.7) status = 'peak_season';
        else if (valueScore > 0.5) status = 'good_value';
        else if (valueScore > 0.2) status = 'off_season';
        else status = 'avoid';

        statusCounts[status]++;
        totalScores++;

        upsert.run(
          ing.id,
          ing.name,
          month,
          Math.round(availability * 100) / 100,
          Math.round(pricePercentile * 100) / 100,
          valueScore,
          status
        );
      }
    }
  });

  const batchSize = 200;
  for (let i = 0; i < ingredients.length; i += batchSize) {
    processBatch(ingredients.slice(i, i + batchSize));
    if (i % 2000 === 0 && i > 0) {
      console.log(`  Processed ${i}/${ingredients.length}...`);
    }
  }

  console.log(`\n  Total seasonal scores: ${totalScores}`);
  console.log(`    Peak season: ${statusCounts.peak_season}`);
  console.log(`    Good value:  ${statusCounts.good_value}`);
  console.log(`    Off season:  ${statusCounts.off_season}`);
  console.log(`    Avoid:       ${statusCounts.avoid}`);

  // Show what's in season now
  const currentMonth = new Date().getMonth() + 1;
  const inSeason = db.prepare(`
    SELECT ingredient_name, value_score
    FROM synthesis_seasonal_scores
    WHERE month = ? AND status = 'peak_season'
    ORDER BY value_score DESC
    LIMIT 15
  `).all(currentMonth);

  if (inSeason.length) {
    console.log(`\n  Peak season now (month ${currentMonth}):`);
    for (const s of inSeason) {
      console.log(`    ${s.ingredient_name} (value: ${s.value_score})`);
    }
  }

  console.log('=== S2 Complete ===\n');
  db.close();
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });

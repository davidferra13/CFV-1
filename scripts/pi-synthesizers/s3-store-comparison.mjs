#!/usr/bin/env node
/**
 * S3: Store Comparison Matrix
 * Ranks stores per ingredient by price. Shows savings vs market average.
 *
 * Schedule: Daily at 3am
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'prices.db');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function isBusy(err) { return err?.code?.startsWith('SQLITE_BUSY') || /database is locked/i.test(err?.message || ''); }

async function main() {
  const db = new Database(DB_PATH, { timeout: 300000 });
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 300000');

  console.log('\n=== S3: Store Comparison Matrix ===');

  // Clear old rankings (full refresh daily)
  db.prepare(`DELETE FROM synthesis_store_rankings`).run();

  // Get food ingredients with prices at 3+ sources
  const ingredients = db.prepare(`
    SELECT
      ci.ingredient_id,
      ci.name as ingredient_name,
      ci.category,
      COUNT(DISTINCT cp.source_id) as store_count
    FROM canonical_ingredients ci
    JOIN current_prices cp ON cp.canonical_ingredient_id = ci.ingredient_id
    WHERE ci.is_food = 1
    AND cp.last_confirmed_at > datetime('now', '-14 days')
    AND cp.price_cents > 0
    GROUP BY ci.ingredient_id
    HAVING store_count >= 3
    ORDER BY store_count DESC
  `).all();

  console.log(`  Ingredients with 3+ stores: ${ingredients.length}`);

  const getStorePrices = db.prepare(`
    SELECT
      sr.name as store_name,
      sr.type as chain_slug,
      AVG(cp.price_cents) as avg_price,
      COUNT(*) as sample_size
    FROM current_prices cp
    JOIN source_registry sr ON sr.source_id = cp.source_id
    WHERE cp.canonical_ingredient_id = ?
    AND cp.last_confirmed_at > datetime('now', '-14 days')
    AND cp.price_cents > 0
    GROUP BY sr.source_id
    ORDER BY avg_price ASC
  `);

  const insert = db.prepare(`
    INSERT INTO synthesis_store_rankings
      (ingredient_id, ingredient_name, store_name, chain_slug, avg_price_cents,
       vs_market_pct, rank, sample_size, category, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  let totalRankings = 0;
  let cheapestWins = new Map(); // track which store wins most often

  for (let idx = 0; idx < ingredients.length; idx++) {
    const ing = ingredients[idx];
    const storePrices = getStorePrices.all(ing.ingredient_id);
    if (storePrices.length < 3) continue;

    const totalPrice = storePrices.reduce((s, p) => s + p.avg_price, 0);
    const marketAvg = totalPrice / storePrices.length;

    for (let rank = 0; rank < storePrices.length; rank++) {
      const sp = storePrices[rank];
      const vsMarketPct = marketAvg > 0
        ? Math.round(((sp.avg_price - marketAvg) / marketAvg) * 10000) / 100
        : 0;

      try {
        insert.run(ing.ingredient_id, ing.ingredient_name, sp.store_name,
          sp.chain_slug || null, Math.round(sp.avg_price), vsMarketPct,
          rank + 1, sp.sample_size, ing.category || null);
      } catch (err) {
        if (isBusy(err)) { await sleep(2000); try { insert.run(ing.ingredient_id, ing.ingredient_name, sp.store_name, sp.chain_slug || null, Math.round(sp.avg_price), vsMarketPct, rank + 1, sp.sample_size, ing.category || null); } catch (e) { /* skip */ } }
      }

      totalRankings++;
      if (rank === 0) {
        cheapestWins.set(sp.store_name, (cheapestWins.get(sp.store_name) || 0) + 1);
      }
    }

    if (idx % 2000 === 0 && idx > 0) {
      console.log(`  Processed ${idx}/${ingredients.length}...`);
    }
  }

  console.log(`\n  Total store rankings: ${totalRankings}`);
  console.log(`  Ingredients ranked: ${ingredients.length}`);

  // Show which stores win most categories
  const sorted = [...cheapestWins.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (sorted.length) {
    console.log(`\n  Cheapest store wins:`);
    for (const [store, wins] of sorted) {
      console.log(`    ${store}: ${wins} ingredients`);
    }
  }

  // Show biggest savings opportunities
  const bigSavings = db.prepare(`
    SELECT ingredient_name, store_name, vs_market_pct, avg_price_cents
    FROM synthesis_store_rankings
    WHERE rank = 1 AND vs_market_pct < -20
    ORDER BY vs_market_pct ASC
    LIMIT 10
  `).all();

  if (bigSavings.length) {
    console.log(`\n  Biggest savings (>20% below market):`);
    for (const s of bigSavings) {
      console.log(`    ${s.ingredient_name} at ${s.store_name}: ${s.vs_market_pct}% ($${(s.avg_price_cents/100).toFixed(2)})`);
    }
  }

  console.log('=== S3 Complete ===\n');
  db.close();
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });

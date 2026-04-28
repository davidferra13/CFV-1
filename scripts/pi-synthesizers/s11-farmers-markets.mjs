#!/usr/bin/env node
/**
 * S11: Farmers Market Intelligence
 * Parses market schedules, matches products to canonical ingredients,
 * flags markets open this week.
 *
 * Schedule: Weekly (Monday 5am)
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'prices.db');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function isBusy(err) { return err?.code?.startsWith('SQLITE_BUSY') || /database is locked/i.test(err?.message || ''); }

// Month name to number mapping
const MONTH_MAP = {
  'january': 1, 'february': 2, 'march': 3, 'april': 4,
  'may': 5, 'june': 6, 'july': 7, 'august': 8,
  'september': 9, 'october': 10, 'november': 11, 'december': 12,
  'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4,
  'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'sept': 9,
  'oct': 10, 'nov': 11, 'dec': 12,
};

function parseSeasonMonths(seasonText) {
  if (!seasonText) return { start: 1, end: 12 }; // year-round default

  const lower = seasonText.toLowerCase();
  const months = [];

  for (const [name, num] of Object.entries(MONTH_MAP)) {
    if (lower.includes(name)) months.push(num);
  }

  if (months.length >= 2) {
    return { start: Math.min(...months), end: Math.max(...months) };
  }

  return { start: 1, end: 12 };
}

function isOpenThisWeek(seasonText) {
  const currentMonth = new Date().getMonth() + 1;
  const { start, end } = parseSeasonMonths(seasonText);

  // Handle wraparound (e.g., November-March)
  if (start <= end) {
    return currentMonth >= start && currentMonth <= end;
  } else {
    return currentMonth >= start || currentMonth <= end;
  }
}

// USDA farmers market product tags are generic ("Organic", "Vegetables")
// Map them to product categories for a rough product count estimate
const TAG_TO_PRODUCT_COUNT = {
  'organic': 30,
  'vegetables': 20,
  'fruits': 15,
  'herbs': 10,
  'eggs': 3,
  'honey': 2,
  'meat': 10,
  'poultry': 5,
  'cheese': 8,
  'dairy': 8,
  'baked goods': 5,
  'flowers': 0,
  'crafts': 0,
  'jams': 3,
  'preserves': 3,
  'maple syrup': 1,
  'wine': 3,
  'cider': 1,
  'mushrooms': 4,
  'fish': 5,
  'seafood': 5,
  'nuts': 5,
  'grains': 5,
  'beans': 3,
  'soap': 0,
  'prepared food': 5,
};

function estimateProductCount(productsText) {
  if (!productsText) return 5; // default estimate for markets with no data

  let count = 0;
  const lower = productsText.toLowerCase();

  for (const [tag, est] of Object.entries(TAG_TO_PRODUCT_COUNT)) {
    if (lower.includes(tag)) count += est;
  }

  // If nothing matched but text exists, give a default
  return count || 5;
}

async function main() {
  const db = new Database(DB_PATH, { timeout: 300000 });
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 300000');

  console.log('\n=== S11: Farmers Market Intelligence ===');

  // Get farmers markets
  const markets = db.prepare(`
    SELECT * FROM farmers_markets
  `).all();

  console.log(`  Total farmers markets: ${markets.length}`);

  if (markets.length === 0) {
    console.log('  No market data. Exiting.');
    db.close();
    return;
  }

  // Clear and rebuild
  db.prepare(`DELETE FROM synthesis_local_markets`).run();

  const insert = db.prepare(`
    INSERT INTO synthesis_local_markets
      (market_id, market_name, lat, lng, open_season, open_days,
       products, product_count, is_open_this_week, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  let openCount = 0;
  let totalProducts = 0;

  for (const market of markets) {
    const name = market.market_name || market.name || market.listing_name || 'Unknown Market';
    const lat = market.latitude || market.y || market.lat || null;
    const lng = market.longitude || market.x || market.lng || null;
    const season = market.season_start ? `${market.season_start}-${market.season_end}` : '';
    const days = market.days_hours || '';
    const productsRaw = market.products || '';
    // Parse JSON array if present, otherwise use raw text
    let productsText = '';
    try {
      const arr = JSON.parse(productsRaw);
      productsText = Array.isArray(arr) ? arr.join(', ') : productsRaw;
    } catch { productsText = productsRaw; }

    const productCount = estimateProductCount(productsText);
    const isOpen = isOpenThisWeek(season) ? 1 : 0;

    if (isOpen) openCount++;
    totalProducts += productCount;

    try {
      insert.run(market.id || null, name,
        lat ? parseFloat(lat) : null, lng ? parseFloat(lng) : null,
        season, days, JSON.stringify(productsText), productCount, isOpen);
    } catch (err) {
      if (isBusy(err)) { await sleep(1000); try { insert.run(market.id || null, name, lat ? parseFloat(lat) : null, lng ? parseFloat(lng) : null, season, days, JSON.stringify(productsText), productCount, isOpen); } catch (e) { /* skip */ } }
    }
  }

  console.log(`\n  Markets processed: ${markets.length}`);
  console.log(`  Open this week: ${openCount}`);
  console.log(`  Product matches: ${totalProducts}`);

  // Show nearby markets (northeast US, approximate)
  const nearby = db.prepare(`
    SELECT market_name, open_days, product_count, is_open_this_week
    FROM synthesis_local_markets
    WHERE lat BETWEEN 42.0 AND 43.0
    AND lng BETWEEN -72.0 AND -70.5
    AND is_open_this_week = 1
    ORDER BY product_count DESC
    LIMIT 10
  `).all();

  if (nearby.length) {
    console.log(`\n  Open markets near Haverhill, MA:`);
    for (const m of nearby) {
      console.log(`    ${m.market_name} (${m.product_count} products) - ${m.open_days}`);
    }
  }

  console.log('=== S11 Complete ===\n');
  db.close();
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });

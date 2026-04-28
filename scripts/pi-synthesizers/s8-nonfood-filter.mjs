#!/usr/bin/env node
/**
 * S8: Non-Food Filter
 * Tags canonical_ingredients with is_food flag.
 * ~40% of ingredients are non-food (Kitchen Supplies, Personal Care, etc.)
 * All other synthesizers depend on this for clean food-only queries.
 *
 * Schedule: Daily at 1am
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'prices.db');

// Categories that are definitely NOT food
const NON_FOOD_CATEGORIES = [
  'kitchen supplies', 'personal care', 'household', 'health care',
  'baby', 'pet', 'pets', 'cleaning', 'office', 'electronics',
  'automotive', 'garden', 'clothing', 'toys', 'beauty',
  'home improvement', 'sporting goods', 'pharmacy', 'vitamins',
  'first aid', 'laundry', 'paper products', 'trash bags',
  'batteries', 'light bulbs', 'air fresheners', 'candles',
  'party supplies', 'gift cards', 'magazines', 'books',
  'tobacco', 'floral', 'greeting cards',
];

// Name patterns that indicate non-food items
const NON_FOOD_PATTERNS = [
  /paper\s*towel/i, /toilet\s*paper/i, /detergent/i, /shampoo/i,
  /conditioner/i, /soap\b/i, /bleach/i, /sponge/i, /trash\s*bag/i,
  /garbage\s*bag/i, /aluminum\s*foil/i, /plastic\s*wrap/i, /ziplock/i,
  /ziploc/i, /glad\s*bag/i, /hefty/i, /diaper/i, /wipe[s]?\b/i,
  /toothpaste/i, /toothbrush/i, /deodorant/i, /lotion/i, /sunscreen/i,
  /band[\s-]*aid/i, /aspirin/i, /ibuprofen/i, /tylenol/i, /advil/i,
  /battery/i, /batteries/i, /light\s*bulb/i, /candle[s]?\b/i,
  /air\s*freshener/i, /febreze/i, /lysol/i, /clorox\s*(?!salad)/i,
  /windex/i, /pledge/i, /swiffer/i, /mop\b/i, /broom/i, /dustpan/i,
  /pet\s*food/i, /dog\s*food/i, /cat\s*food/i, /cat\s*litter/i,
  /kitty\s*litter/i, /puppy/i, /kitten/i, /bird\s*seed/i,
  /gift\s*card/i, /prepaid\s*card/i, /magazine/i,
  /laundry/i, /fabric\s*softener/i, /dryer\s*sheet/i, /starch/i,
  /dish\s*(?:washer|washing)/i, /dishwasher/i,
  /hand\s*sanitizer/i, /rubbing\s*alcohol/i, /cotton\s*ball/i,
  /nail\s*polish/i, /makeup/i, /mascara/i, /lipstick/i,
  /razor[s]?\b/i, /shaving/i,
];

// Ambiguous items that ARE food despite suspicious names
const FOOD_OVERRIDES = [
  /coconut\s*oil/i, /olive\s*oil/i, /vegetable\s*oil/i, /cooking\s*spray/i,
  /baking\s*soda/i, /baking\s*powder/i, /vanilla\s*extract/i,
  /corn\s*starch/i, /food\s*coloring/i, /gelatin/i, /pectin/i,
  /vinegar/i, /salt/i, /sugar/i, /honey/i, /maple\s*syrup/i,
  /molasses/i, /cream\s*of\s*tartar/i, /yeast/i,
];

function isNonFoodByName(name) {
  const lower = name.toLowerCase();
  // Check food overrides first
  for (const pattern of FOOD_OVERRIDES) {
    if (pattern.test(lower)) return false;
  }
  // Check non-food patterns
  for (const pattern of NON_FOOD_PATTERNS) {
    if (pattern.test(lower)) return true;
  }
  return false;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function isBusy(err) { return err?.code?.startsWith('SQLITE_BUSY') || /database is locked/i.test(err?.message || ''); }

async function runWithRetry(label, fn, attempts = 5) {
  for (let i = 1; i <= attempts; i++) {
    try { return await fn(); }
    catch (err) {
      if (!isBusy(err) || i === attempts) throw err;
      console.warn(`  ${label}: DB locked, retry ${i}/${attempts} in ${i * 15}s...`);
      await sleep(i * 15000);
    }
  }
}

async function main() {
  const db = new Database(DB_PATH, { timeout: 300000 });
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 300000');

  console.log('\n=== S8: Non-Food Filter ===');
  console.log(`  DB: ${DB_PATH}`);

  // Ensure is_food column exists on canonical_ingredients
  const cols = db.prepare("PRAGMA table_info(canonical_ingredients)").all();
  const hasIsFood = cols.some(c => c.name === 'is_food');
  if (!hasIsFood) {
    db.exec("ALTER TABLE canonical_ingredients ADD COLUMN is_food INTEGER DEFAULT 1");
    console.log('  Added is_food column to canonical_ingredients');
  }

  // Get all ingredients
  const ingredients = db.prepare(`
    SELECT ingredient_id as id, name, category FROM canonical_ingredients
  `).all();
  console.log(`  Total ingredients: ${ingredients.length}`);

  const update = db.prepare(`
    UPDATE canonical_ingredients SET is_food = ? WHERE ingredient_id = ?
  `);

  let foodCount = 0;
  let nonFoodCount = 0;
  let changedCount = 0;

  const setCategoryLower = new Set(NON_FOOD_CATEGORIES);

  // Process without transactions - individual updates to avoid holding write lock
  for (let i = 0; i < ingredients.length; i++) {
    const item = ingredients[i];
    let isFood = 1;

    const catLower = (item.category || '').toLowerCase().trim();
    if (setCategoryLower.has(catLower)) {
      isFood = 0;
    }

    if (isFood && isNonFoodByName(item.name)) {
      isFood = 0;
    }

    if (isFood) {
      foodCount++;
    } else {
      nonFoodCount++;
    }

    try {
      update.run(isFood, item.id);
      changedCount++;
    } catch (err) {
      if (isBusy(err)) {
        await sleep(1000);
        try { update.run(isFood, item.id); changedCount++; }
        catch (e) { /* skip this one */ }
      }
    }

    if (i % 20000 === 0 && i > 0) {
      console.log(`  Processed ${i}/${ingredients.length}...`);
    }
  }

  const pct = ((nonFoodCount / ingredients.length) * 100).toFixed(1);
  console.log(`\n  Results:`);
  console.log(`    Food items:     ${foodCount}`);
  console.log(`    Non-food items: ${nonFoodCount} (${pct}%)`);
  console.log(`    Changed:        ${changedCount}`);
  console.log('=== S8 Complete ===\n');

  db.close();
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });

#!/usr/bin/env node
/**
 * S6: Yield Factor Populator
 * Fills yield_pct, trim_loss_pct, cook_shrinkage_pct on canonical_ingredients.
 * Uses USDA data where available, category averages elsewhere.
 *
 * Schedule: Weekly (Sunday 4am)
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'prices.db');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function isBusy(err) { return err?.code?.startsWith('SQLITE_BUSY') || /database is locked/i.test(err?.message || ''); }

// Category-based yield defaults (percentage)
// These are industry standard averages for professional kitchens
const CATEGORY_YIELDS = {
  'produce':       { yield_pct: 85, trim_loss: 15, cook_shrinkage: 10 },
  'vegetables':    { yield_pct: 85, trim_loss: 15, cook_shrinkage: 12 },
  'fruit':         { yield_pct: 88, trim_loss: 12, cook_shrinkage: 5 },
  'protein':       { yield_pct: 75, trim_loss: 10, cook_shrinkage: 25 },
  'meat':          { yield_pct: 72, trim_loss: 12, cook_shrinkage: 28 },
  'poultry':       { yield_pct: 70, trim_loss: 15, cook_shrinkage: 25 },
  'seafood':       { yield_pct: 65, trim_loss: 30, cook_shrinkage: 15 },
  'fish':          { yield_pct: 62, trim_loss: 35, cook_shrinkage: 15 },
  'dairy':         { yield_pct: 98, trim_loss: 2,  cook_shrinkage: 5 },
  'eggs':          { yield_pct: 90, trim_loss: 10, cook_shrinkage: 5 },
  'grains':        { yield_pct: 95, trim_loss: 2,  cook_shrinkage: 0 },
  'bakery':        { yield_pct: 95, trim_loss: 5,  cook_shrinkage: 8 },
  'pantry':        { yield_pct: 97, trim_loss: 2,  cook_shrinkage: 0 },
  'dry goods':     { yield_pct: 98, trim_loss: 1,  cook_shrinkage: 0 },
  'canned goods':  { yield_pct: 95, trim_loss: 5,  cook_shrinkage: 0 },
  'frozen':        { yield_pct: 90, trim_loss: 5,  cook_shrinkage: 10 },
  'beverages':     { yield_pct: 100, trim_loss: 0, cook_shrinkage: 0 },
  'condiments':    { yield_pct: 98, trim_loss: 2,  cook_shrinkage: 0 },
  'spices':        { yield_pct: 100, trim_loss: 0, cook_shrinkage: 0 },
  'herbs':         { yield_pct: 80, trim_loss: 20, cook_shrinkage: 15 },
  'nuts':          { yield_pct: 85, trim_loss: 15, cook_shrinkage: 0 },
  'oils':          { yield_pct: 100, trim_loss: 0, cook_shrinkage: 5 },
  'deli':          { yield_pct: 95, trim_loss: 5,  cook_shrinkage: 5 },
};

// Specific ingredient overrides (more precise than category)
const INGREDIENT_OVERRIDES = {
  // High trim produce
  'artichoke':      { yield_pct: 40, trim_loss: 60, cook_shrinkage: 5 },
  'pineapple':      { yield_pct: 52, trim_loss: 48, cook_shrinkage: 0 },
  'pomegranate':    { yield_pct: 43, trim_loss: 57, cook_shrinkage: 0 },
  'corn on the cob': { yield_pct: 55, trim_loss: 45, cook_shrinkage: 10 },
  'watermelon':     { yield_pct: 55, trim_loss: 45, cook_shrinkage: 0 },
  'coconut':        { yield_pct: 51, trim_loss: 49, cook_shrinkage: 0 },
  // Shellfish (use regex keys prefixed with / for word-boundary matching)
  'whole lobster':  { yield_pct: 35, trim_loss: 65, cook_shrinkage: 10 },
  'lobster tail':   { yield_pct: 55, trim_loss: 40, cook_shrinkage: 10 },
  'lobster claw':   { yield_pct: 35, trim_loss: 65, cook_shrinkage: 10 },
  'crab leg':       { yield_pct: 25, trim_loss: 75, cook_shrinkage: 5 },
  'crab claw':      { yield_pct: 25, trim_loss: 75, cook_shrinkage: 5 },
  'shrimp':         { yield_pct: 55, trim_loss: 45, cook_shrinkage: 15 },
  'clam':           { yield_pct: 30, trim_loss: 70, cook_shrinkage: 5 },
  'mussel':         { yield_pct: 35, trim_loss: 65, cook_shrinkage: 5 },
  // Bone-in meats
  'bone-in':        { yield_pct: 60, trim_loss: 25, cook_shrinkage: 30 },
  'rack of lamb':   { yield_pct: 55, trim_loss: 25, cook_shrinkage: 30 },
  'whole chicken':  { yield_pct: 65, trim_loss: 20, cook_shrinkage: 25 },
  't-bone':         { yield_pct: 70, trim_loss: 15, cook_shrinkage: 25 },
  'ribeye':         { yield_pct: 85, trim_loss: 8,  cook_shrinkage: 25 },
  'tenderloin':     { yield_pct: 82, trim_loss: 10, cook_shrinkage: 22 },
  'brisket':        { yield_pct: 50, trim_loss: 15, cook_shrinkage: 40 },
};

// Words that prevent shellfish yield overrides from matching
const SHELLFISH_EXCLUDES = [
  'mushroom', 'sauce', 'cracker', 'scissors', 'blade', 'rangoon',
  'dip', 'ramen', 'empanada', 'seasoning', 'flavored', 'imitation',
  'surimi', 'pinwheel', 'bar ', 'salad',
];

function getYieldForIngredient(name, category) {
  const lower = name.toLowerCase();

  // Check specific overrides first, using smarter matching
  for (const [key, yields] of Object.entries(INGREDIENT_OVERRIDES)) {
    // Multi-word keys: exact substring match is fine (e.g., "lobster tail")
    if (key.includes(' ')) {
      if (lower.includes(key)) return { ...yields, source: 'override' };
      continue;
    }
    // Single-word keys: word boundary match + exclusion check
    const regex = new RegExp(`\\b${key}s?\\b`, 'i');
    if (regex.test(lower)) {
      // Check exclusions for shellfish terms
      const isExcluded = SHELLFISH_EXCLUDES.some(ex => lower.includes(ex));
      if (!isExcluded) return { ...yields, source: 'override' };
    }
  }

  // Fall back to category
  const catLower = (category || '').toLowerCase();
  for (const [key, yields] of Object.entries(CATEGORY_YIELDS)) {
    if (catLower.includes(key) || catLower === key) {
      return { ...yields, source: 'category' };
    }
  }

  // Default (generic food)
  return { yield_pct: 90, trim_loss: 5, cook_shrinkage: 10, source: 'default' };
}

async function main() {
  const db = new Database(DB_PATH, { timeout: 300000 });
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 300000');

  console.log('\n=== S6: Yield Factor Populator ===');

  // Ensure columns exist
  const cols = db.prepare("PRAGMA table_info(canonical_ingredients)").all();
  const colNames = new Set(cols.map(c => c.name));

  for (const col of ['yield_pct', 'trim_loss_pct', 'cook_shrinkage_pct', 'yield_source']) {
    if (!colNames.has(col)) {
      const type = col === 'yield_source' ? 'TEXT' : 'REAL';
      db.exec(`ALTER TABLE canonical_ingredients ADD COLUMN ${col} ${type}`);
      console.log(`  Added ${col} column`);
    }
  }

  // Get food ingredients without yield data (or all for refresh)
  const ingredients = db.prepare(`
    SELECT ingredient_id as id, name, category FROM canonical_ingredients
    WHERE is_food = 1
  `).all();

  console.log(`  Food ingredients: ${ingredients.length}`);

  const update = db.prepare(`
    UPDATE canonical_ingredients
    SET yield_pct = ?, trim_loss_pct = ?, cook_shrinkage_pct = ?, yield_source = ?
    WHERE ingredient_id = ?
  `);

  let counts = { override: 0, category: 0, default: 0 };
  let updated = 0;

  for (let i = 0; i < ingredients.length; i++) {
    const ing = ingredients[i];
    const yields = getYieldForIngredient(ing.name, ing.category);
    counts[yields.source]++;

    try {
      update.run(yields.yield_pct, yields.trim_loss, yields.cook_shrinkage, yields.source, ing.id);
      updated++;
    } catch (err) {
      if (isBusy(err)) { await sleep(1000); try { update.run(yields.yield_pct, yields.trim_loss, yields.cook_shrinkage, yields.source, ing.id); updated++; } catch (e) { /* skip */ } }
    }

    if (i % 20000 === 0 && i > 0) {
      console.log(`  Processed ${i}/${ingredients.length}...`);
    }
  }

  console.log(`\n  Updated: ${updated}`);
  console.log(`    From specific overrides: ${counts.override}`);
  console.log(`    From category averages:  ${counts.category}`);
  console.log(`    From defaults:           ${counts.default}`);

  // Show some examples of high-trim items
  const highTrim = db.prepare(`
    SELECT name, yield_pct, trim_loss_pct, cook_shrinkage_pct, yield_source
    FROM canonical_ingredients
    WHERE is_food = 1 AND yield_pct IS NOT NULL AND yield_pct < 60
    ORDER BY yield_pct ASC
    LIMIT 10
  `).all();

  if (highTrim.length) {
    console.log(`\n  Highest trim items (yield < 60%):`);
    for (const h of highTrim) {
      console.log(`    ${h.name}: ${h.yield_pct}% yield, ${h.trim_loss_pct}% trim, ${h.cook_shrinkage_pct}% shrink (${h.yield_source})`);
    }
  }

  console.log('=== S6 Complete ===\n');
  db.close();
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });

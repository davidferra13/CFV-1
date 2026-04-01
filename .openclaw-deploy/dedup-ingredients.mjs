/**
 * OpenClaw - Ingredient Deduplication & Cleanup
 *
 * Phase 1: Remove null-ID orphan ingredients (referenced by nothing)
 * Phase 2: Remove non-food categories (Household, Personal Care, etc.)
 * Phase 3: Merge exact name duplicates (keep the one with more price refs)
 * Phase 4: Normalize duplicate categories
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'prices.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = OFF');

const stats = { nullOrphans: 0, nonFood: 0, dupesMerged: 0, catNormalized: 0 };

// ============================================================================
// PHASE 1: Remove null-ID orphan ingredients
// ============================================================================
console.log('=== PHASE 1: Remove null-ID orphan ingredients ===');

const delNull = db.prepare('DELETE FROM canonical_ingredients WHERE ingredient_id IS NULL');
const r1 = delNull.run();
stats.nullOrphans = r1.changes;
console.log('  Removed ' + stats.nullOrphans + ' null-ID orphan rows');

// ============================================================================
// PHASE 2: Remove non-food ingredients with zero price references
// ============================================================================
console.log('');
console.log('=== PHASE 2: Remove non-food ingredients (zero price refs) ===');

const NON_FOOD_CATEGORIES = [
  'Household', 'Personal Care', 'Personal_care', 'Health Care',
  'Kitchen Supplies', 'Baby', 'Pets', 'Pet'
];

for (const cat of NON_FOOD_CATEGORIES) {
  const del = db.prepare(
    'DELETE FROM canonical_ingredients WHERE category = ? AND ingredient_id NOT IN (SELECT DISTINCT canonical_ingredient_id FROM current_prices)'
  );
  const result = del.run(cat);
  if (result.changes > 0) {
    console.log('  ' + cat + ': removed ' + result.changes + ' unreferenced ingredients');
    stats.nonFood += result.changes;
  }
}

// Clean orphan normalization mappings and variants
const normCleaned = db.prepare(
  'DELETE FROM normalization_map WHERE canonical_ingredient_id NOT IN (SELECT ingredient_id FROM canonical_ingredients WHERE ingredient_id IS NOT NULL)'
).run();
if (normCleaned.changes > 0) console.log('  Cleaned ' + normCleaned.changes + ' orphan normalization mappings');

const varCleaned = db.prepare(
  'DELETE FROM ingredient_variants WHERE ingredient_id NOT IN (SELECT ingredient_id FROM canonical_ingredients WHERE ingredient_id IS NOT NULL)'
).run();
if (varCleaned.changes > 0) console.log('  Cleaned ' + varCleaned.changes + ' orphan variants');

console.log('  Total non-food removed: ' + stats.nonFood);

// ============================================================================
// PHASE 3: Merge exact name duplicates
// ============================================================================
console.log('');
console.log('=== PHASE 3: Merge exact name duplicates ===');

const dupeGroups = db.prepare(
  "SELECT LOWER(name) as lname, GROUP_CONCAT(ingredient_id) as ids, COUNT(*) as cnt FROM canonical_ingredients WHERE ingredient_id IS NOT NULL GROUP BY LOWER(name) HAVING cnt > 1"
).all();

console.log('  Found ' + dupeGroups.length + ' duplicate name groups');

const relink = db.transaction((bestId, dupeId) => {
  db.prepare('UPDATE current_prices SET canonical_ingredient_id = ? WHERE canonical_ingredient_id = ?').run(bestId, dupeId);
  db.prepare('UPDATE price_changes SET canonical_ingredient_id = ? WHERE canonical_ingredient_id = ?').run(bestId, dupeId);
  db.prepare('UPDATE normalization_map SET canonical_ingredient_id = ? WHERE canonical_ingredient_id = ?').run(bestId, dupeId);
  db.prepare('UPDATE ingredient_variants SET ingredient_id = ? WHERE ingredient_id = ?').run(bestId, dupeId);
  db.prepare('UPDATE price_anomalies SET canonical_ingredient_id = ? WHERE canonical_ingredient_id = ?').run(bestId, dupeId);
  db.prepare('UPDATE price_trends SET canonical_ingredient_id = ? WHERE canonical_ingredient_id = ?').run(bestId, dupeId);
  db.prepare('UPDATE price_monthly_summary SET canonical_ingredient_id = ? WHERE canonical_ingredient_id = ?').run(bestId, dupeId);
  db.prepare('DELETE FROM canonical_ingredients WHERE ingredient_id = ?').run(dupeId);
});

for (const group of dupeGroups) {
  const ids = group.ids.split(',');

  let bestId = ids[0];
  let bestCount = 0;

  for (const id of ids) {
    const cnt = db.prepare('SELECT COUNT(*) as c FROM current_prices WHERE canonical_ingredient_id = ?').get(id).c;
    if (cnt > bestCount) {
      bestCount = cnt;
      bestId = id;
    }
  }

  for (const id of ids) {
    if (id === bestId) continue;
    relink(bestId, id);
    stats.dupesMerged++;
  }
}

console.log('  Merged ' + stats.dupesMerged + ' duplicate ingredients');

// ============================================================================
// PHASE 4: Normalize categories
// ============================================================================
console.log('');
console.log('=== PHASE 4: Normalize categories ===');

const CAT_MAP = {
  'Personal_care': 'Personal Care',
  'Pet': 'Pets',
  'Snacks & Candy': 'Snacks',
  'Meat & Seafood': 'Protein',
  'Dairy & Eggs': 'Dairy',
  'Dry Goods & Pasta': 'Pantry',
  'Canned Goods & Soups': 'Pantry',
  'Condiments & Sauces': 'Pantry',
  'Oils, Vinegars, & Spices': 'Oils & Spices',
  'Baking Essentials': 'Baking',
  'Meat': 'Protein',
  'Seafood': 'Protein',
  'Deli': 'Prepared & Deli',
  'Prepared Foods': 'Prepared & Deli',
  'Candy': 'Snacks',
  'Bakery': 'Grains & Bakery',
  'Breakfast': 'Grains & Bakery',
  'International': 'Pantry',
  'Spices': 'Oils & Spices',
};

for (const [from, to] of Object.entries(CAT_MAP)) {
  const result = db.prepare('UPDATE canonical_ingredients SET category = ? WHERE category = ?').run(to, from);
  if (result.changes > 0) {
    console.log('  ' + from + ' -> ' + to + ': ' + result.changes + ' ingredients');
    stats.catNormalized += result.changes;
  }
  // Also normalize catalog_products
  db.prepare('UPDATE catalog_products SET category = ? WHERE category = ?').run(to, from);
}

// ============================================================================
// FINAL STATS
// ============================================================================
console.log('');
console.log('=== FINAL STATE ===');
const finalCount = db.prepare('SELECT COUNT(*) as c FROM canonical_ingredients').get().c;
const withPrices = db.prepare('SELECT COUNT(DISTINCT canonical_ingredient_id) as c FROM current_prices').get().c;
const totalPrices = db.prepare('SELECT COUNT(*) as c FROM current_prices').get().c;

console.log('  Ingredients: ' + finalCount + ' (was 49,450)');
console.log('  With prices: ' + withPrices);
console.log('  Total prices: ' + totalPrices);
console.log('  Removed: ' + stats.nullOrphans + ' null orphans + ' + stats.nonFood + ' non-food + ' + stats.dupesMerged + ' dupes');
console.log('  Categories normalized: ' + stats.catNormalized);

const cats = db.prepare('SELECT category, COUNT(*) as cnt FROM canonical_ingredients GROUP BY category ORDER BY cnt DESC').all();
console.log('');
console.log('  Category breakdown:');
cats.forEach(r => console.log('    ' + r.category + ': ' + r.cnt));

db.close();
console.log('');
console.log('Done.');

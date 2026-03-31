/**
 * OpenClaw Catalog Cleanup
 * Normalizes categories, removes non-food, deduplicates.
 * Run on the Pi: node services/clean-catalog.mjs
 */

import { getDb } from '../lib/db.mjs';

// Normalize 53 messy categories down to 15 clean ones
const CATEGORY_NORMALIZE = {
  // Proteins
  'beef': 'Protein',
  'pork': 'Protein',
  'poultry': 'Protein',
  'lamb': 'Protein',
  'seafood': 'Protein',
  'Seafood': 'Protein',
  'Meat': 'Protein',
  'Meat & Seafood': 'Protein',
  'protein': 'Protein',
  'eggs': 'Protein',

  // Produce
  'produce': 'Produce',
  'Produce': 'Produce',
  'herbs': 'Produce',

  // Dairy
  'dairy': 'Dairy',
  'Dairy': 'Dairy',
  'Dairy & Eggs': 'Dairy',

  // Grains & Bakery
  'grains': 'Grains & Bakery',
  'Bakery': 'Grains & Bakery',
  'Breakfast': 'Grains & Bakery',
  'Dry Goods & Pasta': 'Grains & Bakery',

  // Pantry
  'pantry': 'Pantry',
  'Pantry': 'Pantry',
  'Canned Goods & Soups': 'Pantry',
  'condiment': 'Pantry',
  'Condiments & Sauces': 'Pantry',

  // Oils & Spices
  'oils': 'Oils & Spices',
  'spices': 'Oils & Spices',
  'Spices': 'Oils & Spices',
  'Oils, Vinegars, & Spices': 'Oils & Spices',

  // Baking
  'baking': 'Baking',
  'Baking': 'Baking',
  'Baking Essentials': 'Baking',

  // Beverages
  'beverages': 'Beverages',
  'Beverages': 'Beverages',
  'Alcohol': 'Beverages',
  'alcohol': 'Beverages',

  // Frozen
  'Frozen': 'Frozen',

  // Snacks
  'Snacks': 'Snacks',
  'Snacks & Candy': 'Snacks',
  'Candy': 'Snacks',

  // Prepared & Deli
  'Deli': 'Prepared & Deli',
  'Prepared Foods': 'Prepared & Deli',
  'International': 'Prepared & Deli',

  // Other (food)
  'Other': 'Other',
  'uncategorized': 'Other',

  // NON-FOOD (will be flagged)
  'Household': '_NON_FOOD',
  'Personal Care': '_NON_FOOD',
  'Personal_care': '_NON_FOOD',
  'Pet': '_NON_FOOD',
  'Pets': '_NON_FOOD',
  'Kitchen Supplies': '_NON_FOOD',
  'Health Care': '_NON_FOOD',
  'Baby': 'Other', // baby food is still food
};

function main() {
  const db = getDb();

  console.log('=== OpenClaw Catalog Cleanup ===');
  console.log('');

  // Step 1: Normalize categories
  console.log('Step 1: Normalizing categories...');
  let normalized = 0;
  let nonFoodFlagged = 0;

  const allItems = db.prepare('SELECT ingredient_id, category FROM canonical_ingredients').all();

  const updateStmt = db.prepare('UPDATE canonical_ingredients SET category = ? WHERE ingredient_id = ?');

  const txn = db.transaction(function() {
    for (const item of allItems) {
      const newCat = CATEGORY_NORMALIZE[item.category];
      if (newCat && newCat !== item.category) {
        if (newCat === '_NON_FOOD') {
          nonFoodFlagged++;
        }
        updateStmt.run(newCat, item.ingredient_id);
        normalized++;
      }
    }
  });
  txn();

  console.log('  Normalized: ' + normalized + ' items');
  console.log('  Non-food flagged: ' + nonFoodFlagged + ' items');

  // Step 2: Remove non-food items (and their prices)
  console.log('');
  console.log('Step 2: Removing non-food items...');

  const nonFoodIds = db.prepare("SELECT ingredient_id FROM canonical_ingredients WHERE category = '_NON_FOOD'").all();
  const nonFoodIdSet = nonFoodIds.map(r => r.ingredient_id);

  let pricesRemoved = 0;
  let variantsRemoved = 0;
  let ingredientsRemoved = 0;

  const deletePrices = db.prepare('DELETE FROM current_prices WHERE canonical_ingredient_id = ?');
  const deleteVariants = db.prepare('DELETE FROM ingredient_variants WHERE ingredient_id = ?');
  const deleteIngredient = db.prepare('DELETE FROM canonical_ingredients WHERE ingredient_id = ?');

  const txn2 = db.transaction(function() {
    for (const id of nonFoodIdSet) {
      const p = deletePrices.run(id);
      pricesRemoved += p.changes;
      const v = deleteVariants.run(id);
      variantsRemoved += v.changes;
      const i = deleteIngredient.run(id);
      ingredientsRemoved += i.changes;
    }
  });
  txn2();

  console.log('  Removed: ' + ingredientsRemoved + ' non-food ingredients');
  console.log('  Removed: ' + pricesRemoved + ' non-food prices');
  console.log('  Removed: ' + variantsRemoved + ' non-food variants');

  // Step 3: Deduplicate (keep the one with more prices)
  console.log('');
  console.log('Step 3: Deduplicating...');

  const dupes = db.prepare(
    "SELECT LOWER(name) as ln, GROUP_CONCAT(ingredient_id) as ids, COUNT(*) as c FROM canonical_ingredients GROUP BY ln HAVING c > 1"
  ).all();

  let dupesMerged = 0;

  const txn3 = db.transaction(function() {
    for (const dupe of dupes) {
      const ids = dupe.ids.split(',');

      // Find which has the most prices
      let bestId = ids[0];
      let bestCount = 0;
      for (const id of ids) {
        const count = db.prepare('SELECT COUNT(*) as c FROM current_prices WHERE canonical_ingredient_id = ?').get(id);
        if (count.c > bestCount) {
          bestCount = count.c;
          bestId = id;
        }
      }

      // Merge prices from duplicates into the best one, then delete duplicates
      for (const id of ids) {
        if (id === bestId) continue;

        // Move prices (update canonical_ingredient_id, skip conflicts)
        db.prepare(
          'UPDATE OR IGNORE current_prices SET canonical_ingredient_id = ? WHERE canonical_ingredient_id = ?'
        ).run(bestId, id);

        // Clean up ALL referencing tables for this dupe
        db.prepare('DELETE FROM current_prices WHERE canonical_ingredient_id = ?').run(id);
        db.prepare('DELETE FROM price_changes WHERE canonical_ingredient_id = ?').run(id);
        db.prepare('DELETE FROM price_trends WHERE canonical_ingredient_id = ?').run(id);
        db.prepare('DELETE FROM price_anomalies WHERE canonical_ingredient_id = ?').run(id);
        db.prepare('DELETE FROM price_monthly_summary WHERE canonical_ingredient_id = ?').run(id);
        db.prepare('DELETE FROM normalization_map WHERE canonical_ingredient_id = ?').run(id);
        db.prepare('DELETE FROM ingredient_variants WHERE ingredient_id = ?').run(id);
        db.prepare('DELETE FROM canonical_ingredients WHERE ingredient_id = ?').run(id);
        dupesMerged++;
      }
    }
  });
  txn3();

  console.log('  Merged and removed: ' + dupesMerged + ' duplicate items');

  // Step 4: Final stats
  console.log('');
  console.log('=== Final Catalog Stats ===');

  const finalTotal = db.prepare('SELECT COUNT(*) as c FROM canonical_ingredients').get();
  const finalWithPrices = db.prepare('SELECT COUNT(DISTINCT canonical_ingredient_id) as c FROM current_prices').get();
  const finalCats = db.prepare('SELECT category, COUNT(*) as c FROM canonical_ingredients GROUP BY category ORDER BY c DESC').all();
  const priceCount = db.prepare('SELECT COUNT(*) as c FROM current_prices').get();
  const sourceCount = db.prepare('SELECT COUNT(DISTINCT source_id) as c FROM current_prices').get();

  console.log('Total food items: ' + finalTotal.c);
  console.log('Items with prices: ' + finalWithPrices.c);
  console.log('Total price records: ' + priceCount.c);
  console.log('Price sources: ' + sourceCount.c);
  console.log('');
  console.log('By category:');
  finalCats.forEach(r => console.log('  ' + r.category + ': ' + r.c));

  db.close();
}

main();

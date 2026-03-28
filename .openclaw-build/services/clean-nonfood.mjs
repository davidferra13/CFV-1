/**
 * OpenClaw - Non-Food Cleanup
 * Removes non-food items that leaked through the old filter.
 * Run this once after updating normalize-rules.mjs with the improved filter.
 */

import { getDb } from '../lib/db.mjs';
import { isFoodItem } from '../lib/normalize-rules.mjs';

function main() {
  console.log('=== OpenClaw Non-Food Cleanup ===');
  console.log(`Time: ${new Date().toISOString()}`);

  const db = getDb();

  // Get all current prices with their ingredient names
  const prices = db.prepare(`
    SELECT cp.id, cp.raw_product_name, cp.canonical_ingredient_id, ci.name as ingredient_name
    FROM current_prices cp
    JOIN canonical_ingredients ci ON cp.canonical_ingredient_id = ci.ingredient_id
  `).all();

  console.log(`Total prices to check: ${prices.length}`);

  let removed = 0;
  const removedItems = [];
  const ingredientsToCheck = new Set();

  for (const price of prices) {
    const name = price.raw_product_name || price.ingredient_name;
    if (!isFoodItem(name)) {
      // Remove this price
      db.prepare('DELETE FROM current_prices WHERE id = ?').run(price.id);
      ingredientsToCheck.add(price.canonical_ingredient_id);
      removedItems.push(name);
      removed++;
    }
  }

  console.log(`Removed ${removed} non-food prices`);

  // Clean up orphaned ingredients (no prices referencing them)
  // Must delete from all referencing tables first due to FK constraints
  let orphansRemoved = 0;
  for (const ingredientId of ingredientsToCheck) {
    const remaining = db.prepare('SELECT COUNT(*) as c FROM current_prices WHERE canonical_ingredient_id = ?').get(ingredientId);
    if (remaining.c === 0) {
      // Delete from all referencing tables first
      db.prepare('DELETE FROM price_changes WHERE canonical_ingredient_id = ?').run(ingredientId);
      db.prepare('DELETE FROM price_anomalies WHERE canonical_ingredient_id = ?').run(ingredientId);
      db.prepare('DELETE FROM price_trends WHERE canonical_ingredient_id = ?').run(ingredientId);
      db.prepare('DELETE FROM price_monthly_summary WHERE canonical_ingredient_id = ?').run(ingredientId);
      db.prepare('DELETE FROM normalization_map WHERE canonical_ingredient_id = ?').run(ingredientId);
      db.prepare('DELETE FROM ingredient_variants WHERE ingredient_id = ?').run(ingredientId);
      // Now safe to delete the ingredient
      db.prepare('DELETE FROM canonical_ingredients WHERE ingredient_id = ?').run(ingredientId);
      orphansRemoved++;
    }
  }

  console.log(`Removed ${orphansRemoved} orphaned ingredients`);

  // Also clean price_changes for removed prices
  const changesRemoved = db.prepare(`
    DELETE FROM price_changes WHERE canonical_ingredient_id NOT IN (
      SELECT DISTINCT canonical_ingredient_id FROM current_prices
    )
  `).run();
  console.log(`Removed ${changesRemoved.changes} orphaned price changes`);

  // Also clean price_anomalies
  const anomaliesRemoved = db.prepare(`
    DELETE FROM price_anomalies WHERE canonical_ingredient_id NOT IN (
      SELECT ingredient_id FROM canonical_ingredients
    )
  `).run();
  console.log(`Removed ${anomaliesRemoved.changes} orphaned anomalies`);

  // Final stats
  const finalPrices = db.prepare('SELECT COUNT(*) as c FROM current_prices').get();
  const finalIngredients = db.prepare('SELECT COUNT(*) as c FROM canonical_ingredients').get();

  console.log(`\n=== Cleanup Complete ===`);
  console.log(`Remaining prices: ${finalPrices.c}`);
  console.log(`Remaining ingredients: ${finalIngredients.c}`);

  if (removed > 0) {
    console.log(`\nSample removed items:`);
    removedItems.slice(0, 30).forEach(n => console.log(`  - ${n}`));
    if (removedItems.length > 30) console.log(`  ... and ${removedItems.length - 30} more`);
  }
}

main();

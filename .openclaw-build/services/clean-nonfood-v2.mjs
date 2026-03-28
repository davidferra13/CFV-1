/**
 * OpenClaw - Non-Food Cleanup V2
 * Removes non-food items that leaked through to uncategorized.
 * Targets: household products, storage containers, paper products, garden, pet, body care, etc.
 */

import { getDb } from '../lib/db.mjs';

const NON_FOOD_PATTERNS = [
  // Household / paper products
  /bounty|charmin|paper\s*(towel|product|plate)|toilet\s*paper|napkin|tissue/i,
  /trash\s*bag|garbage\s*bag|hefty|glad\s*(bag|wrap)|ziploc|reynolds\s*wrap/i,
  /aluminum\s*foil|plastic\s*wrap|parchment\s*paper|wax\s*paper/i,

  // Storage containers
  /storage\s*set|food\s*storage|container.*lid|prokeeper|keeper|deli\s*container/i,
  /round\s*container/i,

  // Kitchen tools / appliances (not food)
  /waffle\s*maker|blender|mixer|crofton|ambiano|toaster|air\s*fryer/i,
  /knife|cutting\s*board|pan\s*set|pot\s*set|bakeware|cookware/i,

  // Body care / cosmetics
  /bodycology|body\s*cream|body\s*wash|shampoo|conditioner|lotion|deodorant/i,
  /toothpaste|toothbrush|mouthwash|floss|razor|shaving/i,

  // Garden / pet / outdoor
  /chicken\s*manure|manure|bird\s*(seed|food|suet)|songbird|potting\s*(soil|mix)/i,
  /fertilizer|mulch|garden|lawn|plant\s*food|weed\s*killer/i,
  /dog\s*(food|treat)|cat\s*(food|treat|litter)|pet\s*(food|treat)/i,

  // Cleaning products
  /dish\s*soap|laundry|detergent|bleach|cleaner|disinfectant|lysol|clorox/i,
  /swiffer|mop|broom|vacuum\s*bag/i,

  // Medicine / vitamins (not food)
  /tylenol|advil|ibuprofen|acetaminophen|allergy\s*medicine|cold\s*medicine/i,
  /band-?aid|bandage|first\s*aid/i,

  // Non-food misc
  /greeting\s*card|gift\s*card|wrapping\s*paper|candle|air\s*freshener/i,
  /battery|light\s*bulb|extension\s*cord/i,
];

function isNonFood(name) {
  if (!name) return false;
  return NON_FOOD_PATTERNS.some(p => p.test(name));
}

function main() {
  console.log('=== OpenClaw Non-Food Cleanup V2 ===');
  console.log(`Time: ${new Date().toISOString()}`);

  const db = getDb();

  // Get all uncategorized priced items
  const uncategorized = db.prepare(`
    SELECT cp.id, cp.raw_product_name, cp.canonical_ingredient_id, ci.name as ingredient_name
    FROM current_prices cp
    JOIN canonical_ingredients ci ON cp.canonical_ingredient_id = ci.ingredient_id
    WHERE ci.category = 'uncategorized'
  `).all();

  console.log(`Uncategorized priced items to check: ${uncategorized.length}`);

  let removed = 0;
  const removedItems = [];
  const ingredientsToCheck = new Set();

  for (const item of uncategorized) {
    const name = item.raw_product_name || item.ingredient_name;
    if (isNonFood(name)) {
      db.prepare('DELETE FROM current_prices WHERE id = ?').run(item.id);
      ingredientsToCheck.add(item.canonical_ingredient_id);
      removedItems.push(name);
      removed++;
    }
  }

  console.log(`Removed ${removed} non-food prices`);

  // Clean up orphaned ingredients
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
      db.prepare('DELETE FROM canonical_ingredients WHERE ingredient_id = ?').run(ingredientId);
      orphansRemoved++;
    }
  }

  console.log(`Removed ${orphansRemoved} orphaned ingredients`);

  if (removed > 0) {
    console.log(`\nRemoved items:`);
    removedItems.forEach(n => console.log(`  - ${n}`));
  }

  // Final stats
  const finalPrices = db.prepare('SELECT COUNT(*) as c FROM current_prices').get();
  const finalIngredients = db.prepare('SELECT COUNT(*) as c FROM canonical_ingredients').get();
  console.log(`\nRemaining prices: ${finalPrices.c}`);
  console.log(`Remaining ingredients: ${finalIngredients.c}`);
}

main();

import Database from 'better-sqlite3';
const db = new Database('/home/davidferra/openclaw-prices/data/prices.db', { readonly: true });

// Show all priced items to see what we have
console.log('=== ALL PRICED ITEMS (with canonical names) ===');
const priced = db.prepare(`
  SELECT cp.canonical_ingredient_id, ci.name as canonical_name, ci.category,
    cp.raw_product_name, cp.price_cents, cp.price_unit, sr.name as store
  FROM current_prices cp
  JOIN canonical_ingredients ci ON cp.canonical_ingredient_id = ci.ingredient_id
  JOIN source_registry sr ON cp.source_id = sr.source_id
  ORDER BY ci.category, ci.name
`).all();

// Group by canonical ingredient
const byIngredient = {};
for (const p of priced) {
  const key = p.canonical_ingredient_id;
  if (!byIngredient[key]) byIngredient[key] = { name: p.canonical_name, cat: p.category, prices: [] };
  byIngredient[key].prices.push({ raw: p.raw_product_name, cents: p.price_cents, unit: p.price_unit, store: p.store });
}

for (const [id, data] of Object.entries(byIngredient)) {
  const best = data.prices.sort((a,b) => a.cents - b.cents)[0];
  console.log(`  ${data.cat.padEnd(12)} ${id} (${data.name}) - $${(best.cents/100).toFixed(2)}/${best.unit} @ ${best.store} [${data.prices.length} prices]`);
}

console.log(`\nTotal unique priced ingredients: ${Object.keys(byIngredient).length}`);

// Now look for items that SHOULD match our missing queries but the search doesn't find them
console.log('\n=== ORPHANED PRICED ITEMS (auto-slug IDs, not cross-matched) ===');
const orphans = db.prepare(`
  SELECT cp.canonical_ingredient_id, ci.name, cp.raw_product_name, cp.price_cents, sr.name as store
  FROM current_prices cp
  JOIN canonical_ingredients ci ON cp.canonical_ingredient_id = ci.ingredient_id
  JOIN source_registry sr ON cp.source_id = sr.source_id
  WHERE cp.canonical_ingredient_id NOT LIKE 'usda-%'
    AND cp.canonical_ingredient_id NOT LIKE 'chicken-%'
    AND cp.canonical_ingredient_id NOT LIKE 'beef-%'
    AND cp.canonical_ingredient_id NOT LIKE 'pork-%'
    AND cp.canonical_ingredient_id NOT LIKE 'eggs-%'
    AND cp.canonical_ingredient_id NOT LIKE 'milk-%'
    AND cp.canonical_ingredient_id NOT LIKE 'butter-%'
    AND cp.canonical_ingredient_id NOT LIKE 'rice-%'
    AND cp.canonical_ingredient_id NOT LIKE 'bread-%'
  ORDER BY cp.raw_product_name
`).all();

for (const o of orphans) {
  console.log(`  ${o.canonical_ingredient_id} -> "${o.raw_product_name}" $${(o.price_cents/100).toFixed(2)} @ ${o.store}`);
}

db.close();

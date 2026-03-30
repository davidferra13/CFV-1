/**
 * Seed baseline prices for ingredients that aren't in any store catalog.
 * These are reasonable market averages for the Northeast US region.
 *
 * Source: chef knowledge + regional market awareness.
 * Tagged as 'baseline_estimate' confidence so the system knows these
 * are estimates, not actual scraped prices.
 *
 * Run once, then the nightly sync will pick them up.
 * Real prices from store catalogs will always take priority (higher confidence).
 */

const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '..', 'data', 'prices.db'));

const now = new Date().toISOString();

// Ensure baseline source exists
db.prepare(`
  INSERT OR IGNORE INTO source_registry
  (source_id, name, type, chain_id, city, state, scrape_method, status, pricing_tier, created_at, updated_at)
  VALUES ('baseline-northeast', 'Northeast US Baseline', 'baseline_estimate', 'baseline', 'Haverhill', 'MA', 'manual_estimate', 'active', 'retail', ?, ?)
`).run(now, now);

// Baseline prices: [canonical_id, name, category, price_cents, unit, package_size, standard_unit]
// These are per-package prices with unit normalization
const baselines = [
  // Indian/South Asian essentials
  ['butter-clarified', 'Clarified Butter (Ghee)', 'Dairy', 999, 'oz', '16 oz', 'oz', 62],
  ['rose-water', 'Rose Water', 'Pantry', 399, 'fl oz', '10 fl oz', 'oz', 40],
  ['usda-papad', 'Papad', 'Pantry', 399, 'oz', '7 oz', 'oz', 57],
  ['tamarind', 'Tamarind Paste', 'Pantry', 349, 'oz', '8 oz', 'oz', 44],
  ['curry-leaves', 'Curry Leaves', 'Produce', 199, 'bunch', '1 bunch', 'each', 199],
  ['mustard-seeds', 'Mustard Seeds', 'Spices', 299, 'oz', '2.5 oz', 'oz', 120],
  ['fenugreek', 'Fenugreek Seeds', 'Spices', 349, 'oz', '2 oz', 'oz', 175],
  ['asafoetida', 'Asafoetida (Hing)', 'Spices', 599, 'oz', '3.5 oz', 'oz', 171],
  ['rice-basmati', 'Basmati Rice', 'Grains', 599, 'lb', '5 lb', 'oz', 7],

  // Other common gaps
  ['coconut-milk-canned', 'Coconut Milk (Canned)', 'Pantry', 249, 'fl oz', '13.5 fl oz', 'oz', 18],
  ['puff-pastry-frozen', 'Puff Pastry (Frozen)', 'Frozen', 599, 'oz', '17.3 oz', 'oz', 35],
  ['phyllo-dough', 'Phyllo Dough', 'Frozen', 399, 'oz', '16 oz', 'oz', 25],
  ['roasted-red-peppers-jarred', 'Roasted Red Peppers (Jarred)', 'Pantry', 349, 'oz', '12 oz', 'oz', 29],
  ['brioche', 'Brioche', 'Bakery', 499, 'each', '1 loaf', 'each', 499],
  ['whole-grain-mustard', 'Whole Grain Mustard', 'Condiments', 399, 'oz', '8 oz', 'oz', 50],
  ['mascarpone-cheese', 'Mascarpone Cheese', 'Dairy', 499, 'oz', '8 oz', 'oz', 62],
  ['truffle-oil', 'Truffle Oil', 'Pantry', 1299, 'fl oz', '3.4 fl oz', 'oz', 382],
  ['duck-breast', 'Duck Breast', 'Meat', 1299, 'lb', '1 lb', 'oz', 81],
  ['creme-fraiche', 'Creme Fraiche', 'Dairy', 599, 'oz', '8 oz', 'oz', 75],
];

const ensureCanonical = db.prepare(
  'INSERT OR IGNORE INTO canonical_ingredients (ingredient_id, name, category, standard_unit, created_at) VALUES (?, ?, ?, ?, ?)'
);

const upsertPrice = db.prepare(`
  INSERT OR REPLACE INTO current_prices (
    id, source_id, canonical_ingredient_id, variant_id, raw_product_name,
    price_cents, price_unit, package_size, price_type, pricing_tier, confidence,
    instacart_markup_applied_pct, last_confirmed_at, last_changed_at, created_at,
    in_stock, price_per_standard_unit_cents, standard_unit
  ) VALUES (?, 'baseline-northeast', ?, ?, ?, ?, ?, ?, 'regular', 'retail', 'baseline_estimate', 0, ?, ?, ?, 1, ?, ?)
`);

let seeded = 0;
const txn = db.transaction(() => {
  for (const [id, name, cat, cents, unit, pkg, stdUnit, stdCents] of baselines) {
    ensureCanonical.run(id, name, cat, unit, now);

    const variantId = id + ':baseline';
    const priceId = 'baseline-northeast:' + id + ':' + variantId;

    // Insert variant
    db.prepare('INSERT OR IGNORE INTO ingredient_variants (variant_id, ingredient_id, name, is_default) VALUES (?, ?, ?, 1)')
      .run(variantId, id, name);

    upsertPrice.run(
      priceId, id, variantId, name,
      cents, unit, pkg,
      now, now, now,
      stdCents, stdUnit
    );
    seeded++;
  }
});

txn();

console.log('Seeded', seeded, 'baseline prices');

// Verify the gaps are now filled
const { smartLookup } = require('./lib/smart-lookup.mjs');
const tests = ['ghee', 'rose water', 'papad', 'coconut milk', 'puff pastry', 'tamarind'];
for (const t of tests) {
  const r = smartLookup(db, t);
  if (r && r.best_price) {
    console.log('  ' + t + ': $' + (r.best_price / 100).toFixed(2) + ' (' + r.best_store + ')');
  } else {
    console.log('  ' + t + ': STILL NO PRICE');
  }
}

db.close();

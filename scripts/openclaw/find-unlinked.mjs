/**
 * Find scraped products in Pi's current_prices that match our missing items
 * but aren't linked to the right canonical IDs.
 * Run on Pi: node find-unlinked.mjs
 */
import { getDb } from './lib/db.mjs';
const db = getDb();

// Our 14 missing items
const missing = [
  'sweet-potato', 'brown-sugar', 'mixed-greens', 'red-pepper-flakes',
  'arborio-rice', 'canned-tomatoes', 'filet-mignon', 'red-wine-vinegar',
  'dijon-mustard', 'sesame-oil', 'balsamic-vinegar', 'vanilla-extract-pure',
  'white-wine-cooking', 'red-wine-cooking'
];

console.log('=== Canonical status ===');
for (const id of missing) {
  const ci = db.prepare('SELECT ingredient_id, name FROM canonical_ingredients WHERE ingredient_id = ?').get(id);
  const prices = ci ? db.prepare('SELECT COUNT(*) as cnt FROM current_prices WHERE canonical_ingredient_id = ?').get(id).cnt : 0;
  console.log((ci ? 'EXISTS' : 'MISSING') + ' | prices: ' + prices + ' | ' + id + (ci ? ' (' + ci.name + ')' : ''));
}

// Search for scraped products that COULD be these items
const searches = [
  ['sweet potato', 'sweet-potato'],
  ['brown sugar', 'brown-sugar'],
  ['mixed greens', 'mixed-greens'],
  ['spring mix', 'mixed-greens'],
  ['red pepper flake', 'red-pepper-flakes'],
  ['crushed red pepper', 'red-pepper-flakes'],
  ['arborio', 'arborio-rice'],
  ['diced tomato', 'canned-tomatoes'],
  ['crushed tomato', 'canned-tomatoes'],
  ['canned tomato', 'canned-tomatoes'],
  ['san marzano', 'canned-tomatoes'],
  ['sesame oil', 'sesame-oil'],
  ['balsamic', 'balsamic-vinegar'],
  ['vanilla extract', 'vanilla-extract-pure'],
  ['red pepper flake', 'red-pepper-flakes'],
  ['dijon', 'dijon-mustard'],
  ['filet mignon', 'filet-mignon'],
  ['beef tenderloin', 'filet-mignon'],
  ['red wine vinegar', 'red-wine-vinegar'],
  ['cooking wine', 'white-wine-cooking'],
];

console.log('\n=== Unlinked scraped products ===');
for (const [term, targetId] of searches) {
  const rows = db.prepare(`
    SELECT cp.raw_product_name, cp.price_cents, cp.price_unit,
           cp.canonical_ingredient_id, sr.name as store
    FROM current_prices cp
    JOIN source_registry sr ON cp.source_id = sr.source_id
    WHERE LOWER(cp.raw_product_name) LIKE ?
    LIMIT 5
  `).all('%' + term + '%');

  if (rows.length > 0) {
    console.log('\n  "' + term + '" -> should be ' + targetId);
    for (const r of rows) {
      const linked = r.canonical_ingredient_id === targetId ? ' [LINKED]' : ' [WRONG: ' + r.canonical_ingredient_id + ']';
      console.log('    ' + r.raw_product_name + ' | $' + (r.price_cents/100).toFixed(2) + '/' + r.price_unit + ' @ ' + r.store + linked);
    }
  }
}

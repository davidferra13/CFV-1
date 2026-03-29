/**
 * Relink scraped products to the correct canonical ingredient IDs.
 * Also add normalization_map entries so future scrapes map correctly.
 * Run on Pi: node relink-products.mjs
 */
import { getDb } from './lib/db.mjs';
const db = getDb();

// Pattern -> target canonical ID
// Each entry: [SQL LIKE pattern for raw_product_name, target canonical_ingredient_id, exclude patterns]
const RELINKS = [
  // Spring mix / mixed greens (exclude non-greens)
  ['%spring mix%', 'mixed-greens', []],
  ['%mixed greens%', 'mixed-greens', []],
  ['%salad mix%', 'mixed-greens', []],

  // Sesame oil (exclude non-oil products)
  ['%sesame oil%', 'sesame-oil', ['%cookie%', '%cracker%', '%chip%']],

  // Balsamic vinegar (only actual vinegar, not vinaigrette or meals)
  ['%balsamic vinegar%', 'balsamic-vinegar', ['%dressing%', '%vinaigrette%', '%chicken%', '%meal%', '%steamers%']],

  // Red wine vinegar
  ['%red wine vinegar%', 'red-wine-vinegar', ['%dressing%', '%vinaigrette%']],

  // Dijon mustard (actual mustard, not tuna/salad with dijon)
  ['%dijon mustard%', 'dijon-mustard', ['%tuna%', '%salad%', '%chicken%']],
  ['%mustard%dijon%', 'dijon-mustard', ['%tuna%', '%salad%', '%chicken%']],

  // Vanilla extract (actual extract, not gift packs)
  ['%vanilla extract%', 'vanilla-extract-pure', ['%gift%', '%pack%']],
  ['%pure vanilla%', 'vanilla-extract-pure', ['%gift%', '%pack%']],

  // Diced/crushed/canned tomatoes (actual canned tomatoes)
  ['%diced tomato%', 'canned-tomatoes', ['%soup%', '%salsa%', '%pasta%']],
  ['%crushed tomato%', 'canned-tomatoes', ['%soup%', '%salsa%']],
  ['%san marzano%', 'canned-tomatoes', []],
  ['%canned tomato%', 'canned-tomatoes', []],

  // Cooking wine
  ['%cooking wine%', 'white-wine-cooking', ['%red cooking wine%']],
  ['%red cooking wine%', 'red-wine-cooking', []],

  // Sweet potato (actual sweet potatoes, not fries)
  ['%sweet potato%', 'sweet-potato', ['%fries%', '%chip%', '%pie%', '%casserole%']],
  ['%yam%', 'sweet-potato', ['%yamaha%']],

  // Brown sugar
  ['%brown sugar%', 'brown-sugar', ['%ham%', '%cookie%', '%oatmeal%', '%cereal%', '%pop%']],

  // Red pepper flakes
  ['%red pepper flake%', 'red-pepper-flakes', []],
  ['%crushed red pepper%', 'red-pepper-flakes', []],
];

let relinked = 0;
let normAdded = 0;

const updateStmt = db.prepare(
  'UPDATE current_prices SET canonical_ingredient_id = ? WHERE id = ?'
);
const insertNorm = db.prepare(
  'INSERT OR REPLACE INTO normalization_map (raw_name, canonical_ingredient_id, method, confidence, confirmed) VALUES (?, ?, ?, 1.0, 1)'
);

for (const [pattern, targetId, excludes] of RELINKS) {
  // Verify target canonical exists
  const target = db.prepare('SELECT ingredient_id FROM canonical_ingredients WHERE ingredient_id = ?').get(targetId);
  if (!target) {
    console.log('SKIP: canonical ' + targetId + ' does not exist');
    continue;
  }

  // Find matching products NOT already linked to the target
  let query = `
    SELECT cp.id, cp.raw_product_name, cp.canonical_ingredient_id
    FROM current_prices cp
    WHERE LOWER(cp.raw_product_name) LIKE ?
      AND cp.canonical_ingredient_id != ?
  `;
  const params = [pattern, targetId];

  const candidates = db.prepare(query).all(...params);

  for (const row of candidates) {
    // Check exclude patterns
    const rawLower = row.raw_product_name.toLowerCase();
    let excluded = false;
    for (const ex of excludes) {
      if (rawLower.includes(ex.replace(/%/g, ''))) {
        excluded = true;
        break;
      }
    }
    if (excluded) continue;

    // Relink
    updateStmt.run(targetId, row.id);
    relinked++;

    // Add normalization map entry
    try {
      insertNorm.run(row.raw_product_name, targetId, 'relink');
      normAdded++;
    } catch (e) {
      // OK if it fails (dupe key etc)
    }

    console.log('  RELINK: "' + row.raw_product_name + '" -> ' + targetId + ' (was: ' + row.canonical_ingredient_id + ')');
  }
}

console.log('\n=== Results ===');
console.log('Relinked: ' + relinked + ' products');
console.log('Norm entries: ' + normAdded);

// Verify
console.log('\n=== Updated price counts ===');
const check = [
  'sweet-potato', 'brown-sugar', 'mixed-greens', 'red-pepper-flakes',
  'arborio-rice', 'canned-tomatoes', 'filet-mignon', 'red-wine-vinegar',
  'dijon-mustard', 'sesame-oil', 'balsamic-vinegar', 'vanilla-extract-pure',
  'white-wine-cooking', 'red-wine-cooking'
];
for (const id of check) {
  const cnt = db.prepare('SELECT COUNT(*) as cnt FROM current_prices WHERE canonical_ingredient_id = ?').get(id).cnt;
  if (cnt > 0) {
    const best = db.prepare('SELECT MIN(price_cents) as p, price_unit FROM current_prices WHERE canonical_ingredient_id = ?').get(id);
    console.log('  ' + id + ': ' + cnt + ' prices (cheapest: $' + (best.p/100).toFixed(2) + '/' + best.price_unit + ')');
  } else {
    console.log('  ' + id + ': 0 prices (still missing)');
  }
}

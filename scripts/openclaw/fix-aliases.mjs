/**
 * Fix OpenClaw aliases: point to priced canonical IDs instead of USDA IDs.
 * Also add missing common chef ingredients to the catalog.
 * Run on Pi: node fix-aliases.mjs
 */
import { getDb } from './lib/db.mjs';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = getDb();

// ============================
// STEP 1: Create missing canonical ingredients
// ============================
const MISSING_CANONICALS = [
  { id: 'sweet-potato', name: 'Sweet Potato', category: 'produce', unit: 'lb' },
  { id: 'brown-sugar', name: 'Brown Sugar', category: 'pantry', unit: 'lb' },
  { id: 'brown-sugar-light', name: 'Light Brown Sugar', category: 'pantry', unit: 'lb' },
  { id: 'mixed-greens', name: 'Mixed Greens', category: 'produce', unit: 'oz' },
  { id: 'red-pepper-flakes', name: 'Red Pepper Flakes', category: 'spice', unit: 'oz' },
  { id: 'arborio-rice', name: 'Arborio Rice', category: 'pantry', unit: 'lb' },
  { id: 'canned-tomatoes', name: 'Canned Tomatoes', category: 'pantry', unit: 'oz' },
  { id: 'canned-diced-tomatoes', name: 'Canned Diced Tomatoes', category: 'pantry', unit: 'oz' },
  { id: 'pork-tenderloin', name: 'Pork Tenderloin', category: 'protein', unit: 'lb' },
  { id: 'filet-mignon', name: 'Filet Mignon', category: 'protein', unit: 'lb' },
  { id: 'vanilla-extract-pure', name: 'Pure Vanilla Extract', category: 'baking', unit: 'oz' },
  { id: 'dijon-mustard', name: 'Dijon Mustard', category: 'condiment', unit: 'oz' },
  { id: 'balsamic-vinegar', name: 'Balsamic Vinegar', category: 'pantry', unit: 'oz' },
  { id: 'red-wine-vinegar', name: 'Red Wine Vinegar', category: 'pantry', unit: 'oz' },
  { id: 'sesame-oil', name: 'Sesame Oil', category: 'pantry', unit: 'oz' },
  { id: 'worcestershire-sauce', name: 'Worcestershire Sauce', category: 'condiment', unit: 'oz' },
  { id: 'white-wine-cooking', name: 'White Wine', category: 'alcohol', unit: 'oz' },
  { id: 'red-wine-cooking', name: 'Red Wine', category: 'alcohol', unit: 'oz' },
];

const insertCanonical = db.prepare(
  'INSERT OR IGNORE INTO canonical_ingredients (ingredient_id, name, category, standard_unit) VALUES (?, ?, ?, ?)'
);

let addedCanonicals = 0;
for (const item of MISSING_CANONICALS) {
  const result = insertCanonical.run(item.id, item.name, item.category, item.unit);
  if (result.changes > 0) addedCanonicals++;
}
console.log('Added ' + addedCanonicals + ' missing canonical ingredients');

// ============================
// STEP 2: Fix alias mappings in smart-lookup.mjs
// ============================

// Map of alias -> correct priced canonical ID
// These override the existing COMMON_ALIASES entries that point to USDA IDs with 0 prices
const ALIAS_FIXES = {
  // Proteins
  'chicken thigh': 'chicken-thigh-boneless',
  'chicken thighs': 'chicken-thigh-boneless',

  // Produce
  'celery': 'celery',
  'spinach': 'spinach-baby',
  'baby spinach': 'spinach-baby',
  'sweet potato': 'sweet-potato',
  'sweet potatoes': 'sweet-potato',
  'mixed greens': 'mixed-greens',
  'spring mix': 'mixed-greens',
  'salad greens': 'mixed-greens',

  // Spices (were pointing to usda-spices-* with 0 prices)
  'pepper': 'pepper-black-ground',
  'black pepper': 'pepper-black-ground',
  'ground pepper': 'pepper-black-ground',
  'paprika': 'paprika',
  'smoked paprika': 'paprika-smoked',
  'cumin': 'cumin-ground',
  'ground cumin': 'cumin-ground',
  'oregano': 'oregano-dried',
  'dried oregano': 'oregano-dried',
  'thyme': 'thyme-fresh',
  'fresh thyme': 'thyme-fresh',
  'red pepper flakes': 'red-pepper-flakes',
  'crushed red pepper': 'red-pepper-flakes',

  // Condiments/Sauces
  'hot sauce': 'cholula-original-hot-sauce',
  'worcestershire sauce': 'worcestershire-sauce',
  'worcestershire': 'worcestershire-sauce',
  'dijon mustard': 'dijon-mustard',
  'dijon': 'dijon-mustard',

  // Baking
  'baking powder': 'rumford-baking-powder',
  'baking soda': 'arm-hammer-pure-baking-soda',
  'vanilla extract': 'vanilla-extract-pure',
  'vanilla': 'vanilla-extract-pure',

  // Herbs
  'cilantro': 'cilantro',
  'fresh cilantro': 'cilantro',
  'parsley': 'parsley-flat-leaf',
  'fresh parsley': 'parsley-flat-leaf',
  'basil': 'basil-fresh',
  'fresh basil': 'basil-fresh',
  'fresh rosemary': 'rosemary-fresh',

  // Seafood
  'lobster tail': 'lobster-whole',
  'lobster': 'lobster-whole',

  // Pantry
  'brown sugar': 'brown-sugar',
  'light brown sugar': 'brown-sugar-light',
  'arborio rice': 'arborio-rice',
  'risotto rice': 'arborio-rice',
  'canned tomatoes': 'canned-tomatoes',
  'diced tomatoes': 'canned-diced-tomatoes',
  'balsamic vinegar': 'balsamic-vinegar',
  'balsamic': 'balsamic-vinegar',
  'red wine vinegar': 'red-wine-vinegar',
  'sesame oil': 'sesame-oil',

  // Proteins
  'pork tenderloin': 'pork-tenderloin',
  'filet mignon': 'filet-mignon',
  'beef tenderloin': 'filet-mignon',

  // Dairy
  'parmesan cheese': 'cheese-parmesan',
  'parmesan': 'cheese-parmesan',
  'parmigiano reggiano': 'cheese-parmesan',
  'goat cheese': 'cheese-goat',
  'chevre': 'cheese-goat',

  // Alcohol
  'white wine': 'white-wine-cooking',
  'red wine': 'red-wine-cooking',

  // Vegetable oil fix (was usda-oil-vegetable-canola with 0 prices)
  'vegetable oil': 'vegetable-oil',

  // Mayo fix
  'mayonnaise': 'mayonnaise',
  'mayo': 'mayonnaise',
};

// Patch smart-lookup.mjs
const lookupPath = join(__dirname, 'lib', 'smart-lookup.mjs');
let lookupCode = readFileSync(lookupPath, 'utf8');

let patchCount = 0;
let addCount = 0;
const toAdd = [];

for (const [alias, newId] of Object.entries(ALIAS_FIXES)) {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp("'" + escaped + "':\\s*'[^']*'", 'g');

  if (pattern.test(lookupCode)) {
    lookupCode = lookupCode.replace(pattern, "'" + alias + "': '" + newId + "'");
    patchCount++;
  } else {
    toAdd.push("  '" + alias + "': '" + newId + "',");
  }
}

// Add new aliases before the closing of COMMON_ALIASES
if (toAdd.length > 0) {
  const marker = '};';
  const exportIdx = lookupCode.indexOf('export function smartLookup');
  const closeIdx = lookupCode.lastIndexOf(marker, exportIdx);
  if (closeIdx > 0) {
    const block = '\n  // Chef staples (auto-added)\n' + toAdd.join('\n') + '\n';
    lookupCode = lookupCode.slice(0, closeIdx) + block + lookupCode.slice(closeIdx);
    addCount = toAdd.length;
  }
}

writeFileSync(lookupPath, lookupCode);
console.log('Patched ' + patchCount + ' existing aliases, added ' + addCount + ' new aliases');

// ============================
// STEP 3: Update normalization_map
// ============================
const upsertNorm = db.prepare(
  'INSERT OR REPLACE INTO normalization_map (raw_name, canonical_ingredient_id, method, confidence, confirmed) VALUES (?, ?, ?, 1.0, 1)'
);

let normCount = 0;
for (const [alias, canonicalId] of Object.entries(ALIAS_FIXES)) {
  try {
    upsertNorm.run(alias, canonicalId, 'alias_fix');
    normCount++;
  } catch (e) {
    console.log('  Skip norm: ' + alias + ' -> ' + canonicalId + ' (FK missing)');
  }
}
console.log('Updated ' + normCount + ' normalization_map entries');

console.log('\nDone! Restart the API server to pick up smart-lookup.mjs changes.');

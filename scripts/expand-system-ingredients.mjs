#!/usr/bin/env node
/**
 * Expand system_ingredients to 20K canonical food items.
 *
 * Sources from Pi's canonical_ingredients, filtered to food categories,
 * ranked by price coverage (ingredients with more prices = more useful).
 * Deduplicates against existing system_ingredients by name similarity.
 *
 * Then auto-populates all chefs with the new ingredients + aliases.
 */

const TARGET = 20000;

// Food categories from Pi (excludes Household, Personal Care, Kitchen Supplies, Pets, Baby, Health Care)
const FOOD_CATEGORIES = [
  'Produce', 'Protein', 'Dairy', 'Pantry', 'Grains & Bakery', 'Frozen',
  'Beverages', 'Snacks', 'Deli', 'Oils & Spices', 'Condiments & Sauces',
  'Snacks & Candy', 'Baking', 'Baking Essentials', 'Alcohol',
  'Meat & Seafood', 'Prepared Foods', 'Canned Goods & Soups',
  'Dry Goods & Pasta', 'Prepared & Deli', 'Breakfast', 'Oils, Vinegars, & Spices',
  'Dairy & Eggs', 'Meat', 'Seafood', 'Candy', 'International', 'Spices',
  'Condiments', 'usda-terminal', 'flipp-circular',
];

// Category normalization for system_ingredients
// Valid enum: protein, produce, dairy, pantry, spice, oil, alcohol, baking, frozen, canned, fresh_herb, dry_herb, condiment, beverage, specialty, other
function normalizeCategory(piCat) {
  const map = {
    'Produce': 'produce', 'Protein': 'protein', 'Meat & Seafood': 'protein',
    'Meat': 'protein', 'Seafood': 'protein',
    'Dairy': 'dairy', 'Dairy & Eggs': 'dairy',
    'Pantry': 'pantry', 'Canned Goods & Soups': 'canned', 'Dry Goods & Pasta': 'pantry',
    'Grains & Bakery': 'pantry', 'Baking': 'baking', 'Baking Essentials': 'baking',
    'Frozen': 'frozen', 'Beverages': 'beverage', 'Alcohol': 'alcohol',
    'Snacks': 'pantry', 'Snacks & Candy': 'pantry', 'Candy': 'pantry',
    'Deli': 'specialty', 'Prepared Foods': 'specialty', 'Prepared & Deli': 'specialty',
    'Oils & Spices': 'spice', 'Oils, Vinegars, & Spices': 'oil', 'Spices': 'spice',
    'Condiments & Sauces': 'condiment', 'Condiments': 'condiment',
    'Breakfast': 'pantry', 'International': 'specialty',
    'usda-terminal': 'produce', 'flipp-circular': 'other',
  };
  return map[piCat] || 'other';
}

async function main() {
  const { default: postgres } = await import('postgres');
  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);

  // Connect to Pi via SSH tunnel? No - download the data we need via the local SQLite copy
  // Actually, use the Pi's HTTP API or the local .openclaw-temp copy
  const betterSqlite = require('better-sqlite3');
  const piDbPath = process.env.PI_DB || '.openclaw-temp/openclaw-latest.db';

  let piDb;
  try {
    piDb = new betterSqlite(piDbPath, { readonly: true });
  } catch (e) {
    console.error('Cannot open Pi DB at', piDbPath);
    console.error('Run: node scripts/openclaw-pull/pull.mjs first');
    process.exit(1);
  }

  const sql = postgres('postgresql://postgres:postgres@127.0.0.1:54322/postgres');

  // Get existing system_ingredients names (lowercase for dedup)
  const existing = await sql`SELECT id, LOWER(name) as name FROM system_ingredients`;
  const existingNames = new Set(existing.map(r => r.name));
  const existingCount = existing.length;
  console.log(`Existing system_ingredients: ${existingCount}`);

  const toAdd = TARGET - existingCount;
  if (toAdd <= 0) {
    console.log('Already at or above target. Nothing to do.');
    process.exit(0);
  }
  console.log(`Need to add: ${toAdd} ingredients to reach ${TARGET}`);

  // Get food ingredients from Pi, ranked by price count
  const catPlaceholders = FOOD_CATEGORIES.map(() => '?').join(',');
  const piIngredients = piDb.prepare(`
    SELECT ci.ingredient_id, ci.name, ci.category, ci.standard_unit,
           COUNT(cp.id) as price_count
    FROM canonical_ingredients ci
    LEFT JOIN current_prices cp ON cp.canonical_ingredient_id = ci.ingredient_id
    WHERE ci.category IN (${catPlaceholders})
      AND ci.name IS NOT NULL
      AND LENGTH(ci.name) > 1
      AND LENGTH(ci.name) < 100
    GROUP BY ci.ingredient_id
    ORDER BY price_count DESC, ci.name ASC
  `).all(...FOOD_CATEGORIES);

  console.log(`Pi food ingredients: ${piIngredients.length}`);

  // Filter: skip items that match existing names, skip obvious non-food
  const nonFoodPatterns = /ipad|iphone|charger|battery|detergent|shampoo|toothpaste|diaper|toilet|paper towel|trash bag|light bulb|usb|cable|adapter|headphone|speaker|tablet|laptop|printer|phone case|screen protector/i;

  const candidates = [];
  for (const pi of piIngredients) {
    if (candidates.length >= toAdd) break;

    const nameLower = pi.name.toLowerCase().trim();

    // Skip if already exists
    if (existingNames.has(nameLower)) continue;

    // Skip non-food items that slipped through
    if (nonFoodPatterns.test(nameLower)) continue;

    // Skip very generic single-word items less likely to be useful
    // (keep them if they have prices though)
    if (nameLower.split(/\s+/).length === 1 && nameLower.length < 3 && pi.price_count === 0) continue;

    // Dedup: skip if a very similar name exists (first 20 chars match)
    const prefix = nameLower.slice(0, 20);
    if ([...existingNames].some(n => n.startsWith(prefix) && n.length < nameLower.length + 5)) continue;

    existingNames.add(nameLower); // prevent self-duplicates
    candidates.push({
      pi_id: pi.ingredient_id,
      name: pi.name.trim(),
      category: normalizeCategory(pi.category),
      standard_unit: ['g','oz','ml','fl_oz','each','bunch'].includes(pi.standard_unit) ? pi.standard_unit : 'each',
      price_count: pi.price_count,
    });
  }

  console.log(`Candidates after filtering: ${candidates.length}`);

  // Insert into system_ingredients in batches
  const BATCH = 200;
  let inserted = 0;
  const newIds = []; // track for alias creation

  for (let i = 0; i < candidates.length; i += BATCH) {
    const batch = candidates.slice(i, i + BATCH);
    const rows = await sql`
      INSERT INTO system_ingredients ${sql(batch.map(c => ({
        name: c.name,
        category: c.category,
        standard_unit: c.standard_unit,
        is_active: true,
      })), 'name', 'category', 'standard_unit', 'is_active')}
      RETURNING id, name
    `;
    for (const row of rows) {
      newIds.push({ id: row.id, name: row.name });
    }
    inserted += batch.length;
    if (inserted % 2000 === 0) console.log(`  Inserted ${inserted}...`);
  }

  console.log(`Inserted ${inserted} new system_ingredients`);
  const finalCount = (await sql`SELECT COUNT(*) as c FROM system_ingredients`)[0].c;
  console.log(`Total system_ingredients: ${finalCount}`);

  // Now auto-populate all chefs with the new ingredients
  console.log('\nPopulating chefs...');
  const chefs = await sql`SELECT id FROM chefs`;

  for (const chef of chefs) {
    // Get categories from system_ingredients
    const siCats = await sql`SELECT id, category FROM system_ingredients WHERE id = ANY(${newIds.map(s => s.id)})`;
    const catMap = new Map(siCats.map(r => [r.id, r.category]));

    const values = newIds.map(si => ({
      tenant_id: chef.id,
      name: si.name,
      category: catMap.get(si.id) || 'other',
      default_unit: 'each',
      system_ingredient_id: si.id,
      is_staple: false,
      archived: false,
    }));

    // Insert in batches
    let chefInserted = 0;
    for (let i = 0; i < values.length; i += BATCH) {
      const batch = values.slice(i, i + BATCH);
      await sql`INSERT INTO ingredients ${sql(batch,
        'tenant_id', 'name', 'category', 'default_unit', 'system_ingredient_id', 'is_staple', 'archived'
      )}`;

      // Also create aliases
      const ingredientRows = await sql`
        SELECT id, system_ingredient_id FROM ingredients
        WHERE tenant_id = ${chef.id}
          AND system_ingredient_id = ANY(${batch.map(b => b.system_ingredient_id)})
      `;
      if (ingredientRows.length > 0) {
        await sql`INSERT INTO ingredient_aliases ${sql(ingredientRows.map(r => ({
          tenant_id: chef.id,
          ingredient_id: r.id,
          system_ingredient_id: r.system_ingredient_id,
          match_method: 'exact',
          similarity_score: 1.0,
        })), 'tenant_id', 'ingredient_id', 'system_ingredient_id', 'match_method', 'similarity_score')}`;
      }

      chefInserted += batch.length;
    }
    console.log(`  ${chef.id.slice(0,8)}: +${chefInserted} ingredients + aliases`);
  }

  // Final stats
  const totalIngredients = (await sql`SELECT COUNT(*) as c FROM ingredients`)[0].c;
  const totalAliases = (await sql`SELECT COUNT(*) as c FROM ingredient_aliases`)[0].c;
  console.log(`\n=== FINAL STATE ===`);
  console.log(`system_ingredients: ${finalCount}`);
  console.log(`Total chef ingredients: ${totalIngredients}`);
  console.log(`Total aliases: ${totalAliases}`);

  piDb.close();
  await sql.end();
}

main().catch(err => { console.error(err); process.exit(1); });

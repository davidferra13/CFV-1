/**
 * Waste Factor Import Script
 * Seeds ingredient_waste_factors with USDA yield percentages
 * and industry-standard prep yields.
 *
 * Usage: node scripts/import-waste-factors.mjs
 */

import postgres from 'postgres'

const CONNECTION = process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

function createClient() {
  return postgres(CONNECTION, { max: 1 })
}

// Industry-standard waste/yield factors
// as_purchased_to_edible_pct: what % of the purchased weight is usable
// cooked_yield_pct: what % of edible weight remains after cooking
const WASTE_FACTORS = [
  // --- Produce ---
  { name: 'lettuce', edible: 74, waste: 'core, outer leaves', prep: 'raw trimmed', cooked: null },
  { name: 'iceberg lettuce', edible: 74, waste: 'core, outer leaves', prep: 'raw trimmed', cooked: null },
  { name: 'romaine lettuce', edible: 80, waste: 'core, outer leaves', prep: 'raw trimmed', cooked: null },
  { name: 'onion', edible: 90, waste: 'skin, root end', prep: 'peeled', cooked: 88 },
  { name: 'carrot', edible: 82, waste: 'peel, ends', prep: 'peeled', cooked: 90 },
  { name: 'potato', edible: 81, waste: 'peel, eyes', prep: 'peeled', cooked: 85 },
  { name: 'sweet potato', edible: 80, waste: 'peel', prep: 'peeled', cooked: 85 },
  { name: 'broccoli', edible: 61, waste: 'stems, leaves', prep: 'florets only', cooked: 90 },
  { name: 'cauliflower', edible: 61, waste: 'leaves, core', prep: 'florets only', cooked: 90 },
  { name: 'celery', edible: 75, waste: 'leaves, base', prep: 'trimmed', cooked: 90 },
  { name: 'bell pepper', edible: 82, waste: 'seeds, stem, ribs', prep: 'seeded', cooked: 90 },
  { name: 'red pepper', edible: 82, waste: 'seeds, stem, ribs', prep: 'seeded', cooked: 90 },
  { name: 'green pepper', edible: 82, waste: 'seeds, stem, ribs', prep: 'seeded', cooked: 90 },
  { name: 'avocado', edible: 65, waste: 'skin, pit', prep: 'peeled and pitted', cooked: null },
  { name: 'pineapple', edible: 52, waste: 'skin, core, crown', prep: 'peeled and cored', cooked: null },
  { name: 'watermelon', edible: 52, waste: 'rind', prep: 'rind removed', cooked: null },
  { name: 'cantaloupe', edible: 52, waste: 'rind, seeds', prep: 'peeled and seeded', cooked: null },
  { name: 'honeydew', edible: 50, waste: 'rind, seeds', prep: 'peeled and seeded', cooked: null },
  { name: 'mango', edible: 65, waste: 'skin, pit', prep: 'peeled and pitted', cooked: null },
  { name: 'peach', edible: 91, waste: 'pit, skin', prep: 'peeled and pitted', cooked: null },
  { name: 'apple', edible: 91, waste: 'core, seeds', prep: 'cored', cooked: 85 },
  { name: 'banana', edible: 65, waste: 'peel', prep: 'peeled', cooked: null },
  { name: 'orange', edible: 73, waste: 'peel, pith, seeds', prep: 'peeled and segmented', cooked: null },
  { name: 'grapefruit', edible: 50, waste: 'peel, pith, seeds, membranes', prep: 'peeled and segmented', cooked: null },
  { name: 'lemon', edible: 43, waste: 'peel, pith, seeds', prep: 'juiced', cooked: null },
  { name: 'lime', edible: 43, waste: 'peel, pith, seeds', prep: 'juiced', cooked: null },
  { name: 'corn', edible: 55, waste: 'husk, silk, cob', prep: 'kernels cut', cooked: 95 },
  { name: 'asparagus', edible: 67, waste: 'woody ends', prep: 'trimmed', cooked: 90 },
  { name: 'artichoke', edible: 40, waste: 'outer leaves, choke, stem', prep: 'trimmed to heart', cooked: 85 },
  { name: 'cabbage', edible: 80, waste: 'outer leaves, core', prep: 'cored', cooked: 85 },
  { name: 'spinach', edible: 72, waste: 'stems, damaged leaves', prep: 'trimmed', cooked: 70 },
  { name: 'kale', edible: 67, waste: 'stems', prep: 'stems removed', cooked: 70 },
  { name: 'green beans', edible: 88, waste: 'ends', prep: 'trimmed', cooked: 90 },
  { name: 'mushroom', edible: 97, waste: 'stem base', prep: 'trimmed', cooked: 70 },
  { name: 'eggplant', edible: 81, waste: 'stem, cap', prep: 'trimmed', cooked: 75 },
  { name: 'cucumber', edible: 97, waste: 'ends', prep: 'trimmed', cooked: null },
  { name: 'tomato', edible: 91, waste: 'core', prep: 'cored', cooked: 85 },
  { name: 'garlic', edible: 87, waste: 'skin, root', prep: 'peeled', cooked: 95 },
  { name: 'ginger', edible: 85, waste: 'skin', prep: 'peeled', cooked: 95 },
  { name: 'beet', edible: 76, waste: 'skin, greens, root', prep: 'peeled', cooked: 85 },
  { name: 'turnip', edible: 81, waste: 'peel, root end', prep: 'peeled', cooked: 85 },
  { name: 'parsnip', edible: 83, waste: 'peel, core', prep: 'peeled', cooked: 85 },
  { name: 'radish', edible: 90, waste: 'greens, root', prep: 'trimmed', cooked: null },
  { name: 'leek', edible: 52, waste: 'dark green top, root', prep: 'trimmed, white and light green only', cooked: 85 },
  { name: 'fennel', edible: 64, waste: 'stalks, fronds, core', prep: 'trimmed', cooked: 85 },

  // --- Proteins ---
  { name: 'chicken breast', edible: 100, waste: 'none (boneless)', prep: 'boneless skinless', cooked: 75 },
  { name: 'chicken breast bone-in', edible: 72, waste: 'bone, skin', prep: 'bone-in', cooked: 75 },
  { name: 'chicken thigh', edible: 85, waste: 'bone (if bone-in)', prep: 'boneless', cooked: 75 },
  { name: 'whole chicken', edible: 53, waste: 'bones, giblets, neck', prep: 'whole roasted', cooked: 75 },
  { name: 'chicken wing', edible: 49, waste: 'bones', prep: 'whole wing', cooked: 80 },
  { name: 'duck breast', edible: 85, waste: 'skin (optional), silverskin', prep: 'trimmed', cooked: 70 },
  { name: 'whole duck', edible: 43, waste: 'bones, giblets, excess fat', prep: 'whole', cooked: 60 },
  { name: 'beef tenderloin', edible: 80, waste: 'silverskin, chain, fat', prep: 'trimmed', cooked: 75 },
  { name: 'beef ribeye', edible: 90, waste: 'fat cap (partial)', prep: 'trimmed', cooked: 75 },
  { name: 'beef sirloin', edible: 85, waste: 'fat, silverskin', prep: 'trimmed', cooked: 75 },
  { name: 'ground beef', edible: 100, waste: 'none', prep: 'as purchased', cooked: 75 },
  { name: 'beef short ribs', edible: 55, waste: 'bones, connective tissue', prep: 'bone-in', cooked: 65 },
  { name: 'lamb rack', edible: 60, waste: 'bones, fat cap', prep: 'frenched', cooked: 75 },
  { name: 'lamb leg', edible: 73, waste: 'bone, fat', prep: 'bone-in', cooked: 75 },
  { name: 'pork loin', edible: 90, waste: 'fat cap, silverskin', prep: 'trimmed', cooked: 75 },
  { name: 'pork tenderloin', edible: 92, waste: 'silverskin', prep: 'trimmed', cooked: 80 },
  { name: 'pork belly', edible: 95, waste: 'skin (optional)', prep: 'skin removed', cooked: 60 },
  { name: 'pork shoulder', edible: 65, waste: 'bone, fat, skin', prep: 'bone-in', cooked: 55 },
  { name: 'baby back ribs', edible: 50, waste: 'bones, membrane', prep: 'membrane removed', cooked: 65 },
  { name: 'salmon', edible: 95, waste: 'pin bones', prep: 'fillet', cooked: 85 },
  { name: 'whole salmon', edible: 50, waste: 'head, bones, skin, fins', prep: 'filleted', cooked: 85 },
  { name: 'tuna', edible: 98, waste: 'bloodline', prep: 'loin trimmed', cooked: 90 },
  { name: 'cod', edible: 95, waste: 'pin bones', prep: 'fillet', cooked: 80 },
  { name: 'halibut', edible: 95, waste: 'skin (optional)', prep: 'fillet', cooked: 85 },
  { name: 'whole fish', edible: 45, waste: 'head, bones, skin, fins, entrails', prep: 'filleted', cooked: 85 },
  { name: 'shrimp', edible: 55, waste: 'shell, head, vein', prep: 'shell-on', cooked: 85 },
  { name: 'shrimp peeled', edible: 95, waste: 'tail (optional)', prep: 'peeled deveined', cooked: 85 },
  { name: 'lobster', edible: 33, waste: 'shell, head, tomalley', prep: 'whole', cooked: 90 },
  { name: 'crab', edible: 25, waste: 'shell, body', prep: 'whole', cooked: 90 },
  { name: 'scallops', edible: 90, waste: 'muscle foot', prep: 'cleaned', cooked: 85 },
  { name: 'mussels', edible: 25, waste: 'shell, beard', prep: 'cleaned', cooked: 90 },
  { name: 'clams', edible: 20, waste: 'shell', prep: 'cleaned', cooked: 90 },
  { name: 'octopus', edible: 70, waste: 'beak, head contents', prep: 'cleaned', cooked: 50 },
  { name: 'squid', edible: 65, waste: 'head, beak, quill, skin', prep: 'cleaned', cooked: 70 },

  // --- Herbs ---
  { name: 'basil', edible: 80, waste: 'stems', prep: 'leaves only', cooked: null },
  { name: 'cilantro', edible: 65, waste: 'stems, roots', prep: 'leaves and tender stems', cooked: null },
  { name: 'parsley', edible: 70, waste: 'thick stems', prep: 'leaves and tender stems', cooked: null },
  { name: 'rosemary', edible: 55, waste: 'woody stems', prep: 'leaves stripped', cooked: null },
  { name: 'thyme', edible: 45, waste: 'woody stems', prep: 'leaves stripped', cooked: null },
  { name: 'dill', edible: 70, waste: 'thick stems', prep: 'fronds', cooked: null },
  { name: 'mint', edible: 70, waste: 'stems', prep: 'leaves only', cooked: null },
  { name: 'chive', edible: 95, waste: 'root end', prep: 'trimmed', cooked: null },
  { name: 'tarragon', edible: 55, waste: 'stems', prep: 'leaves stripped', cooked: null },
  { name: 'sage', edible: 70, waste: 'stems', prep: 'leaves only', cooked: null },
]

async function main() {
  const sql = createClient()

  console.log('Starting waste factor import...')

  // Get system_ingredients for matching
  const systemIngredients = await sql`
    SELECT id, name FROM system_ingredients
  `
  const ingredientMap = new Map()
  for (const si of systemIngredients) {
    ingredientMap.set(si.name.toLowerCase(), si.id)
  }

  console.log(`Found ${ingredientMap.size} system ingredients for matching`)

  let inserted = 0
  let matched = 0

  for (const item of WASTE_FACTORS) {
    const systemId = ingredientMap.get(item.name.toLowerCase()) || null
    if (systemId) matched++

    await sql`
      INSERT INTO ingredient_waste_factors (
        system_ingredient_id, ingredient_name,
        as_purchased_to_edible_pct, waste_type,
        prep_method, cooked_yield_pct, source
      ) VALUES (
        ${systemId}, ${item.name},
        ${item.edible}, ${item.waste},
        ${item.prep}, ${item.cooked}, 'usda_yields'
      )
      ON CONFLICT (system_ingredient_id, prep_method)
        WHERE system_ingredient_id IS NOT NULL
      DO UPDATE SET
        as_purchased_to_edible_pct = EXCLUDED.as_purchased_to_edible_pct,
        waste_type = EXCLUDED.waste_type,
        cooked_yield_pct = EXCLUDED.cooked_yield_pct,
        updated_at = now()
    `
    inserted++
  }

  const count = await sql`SELECT count(*) as c FROM ingredient_waste_factors`
  console.log(`\nImport complete:`)
  console.log(`  Total records: ${count[0].c}`)
  console.log(`  Inserted/updated: ${inserted}`)
  console.log(`  Matched to system ingredients: ${matched}`)

  await sql.end()
}

main().catch(err => {
  console.error('Import failed:', err)
  process.exit(1)
})

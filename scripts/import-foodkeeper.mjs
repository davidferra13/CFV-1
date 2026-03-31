/**
 * FoodKeeper Shelf Life Import Script
 * Downloads USDA FoodKeeper data and imports shelf life information
 * into the ingredient_shelf_life table.
 *
 * Usage: node scripts/import-foodkeeper.mjs
 */

import postgres from 'postgres'
import fs from 'fs'
import path from 'path'

const CONNECTION = process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

function createClient() {
  return postgres(CONNECTION, { max: 1 })
}

const CACHE_PATH = path.join(process.cwd(), 'scripts/data/foodkeeper-cache.json')
const FOODKEEPER_URL = 'https://foodkeeper-api.herokuapp.com/foodkeeper/products'

async function fetchFoodKeeperData() {
  // Use cached data if available (rarely changes)
  if (fs.existsSync(CACHE_PATH)) {
    console.log('Using cached FoodKeeper data')
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'))
  }

  console.log('Downloading FoodKeeper data from USDA...')
  try {
    const res = await fetch(FOODKEEPER_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true })
    fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2))
    console.log(`Cached ${Array.isArray(data) ? data.length : 'unknown'} items`)
    return data
  } catch (err) {
    console.error('Failed to download FoodKeeper data:', err.message)
    console.log('Falling back to built-in shelf life data...')
    return null
  }
}

function parseDays(val) {
  if (val == null || val === '') return null
  const n = parseInt(val)
  if (isNaN(n)) return null
  return n
}

// Built-in shelf life data for common ingredients (USDA FoodKeeper reference)
const BUILTIN_SHELF_LIFE = [
  // Produce
  { name: 'apple', category: 'fruit', fridge_min: 21, fridge_max: 28, freezer_min: 240, freezer_max: 360, pantry_min: 5, pantry_max: 7, tips: 'Store in crisper drawer, away from ethylene-sensitive produce' },
  { name: 'avocado', category: 'fruit', fridge_min: 3, fridge_max: 5, freezer_min: 90, freezer_max: 180, pantry_min: 3, pantry_max: 5, tips: 'Refrigerate once ripe. Sprinkle cut surface with lemon juice' },
  { name: 'banana', category: 'fruit', fridge_min: 5, fridge_max: 7, freezer_min: 60, freezer_max: 90, pantry_min: 2, pantry_max: 5, tips: 'Peel darkens in fridge but fruit stays fresh' },
  { name: 'bell pepper', category: 'vegetable', fridge_min: 7, fridge_max: 14, freezer_min: 180, freezer_max: 360, pantry_min: null, pantry_max: null, tips: 'Store unwashed in crisper' },
  { name: 'berries', category: 'fruit', fridge_min: 3, fridge_max: 7, freezer_min: 240, freezer_max: 360, pantry_min: null, pantry_max: null, tips: 'Do not wash until ready to use' },
  { name: 'blueberry', category: 'fruit', fridge_min: 5, fridge_max: 10, freezer_min: 240, freezer_max: 360, pantry_min: null, pantry_max: null, tips: 'Store in single layer if possible' },
  { name: 'broccoli', category: 'vegetable', fridge_min: 3, fridge_max: 5, freezer_min: 300, freezer_max: 360, pantry_min: null, pantry_max: null, tips: 'Store in loose plastic bag in crisper' },
  { name: 'cabbage', category: 'vegetable', fridge_min: 7, fridge_max: 14, freezer_min: 300, freezer_max: 360, pantry_min: null, pantry_max: null, tips: 'Wrap tightly in plastic wrap' },
  { name: 'carrot', category: 'vegetable', fridge_min: 14, fridge_max: 21, freezer_min: 300, freezer_max: 360, pantry_min: null, pantry_max: null, tips: 'Remove green tops before storing' },
  { name: 'cauliflower', category: 'vegetable', fridge_min: 3, fridge_max: 7, freezer_min: 300, freezer_max: 360, pantry_min: null, pantry_max: null, tips: 'Store stem-side up in loose plastic' },
  { name: 'celery', category: 'vegetable', fridge_min: 7, fridge_max: 14, freezer_min: 300, freezer_max: 360, pantry_min: null, pantry_max: null, tips: 'Wrap in aluminum foil for crispness' },
  { name: 'corn', category: 'vegetable', fridge_min: 1, fridge_max: 3, freezer_min: 240, freezer_max: 360, pantry_min: null, pantry_max: null, tips: 'Best eaten day of purchase. Keep husks on' },
  { name: 'cucumber', category: 'vegetable', fridge_min: 5, fridge_max: 7, freezer_min: null, freezer_max: null, pantry_min: null, pantry_max: null, tips: 'Wrap in paper towel and store in bag' },
  { name: 'garlic', category: 'vegetable', fridge_min: null, fridge_max: null, freezer_min: null, freezer_max: null, pantry_min: 90, pantry_max: 180, tips: 'Store in cool, dark, dry place with ventilation' },
  { name: 'ginger', category: 'vegetable', fridge_min: 21, fridge_max: 28, freezer_min: 90, freezer_max: 180, pantry_min: null, pantry_max: null, tips: 'Wrap in paper towel, then plastic bag' },
  { name: 'green beans', category: 'vegetable', fridge_min: 3, fridge_max: 5, freezer_min: 240, freezer_max: 360, pantry_min: null, pantry_max: null, tips: 'Store unwashed in plastic bag' },
  { name: 'lemon', category: 'fruit', fridge_min: 21, fridge_max: 28, freezer_min: 90, freezer_max: 120, pantry_min: 7, pantry_max: 14, tips: 'Juice and zest can be frozen separately' },
  { name: 'lettuce', category: 'vegetable', fridge_min: 3, fridge_max: 7, freezer_min: null, freezer_max: null, pantry_min: null, pantry_max: null, tips: 'Wrap in damp paper towel, store in bag' },
  { name: 'lime', category: 'fruit', fridge_min: 14, fridge_max: 21, freezer_min: 90, freezer_max: 120, pantry_min: 5, pantry_max: 7, tips: 'Same storage as lemons' },
  { name: 'mushroom', category: 'vegetable', fridge_min: 4, fridge_max: 7, freezer_min: 300, freezer_max: 360, pantry_min: null, pantry_max: null, tips: 'Store in paper bag, never plastic' },
  { name: 'onion', category: 'vegetable', fridge_min: null, fridge_max: null, freezer_min: 90, freezer_max: 180, pantry_min: 30, pantry_max: 90, tips: 'Store in cool, dark, dry place with ventilation. Once cut, refrigerate' },
  { name: 'orange', category: 'fruit', fridge_min: 21, fridge_max: 28, freezer_min: 90, freezer_max: 120, pantry_min: 7, pantry_max: 14, tips: 'Keep in mesh bag in crisper' },
  { name: 'pineapple', category: 'fruit', fridge_min: 3, fridge_max: 5, freezer_min: 180, freezer_max: 360, pantry_min: 1, pantry_max: 2, tips: 'Cut pineapple should be stored in juice in airtight container' },
  { name: 'potato', category: 'vegetable', fridge_min: null, fridge_max: null, freezer_min: 300, freezer_max: 360, pantry_min: 21, pantry_max: 35, tips: 'Store in cool (45-50F), dark, ventilated space. Never refrigerate raw' },
  { name: 'spinach', category: 'vegetable', fridge_min: 3, fridge_max: 5, freezer_min: 300, freezer_max: 360, pantry_min: null, pantry_max: null, tips: 'Store in dry paper towel-lined container' },
  { name: 'strawberry', category: 'fruit', fridge_min: 3, fridge_max: 7, freezer_min: 240, freezer_max: 360, pantry_min: null, pantry_max: null, tips: 'Do not wash or hull until ready to eat' },
  { name: 'sweet potato', category: 'vegetable', fridge_min: null, fridge_max: null, freezer_min: 300, freezer_max: 360, pantry_min: 21, pantry_max: 35, tips: 'Store like regular potatoes. Do not refrigerate' },
  { name: 'tomato', category: 'vegetable', fridge_min: 5, fridge_max: 7, freezer_min: 60, freezer_max: 90, pantry_min: 3, pantry_max: 5, tips: 'Store stem-side down at room temp until ripe, then refrigerate' },
  { name: 'watermelon', category: 'fruit', fridge_min: 7, fridge_max: 14, freezer_min: null, freezer_max: null, pantry_min: 7, pantry_max: 14, tips: 'Whole at room temp. Cut should be wrapped and refrigerated' },
  { name: 'zucchini', category: 'vegetable', fridge_min: 4, fridge_max: 5, freezer_min: 240, freezer_max: 360, pantry_min: null, pantry_max: null, tips: 'Store unwashed in crisper drawer' },

  // Proteins
  { name: 'chicken breast', category: 'poultry', fridge_min: 1, fridge_max: 2, freezer_min: 270, freezer_max: 360, pantry_min: null, pantry_max: null, tips: 'Store on lowest shelf to prevent drips' },
  { name: 'chicken thigh', category: 'poultry', fridge_min: 1, fridge_max: 2, freezer_min: 270, freezer_max: 360, pantry_min: null, pantry_max: null, tips: 'Same as chicken breast' },
  { name: 'whole chicken', category: 'poultry', fridge_min: 1, fridge_max: 2, freezer_min: 360, freezer_max: 360, pantry_min: null, pantry_max: null, tips: 'Remove giblets before storing' },
  { name: 'ground beef', category: 'meat', fridge_min: 1, fridge_max: 2, freezer_min: 90, freezer_max: 120, pantry_min: null, pantry_max: null, tips: 'Use or freeze within 2 days of purchase' },
  { name: 'beef steak', category: 'meat', fridge_min: 3, fridge_max: 5, freezer_min: 180, freezer_max: 360, pantry_min: null, pantry_max: null, tips: 'Pat dry before storing' },
  { name: 'beef tenderloin', category: 'meat', fridge_min: 3, fridge_max: 5, freezer_min: 180, freezer_max: 360, pantry_min: null, pantry_max: null, tips: 'Wrap tightly in plastic, then foil' },
  { name: 'pork chop', category: 'meat', fridge_min: 3, fridge_max: 5, freezer_min: 120, freezer_max: 180, pantry_min: null, pantry_max: null, tips: 'Store in original packaging or rewrap tightly' },
  { name: 'pork tenderloin', category: 'meat', fridge_min: 3, fridge_max: 5, freezer_min: 120, freezer_max: 180, pantry_min: null, pantry_max: null, tips: 'Vacuum seal for best freezer results' },
  { name: 'bacon', category: 'meat', fridge_min: 7, fridge_max: 7, freezer_min: 30, freezer_max: 30, pantry_min: null, pantry_max: null, tips: 'Once opened, use within 7 days', after_opening: 7 },
  { name: 'salmon', category: 'fish', fridge_min: 1, fridge_max: 2, freezer_min: 60, freezer_max: 90, pantry_min: null, pantry_max: null, tips: 'Store on ice in fridge if possible' },
  { name: 'shrimp', category: 'shellfish', fridge_min: 1, fridge_max: 2, freezer_min: 90, freezer_max: 180, pantry_min: null, pantry_max: null, tips: 'Keep in coldest part of fridge' },
  { name: 'tuna', category: 'fish', fridge_min: 1, fridge_max: 2, freezer_min: 60, freezer_max: 90, pantry_min: null, pantry_max: null, tips: 'Same storage as salmon' },
  { name: 'cod', category: 'fish', fridge_min: 1, fridge_max: 2, freezer_min: 180, freezer_max: 240, pantry_min: null, pantry_max: null, tips: 'Wrap in damp paper towel, then plastic' },
  { name: 'scallops', category: 'shellfish', fridge_min: 1, fridge_max: 2, freezer_min: 90, freezer_max: 180, pantry_min: null, pantry_max: null, tips: 'Pat dry before storing' },

  // Dairy
  { name: 'milk', category: 'dairy', fridge_min: 5, fridge_max: 7, freezer_min: 90, freezer_max: 90, pantry_min: null, pantry_max: null, tips: 'Store on middle shelf, not door', after_opening: 7 },
  { name: 'butter', category: 'dairy', fridge_min: 30, fridge_max: 90, freezer_min: 180, freezer_max: 270, pantry_min: null, pantry_max: null, tips: 'Wrap well to prevent flavor absorption' },
  { name: 'heavy cream', category: 'dairy', fridge_min: 5, fridge_max: 7, freezer_min: 30, freezer_max: 60, pantry_min: null, pantry_max: null, tips: 'Texture may change after freezing' },
  { name: 'cream cheese', category: 'dairy', fridge_min: 14, fridge_max: 14, freezer_min: 60, freezer_max: 60, pantry_min: null, pantry_max: null, tips: 'Wrap opened portion tightly', after_opening: 10 },
  { name: 'cheddar cheese', category: 'dairy', fridge_min: 21, fridge_max: 28, freezer_min: 180, freezer_max: 240, pantry_min: null, pantry_max: null, tips: 'Wrap in wax paper, then plastic' },
  { name: 'parmesan cheese', category: 'dairy', fridge_min: 30, fridge_max: 60, freezer_min: 180, freezer_max: 360, pantry_min: null, pantry_max: null, tips: 'Wrap in parchment, then foil' },
  { name: 'mozzarella', category: 'dairy', fridge_min: 7, fridge_max: 14, freezer_min: 180, freezer_max: 240, pantry_min: null, pantry_max: null, tips: 'Store fresh mozzarella in brine' },
  { name: 'eggs', category: 'dairy', fridge_min: 21, fridge_max: 35, freezer_min: 360, freezer_max: 360, pantry_min: null, pantry_max: null, tips: 'Keep in carton on middle shelf' },
  { name: 'yogurt', category: 'dairy', fridge_min: 7, fridge_max: 14, freezer_min: 30, freezer_max: 60, pantry_min: null, pantry_max: null, tips: 'Keep sealed. Stir if liquid separates' },
  { name: 'sour cream', category: 'dairy', fridge_min: 14, fridge_max: 21, freezer_min: null, freezer_max: null, pantry_min: null, pantry_max: null, tips: 'Do not freeze (texture changes)', after_opening: 14 },

  // Pantry
  { name: 'flour', category: 'pantry', fridge_min: null, fridge_max: null, freezer_min: 360, freezer_max: 720, pantry_min: 180, pantry_max: 240, tips: 'Store in airtight container' },
  { name: 'sugar', category: 'pantry', fridge_min: null, fridge_max: null, freezer_min: null, freezer_max: null, pantry_min: 730, pantry_max: 730, tips: 'Indefinite if kept dry. Store in airtight container' },
  { name: 'brown sugar', category: 'pantry', fridge_min: null, fridge_max: null, freezer_min: null, freezer_max: null, pantry_min: 120, pantry_max: 180, tips: 'Store with a marshmallow or bread slice to keep soft' },
  { name: 'rice', category: 'pantry', fridge_min: null, fridge_max: null, freezer_min: null, freezer_max: null, pantry_min: 365, pantry_max: 730, tips: 'White rice lasts longer than brown rice. Airtight container' },
  { name: 'pasta', category: 'pantry', fridge_min: null, fridge_max: null, freezer_min: null, freezer_max: null, pantry_min: 365, pantry_max: 730, tips: 'Store in cool, dry place in original or airtight container' },
  { name: 'olive oil', category: 'pantry', fridge_min: null, fridge_max: null, freezer_min: null, freezer_max: null, pantry_min: 180, pantry_max: 365, tips: 'Keep away from heat and light. Dark bottles preferred' },
  { name: 'vegetable oil', category: 'pantry', fridge_min: null, fridge_max: null, freezer_min: null, freezer_max: null, pantry_min: 180, pantry_max: 365, tips: 'Store in cool, dark place' },
  { name: 'salt', category: 'pantry', fridge_min: null, fridge_max: null, freezer_min: null, freezer_max: null, pantry_min: 1825, pantry_max: 1825, tips: 'Indefinite shelf life if kept dry' },
  { name: 'black pepper', category: 'pantry', fridge_min: null, fridge_max: null, freezer_min: null, freezer_max: null, pantry_min: 365, pantry_max: 1095, tips: 'Whole peppercorns last longer than ground' },
  { name: 'honey', category: 'pantry', fridge_min: null, fridge_max: null, freezer_min: null, freezer_max: null, pantry_min: 730, pantry_max: 730, tips: 'Never expires if stored properly. Warm gently if crystallized' },
  { name: 'soy sauce', category: 'pantry', fridge_min: null, fridge_max: null, freezer_min: null, freezer_max: null, pantry_min: 730, pantry_max: 1095, tips: 'Refrigerate after opening for best quality' },
  { name: 'vinegar', category: 'pantry', fridge_min: null, fridge_max: null, freezer_min: null, freezer_max: null, pantry_min: 730, pantry_max: 730, tips: 'Virtually indefinite. Store in cool dark place' },
  { name: 'canned tomatoes', category: 'pantry', fridge_min: 5, fridge_max: 7, freezer_min: null, freezer_max: null, pantry_min: 365, pantry_max: 540, tips: 'Once opened, transfer to non-metal container and refrigerate' },
  { name: 'bread', category: 'bakery', fridge_min: null, fridge_max: null, freezer_min: 90, freezer_max: 180, pantry_min: 5, pantry_max: 7, tips: 'Do not refrigerate (stales faster). Freeze for long-term' },

  // Herbs
  { name: 'basil', category: 'herb', fridge_min: 5, fridge_max: 7, freezer_min: 90, freezer_max: 180, pantry_min: null, pantry_max: null, tips: 'Store stems in water on counter, or wrap loosely in damp paper towel' },
  { name: 'cilantro', category: 'herb', fridge_min: 7, fridge_max: 10, freezer_min: 90, freezer_max: 180, pantry_min: null, pantry_max: null, tips: 'Store stems in jar of water, cover loosely with plastic' },
  { name: 'parsley', category: 'herb', fridge_min: 7, fridge_max: 14, freezer_min: 90, freezer_max: 180, pantry_min: null, pantry_max: null, tips: 'Same as cilantro. Keeps longer than most herbs' },
  { name: 'rosemary', category: 'herb', fridge_min: 10, fridge_max: 14, freezer_min: 90, freezer_max: 180, pantry_min: null, pantry_max: null, tips: 'Wrap in damp paper towel, then in bag' },
  { name: 'thyme', category: 'herb', fridge_min: 7, fridge_max: 14, freezer_min: 90, freezer_max: 180, pantry_min: null, pantry_max: null, tips: 'Same storage as rosemary' },
]

async function main() {
  const sql = createClient()

  console.log('Starting FoodKeeper shelf life import...')

  // Try API first, fall back to built-in data
  const apiData = await fetchFoodKeeperData()

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

  // Import from API data if available
  if (apiData && Array.isArray(apiData)) {
    for (const item of apiData) {
      const name = item.name || item.Name
      if (!name) continue

      const category = item.category || item.Category || null
      const systemId = ingredientMap.get(name.toLowerCase()) || null
      if (systemId) matched++

      await sql`
        INSERT INTO ingredient_shelf_life (
          system_ingredient_id, ingredient_name, category,
          pantry_days_min, pantry_days_max,
          fridge_days_min, fridge_days_max,
          freezer_days_min, freezer_days_max,
          storage_tips, source
        ) VALUES (
          ${systemId}, ${name}, ${category},
          ${parseDays(item.pantryMin)}, ${parseDays(item.pantryMax)},
          ${parseDays(item.fridgeMin)}, ${parseDays(item.fridgeMax)},
          ${parseDays(item.freezerMin)}, ${parseDays(item.freezerMax)},
          ${item.tips || null}, 'usda_foodkeeper'
        )
        ON CONFLICT (system_ingredient_id) WHERE system_ingredient_id IS NOT NULL
        DO UPDATE SET
          ingredient_name = EXCLUDED.ingredient_name,
          category = EXCLUDED.category,
          pantry_days_min = EXCLUDED.pantry_days_min,
          pantry_days_max = EXCLUDED.pantry_days_max,
          fridge_days_min = EXCLUDED.fridge_days_min,
          fridge_days_max = EXCLUDED.fridge_days_max,
          freezer_days_min = EXCLUDED.freezer_days_min,
          freezer_days_max = EXCLUDED.freezer_days_max,
          storage_tips = EXCLUDED.storage_tips,
          updated_at = now()
      `
      inserted++
    }
  }

  // Always import built-in data (fills gaps)
  console.log('Importing built-in shelf life data...')
  for (const item of BUILTIN_SHELF_LIFE) {
    const systemId = ingredientMap.get(item.name.toLowerCase()) || null
    if (systemId) matched++

    await sql`
      INSERT INTO ingredient_shelf_life (
        system_ingredient_id, ingredient_name, category,
        pantry_days_min, pantry_days_max,
        fridge_days_min, fridge_days_max,
        freezer_days_min, freezer_days_max,
        storage_tips, after_opening_days, source
      ) VALUES (
        ${systemId}, ${item.name}, ${item.category},
        ${item.pantry_min}, ${item.pantry_max},
        ${item.fridge_min}, ${item.fridge_max},
        ${item.freezer_min}, ${item.freezer_max},
        ${item.tips || null}, ${item.after_opening || null}, 'usda_foodkeeper'
      )
      ON CONFLICT (system_ingredient_id) WHERE system_ingredient_id IS NOT NULL
      DO UPDATE SET
        category = EXCLUDED.category,
        pantry_days_min = COALESCE(EXCLUDED.pantry_days_min, ingredient_shelf_life.pantry_days_min),
        pantry_days_max = COALESCE(EXCLUDED.pantry_days_max, ingredient_shelf_life.pantry_days_max),
        fridge_days_min = COALESCE(EXCLUDED.fridge_days_min, ingredient_shelf_life.fridge_days_min),
        fridge_days_max = COALESCE(EXCLUDED.fridge_days_max, ingredient_shelf_life.fridge_days_max),
        freezer_days_min = COALESCE(EXCLUDED.freezer_days_min, ingredient_shelf_life.freezer_days_min),
        freezer_days_max = COALESCE(EXCLUDED.freezer_days_max, ingredient_shelf_life.freezer_days_max),
        storage_tips = COALESCE(EXCLUDED.storage_tips, ingredient_shelf_life.storage_tips),
        after_opening_days = COALESCE(EXCLUDED.after_opening_days, ingredient_shelf_life.after_opening_days),
        updated_at = now()
    `
    inserted++
  }

  const count = await sql`SELECT count(*) as c FROM ingredient_shelf_life`
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

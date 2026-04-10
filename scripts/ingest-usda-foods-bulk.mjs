#!/usr/bin/env node
/**
 * USDA FoodData Central Bulk Ingestion
 *
 * Downloads Foundation Foods + SR Legacy CSV files directly from USDA
 * (no API key, no rate limits) and imports into system_ingredients.
 *
 * Files (~10 MB total, downloaded once and cached in .openclaw-temp/usda-bulk/):
 *   Foundation: 3.2 MB zip -> ~387 foundation_food records
 *   SR Legacy:  6.1 MB zip -> ~7,793 sr_legacy_food records
 *
 * Usage:
 *   node scripts/ingest-usda-foods-bulk.mjs
 *
 * Options (env vars):
 *   DATABASE_URL - PostgreSQL connection string. Default: local Docker.
 *   DRY_RUN      - Set to "1" to preview without writing to DB.
 *   FORCE        - Set to "1" to re-download even if cache exists.
 */

import postgres from 'postgres'
import { createWriteStream, existsSync, mkdirSync, readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import { createInterface } from 'readline'
import { createReadStream } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const CACHE_DIR = join(ROOT, '.openclaw-temp', 'usda-bulk')
const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const DRY_RUN = process.env.DRY_RUN === '1'
const FORCE = process.env.FORCE === '1'

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`)
const warn = (msg) => console.warn(`[${new Date().toISOString()}] WARN: ${msg}`)

mkdirSync(CACHE_DIR, { recursive: true })

// --- USDA Data Sources ---

const DATASETS = [
  {
    name: 'Foundation',
    url: 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_csv_2024-10-31.zip',
    zipFile: 'foundation.zip',
    dataTypeFilter: 'foundation_food',
  },
  {
    name: 'SR Legacy',
    url: 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip',
    zipFile: 'sr_legacy.zip',
    dataTypeFilter: 'sr_legacy_food',
  },
]

// --- food_category_id -> our ingredient_category ---
// USDA category IDs are consistent: ID 1=Dairy, 2=Spices, ..., 11=Vegetables, etc.
// Source: food_category.csv (code 0100=Dairy, 0200=Spices, 0900=Fruits, 1100=Veg, etc.)

const CATEGORY_ID_MAP = {
  1:  'dairy',      // Dairy and Egg Products (0100)
  2:  'spice',      // Spices and Herbs (0200)
  3:  'other',      // Baby Foods (0300)
  4:  'oil',        // Fats and Oils (0400)
  5:  'protein',    // Poultry Products (0500)
  6:  'condiment',  // Soups, Sauces, and Gravies (0600)
  7:  'protein',    // Sausages and Luncheon Meats (0700)
  8:  'pantry',     // Breakfast Cereals (0800)
  9:  'produce',    // Fruits and Fruit Juices (0900)
  10: 'protein',    // Pork Products (1000)
  11: 'produce',    // Vegetables and Vegetable Products (1100)
  12: 'pantry',     // Nut and Seed Products (1200)
  13: 'protein',    // Beef Products (1300)
  14: 'beverage',   // Beverages (1400)
  15: 'protein',    // Finfish and Shellfish Products (1500)
  16: 'pantry',     // Legumes and Legume Products (1600)
  17: 'protein',    // Lamb, Veal, and Game Products (1700)
  18: 'baking',     // Baked Products (1800)
  19: 'baking',     // Sweets (1900)
  20: 'pantry',     // Cereal Grains and Pasta (2000)
  21: 'other',      // Fast Foods (2100)
  22: 'other',      // Meals, Entrees, and Side Dishes (2200)
  23: 'specialty',  // American Indian/Alaska Native Foods (2300)
  25: 'pantry',     // Snacks (2500)
  26: 'other',      // Restaurant Foods (2600)
  27: 'specialty',  // Ethnic Foods (2700)
}

const CATEGORY_ID_SUBCATEGORY = {
  1: 'dairy_egg', 2: 'spices_herbs', 3: 'baby_foods',
  4: 'fats_oils', 5: 'poultry', 6: 'soups_sauces',
  7: 'sausages_luncheon', 8: 'breakfast_cereals', 9: 'fruits',
  10: 'pork', 11: 'vegetables', 12: 'nuts_seeds',
  13: 'beef', 14: 'beverages', 15: 'fish_shellfish',
  16: 'legumes', 17: 'lamb_veal_game', 18: 'baked_products',
  19: 'sweets', 20: 'grains_pasta', 21: 'fast_foods',
  22: 'meals_entrees', 23: 'indigenous', 25: 'snacks',
  26: 'restaurant', 27: 'ethnic',
}

// For Foundation Foods that may have no category_id, use keyword matching
function classifyByKeyword(description) {
  const lower = description.toLowerCase()
  if (/\begg\b/.test(lower) && !/eggplant|egg noodle/.test(lower)) return { cat: 'dairy', sub: 'dairy_egg' }
  if (/\b(fresh basil|fresh parsley|fresh cilantro|fresh mint|fresh dill|fresh chive|herb, fresh)\b/.test(lower)) return { cat: 'fresh_herb', sub: 'fresh_herbs' }
  if (/\b(spice|seasoning|pepper.*ground|cumin|coriander|turmeric|paprika|cayenne|cinnamon|cardamom|cloves|nutmeg|saffron|caraway|fennel seed|mustard seed|dried herb)\b/.test(lower)) return { cat: 'spice', sub: 'spices_herbs' }
  if (/\b(chicory|endive|radicchio|puntarelle|escarole|frisee|dandelion|sorrel|arugula|rucola|rapini|broccoli rabe|watercress|purslane|ramp|fiddlehead|stinging nettle|lovage|borage|oxalis|samphire|sea bean)\b/.test(lower)) return { cat: 'produce', sub: 'vegetables' }
  if (/\b(vegetable|fruit|raw|fresh produce|tomato|lettuce|spinach|kale|chard|broccoli|cauliflower|cabbage|carrot|celery|onion|garlic|leek|mushroom|zucchini|squash|eggplant|pepper|cucumber|artichoke|asparagus|beet|radish|turnip|parsnip|potato|yam|corn|pea|green bean|brussels|fennel|apple|pear|peach|plum|cherry|grape|lemon|lime|orange|grapefruit|avocado|mango|pineapple|banana|strawberry|blueberry|raspberry|blackberry|melon|watermelon|fig|date|apricot|nectarine|pomegranate|kiwi|papaya)\b/.test(lower)) return { cat: 'produce', sub: 'vegetables' }
  if (/\b(beef|veal|bison|venison|lamb|pork|ham|bacon|chicken|turkey|duck|goose|quail|rabbit|game|fish|salmon|tuna|cod|halibut|bass|trout|snapper|shrimp|crab|lobster|scallop|oyster|clam|mussel|octopus|squid)\b/.test(lower)) return { cat: 'protein', sub: 'protein' }
  if (/\b(milk|cream|butter|cheese|yogurt|kefir|ricotta|mozzarella|cheddar|parmesan|brie|gouda|feta|ghee|labneh|quark|whey)\b/.test(lower)) return { cat: 'dairy', sub: 'dairy_egg' }
  if (/\b(oil|lard|shortening|margarine|fat|tallow)\b/.test(lower)) return { cat: 'oil', sub: 'fats_oils' }
  if (/\b(wine|beer|whiskey|vodka|rum|gin|brandy|champagne|sake|mead|cider|liqueur|spirits|bourbon|tequila)\b/.test(lower)) return { cat: 'alcohol', sub: 'alcoholic_beverages' }
  if (/\b(juice|coffee|tea|soda|water|kombucha|smoothie|drink|beverage)\b/.test(lower)) return { cat: 'beverage', sub: 'beverages' }
  if (/\b(flour|sugar|baking powder|baking soda|yeast|vanilla|chocolate|cocoa|candy|cookie|cake|pastry|bread|muffin|brownie|syrup|honey|maple|molasses|jam|jelly|marmalade)\b/.test(lower)) return { cat: 'baking', sub: 'baked_products' }
  if (/\b(rice|pasta|noodle|grain|oat|wheat|barley|quinoa|millet|rye|cornmeal|polenta|farro|spelt|lentil|chickpea|bean|tofu|tempeh|almond|walnut|pecan|cashew|pistachio|hazelnut|pine nut|peanut|sunflower|pumpkin seed|sesame|flax|hemp seed|chia|cracker|chip|pretzel|popcorn|granola|cereal)\b/.test(lower)) return { cat: 'pantry', sub: 'pantry' }
  if (/\b(sauce|gravy|soup|broth|stock|vinegar|mustard|ketchup|mayo|pickle|chutney|salsa|hot sauce|soy sauce|fish sauce|worcestershire|sriracha|hoisin|dressing|miso|tahini|pesto)\b/.test(lower)) return { cat: 'condiment', sub: 'soups_sauces' }
  return { cat: 'other', sub: '' }
}

function resolveUnit(description) {
  const lower = description.toLowerCase()
  if (/\b(oil|beverage|juice|wine|beer|spirits|milk.*liquid|cream.*liquid|broth|stock)\b/.test(lower)) {
    return { unit_type: 'volume', standard_unit: 'ml' }
  }
  if (/\begg\b/.test(lower) && !/eggplant|egg noodle/.test(lower)) {
    return { unit_type: 'each', standard_unit: 'each' }
  }
  return { unit_type: 'weight', standard_unit: 'g' }
}

function toSlug(name, fdcId) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100) + '-' + fdcId
}

// --- CSV streaming ---

function parseCsvLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

async function streamCsv(filePath, onRow) {
  return new Promise((resolve, reject) => {
    const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity })
    let header = null
    rl.on('line', (line) => {
      if (!header) { header = parseCsvLine(line); return }
      if (!line.trim()) return
      const values = parseCsvLine(line)
      const row = {}
      header.forEach((h, i) => { row[h] = values[i] || '' })
      onRow(row)
    })
    rl.on('close', resolve)
    rl.on('error', reject)
  })
}

// --- Download + extract ---

async function downloadFile(url, dest) {
  log(`Downloading ${url} ...`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const writer = createWriteStream(dest)
  const reader = res.body.getReader()
  let totalBytes = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    writer.write(Buffer.from(value))
    totalBytes += value.length
    if (totalBytes % (512 * 1024) < value.length) {
      process.stdout.write(`\r  ${(totalBytes / 1024 / 1024).toFixed(1)} MB...`)
    }
  }
  writer.end()
  await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject) })
  console.log()
}

// --- DB upsert ---

async function upsertBatch(sql, foods) {
  if (DRY_RUN) return { inserted: foods.length, skipped: 0 }
  let inserted = 0
  let skipped = 0
  for (const food of foods) {
    try {
      const result = await sql`
        INSERT INTO system_ingredients (
          name, category, subcategory, unit_type, standard_unit,
          allergen_tags, common_prep_actions, is_active,
          usda_fdc_id, slug, aliases,
          scales_linearly, is_leaf, hierarchy_depth,
          yield_pct, trim_loss_pct, cook_shrinkage_pct
        ) VALUES (
          ${food.name}, ${food.category}, ${food.subcategory},
          ${food.unit_type}, ${food.standard_unit},
          ${'{}'}::text[], ${'[]'}::jsonb, ${true},
          ${food.fdcId}, ${food.slug}, ${food.aliases}::text[],
          ${true}, ${true}, ${0},
          ${1.0}, ${0.0}, ${0.0}
        )
        ON CONFLICT (usda_fdc_id) WHERE usda_fdc_id IS NOT NULL DO NOTHING
        RETURNING id
      `
      if (result.length > 0) inserted++; else skipped++
    } catch (err) {
      if (err.code === '23505') { skipped++; continue } // unique constraint (slug)
      warn(`Insert failed for "${food.name}" (FDC ${food.fdcId}): ${err.message}`)
      skipped++
    }
  }
  return { inserted, skipped }
}

// --- Main ---

async function main() {
  log('=== USDA FoodData Central Bulk Ingestion ===')
  log(`Database: ${DB_URL.replace(/:[^:@]+@/, ':***@')}`)
  log(`Dry run: ${DRY_RUN}`)
  log('')

  const sql = postgres(DB_URL, { max: 5 })

  // Pre-check: current system_ingredients count
  const before = await sql`SELECT COUNT(*)::int AS n FROM system_ingredients`
  log(`system_ingredients before: ${before[0].n.toLocaleString()}`)
  log('')

  let totalInserted = 0
  let totalSkipped = 0

  for (const dataset of DATASETS) {
    log(`--- ${dataset.name} (filter: ${dataset.dataTypeFilter}) ---`)
    const zipPath = join(CACHE_DIR, dataset.zipFile)

    // Download if not cached
    if (!existsSync(zipPath) || FORCE) {
      await downloadFile(dataset.url, zipPath)
    } else {
      log(`Using cached zip: ${dataset.zipFile}`)
    }

    // Extract to a subdirectory named after the dataset
    const extractDir = join(CACHE_DIR, dataset.zipFile.replace('.zip', ''))
    mkdirSync(extractDir, { recursive: true })

    // Find food.csv by walking the extracted directory tree (works cross-platform)
    function findFoodCsv(dir) {
      if (!existsSync(dir)) return null
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry)
        if (entry === 'food.csv') return full
        try {
          if (statSync(full).isDirectory()) {
            const found = findFoodCsv(full)
            if (found) return found
          }
        } catch { /* skip */ }
      }
      return null
    }

    let csvPath = findFoodCsv(extractDir)

    if (!csvPath) {
      log('  Extracting zip...')
      execSync(`unzip -o "${zipPath}" -d "${extractDir}"`, { stdio: 'pipe' })
      csvPath = findFoodCsv(extractDir)
    }

    if (!csvPath) throw new Error(`food.csv not found after extracting ${dataset.zipFile}`)
    log(`  food.csv: ${csvPath}`)

    // Find food_category.csv for category ID -> name mapping
    const catCsvPath = csvPath.replace('food.csv', 'food_category.csv')
    const categoryMap = {}
    if (existsSync(catCsvPath)) {
      await streamCsv(catCsvPath, (row) => {
        const id = parseInt(row.id, 10)
        if (id) categoryMap[id] = row.description || ''
      })
      log(`  Loaded ${Object.keys(categoryMap).length} food categories`)
    }

    // Process food.csv
    let processed = 0
    let filtered = 0
    const batch = []
    const BATCH_SIZE = 100
    let inserted = 0
    let skipped = 0

    const flush = async () => {
      if (batch.length === 0) return
      const { inserted: i, skipped: s } = await upsertBatch(sql, batch)
      inserted += i; skipped += s
      batch.length = 0
    }

    await streamCsv(csvPath, (row) => {
      processed++
      // Filter to target data type only
      if (row.data_type !== dataset.dataTypeFilter) { filtered++; return }

      const fdcId = parseInt(row.fdc_id, 10)
      const description = (row.description || '').trim()
      if (!fdcId || !description) return

      const catId = parseInt(row.food_category_id, 10) || 0

      // Use category_id map if available, otherwise keyword matching
      let category, subcategory
      if (catId && CATEGORY_ID_MAP[catId]) {
        category = CATEGORY_ID_MAP[catId]
        subcategory = CATEGORY_ID_SUBCATEGORY[catId] || ''
      } else {
        const classified = classifyByKeyword(description)
        category = classified.cat
        subcategory = classified.sub
      }

      const { unit_type, standard_unit } = resolveUnit(description)

      batch.push({
        name: description,
        category,
        subcategory,
        unit_type,
        standard_unit,
        fdcId,
        slug: toSlug(description, fdcId),
        aliases: [description.toLowerCase()],
      })
    })
    await flush()

    const dataTotal = processed - filtered
    log(`  Processed: ${processed} rows, ${filtered} filtered (wrong data_type), ${dataTotal} target foods`)
    log(`  Inserted: ${inserted}, Skipped (already exists): ${skipped}`)
    totalInserted += inserted
    totalSkipped += skipped
    log('')
  }

  // Post-check
  const after = await sql`SELECT COUNT(*)::int AS n FROM system_ingredients`
  log(`system_ingredients after: ${after[0].n.toLocaleString()} (+${(after[0].n - before[0].n).toLocaleString()} new)`)

  await sql.end()

  log('')
  log('=== Bulk Ingestion Complete ===')
  log(`Inserted: ${totalInserted.toLocaleString()}`)
  log(`Skipped (already existed): ${totalSkipped.toLocaleString()}`)
  log('')
  log('Next: re-run normalization to link chef ingredients to the expanded catalog:')
  log('  node scripts/openclaw-pull/sync-normalization.mjs')
}

main().catch(err => {
  console.error('[FATAL]', err)
  process.exit(1)
})

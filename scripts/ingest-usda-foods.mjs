#!/usr/bin/env node
/**
 * USDA FoodData Central Ingestion
 *
 * Expands system_ingredients from ~20K to the full FDC catalog.
 * Targets Foundation Foods, SR Legacy, and Survey (FNDDS) datasets.
 * Branded foods (~300K) are skipped - they add noise, not coverage.
 *
 * Usage:
 *   node scripts/ingest-usda-foods.mjs
 *
 * Options (env vars):
 *   USDA_FDC_API_KEY  - FDC API key (free at api.data.gov). Defaults to DEMO_KEY.
 *                       DEMO_KEY: 30 req/hour. Real key: 1,000 req/hour.
 *   DATABASE_URL      - PostgreSQL connection string. Default: local Docker.
 *   DRY_RUN           - Set to "1" to preview without writing to DB.
 *   CHECKPOINT_FILE   - Path to checkpoint file for resuming interrupted runs.
 *                       Default: .openclaw-temp/usda-ingest-checkpoint.json
 *
 * Run with a real API key for full import in ~20 minutes:
 *   USDA_FDC_API_KEY=your_key node scripts/ingest-usda-foods.mjs
 *
 * Get a free key at: https://api.data.gov/signup/
 */

import postgres from 'postgres'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// --- Config ---

const API_KEY = process.env.USDA_FDC_API_KEY || 'DEMO_KEY'
const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const DRY_RUN = process.env.DRY_RUN === '1'
const PAGE_SIZE = 200
const CHECKPOINT_FILE = process.env.CHECKPOINT_FILE ||
  join(ROOT, '.openclaw-temp', 'usda-ingest-checkpoint.json')

// Rate limiting: DEMO_KEY = 30/hour. Real key = 1,000/hour.
// We'll use conservative per-request delays.
const REQUEST_DELAY_MS = API_KEY === 'DEMO_KEY' ? 4000 : 400 // 15/min vs 150/min

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`)
const warn = (msg) => console.warn(`[${new Date().toISOString()}] WARN: ${msg}`)

// Datasets to ingest, in priority order.
// Foundation = highest quality (research grade, ~1,100 foods)
// SR Legacy  = Standard Reference (comprehensive, ~8,700 foods)
// Survey     = FNDDS dietary survey (mixed dishes, ~8,000 foods)
// Override via: FDC_DATA_TYPES="Foundation,SR Legacy" node scripts/ingest-usda-foods.mjs
const DATA_TYPES = process.env.FDC_DATA_TYPES
  ? process.env.FDC_DATA_TYPES.split(',').map(s => s.trim())
  : ['Foundation', 'SR Legacy', 'Survey (FNDDS)']

// --- Category mapping ---

/**
 * SR Legacy NDB number prefix -> our ingredient_category enum.
 * NDB numbers are 4-5 digits where the leading 2 digits encode the USDA food group.
 * Pad to 5 digits (e.g. "9427" -> "09427") and read the first 2 digits.
 */
const NDB_GROUP_TO_CATEGORY = {
  '01': 'dairy',      // Dairy and Egg Products
  '02': 'spice',      // Spices and Herbs
  '03': 'other',      // Baby Foods
  '04': 'oil',        // Fats and Oils
  '05': 'protein',    // Poultry Products
  '06': 'condiment',  // Soups, Sauces, and Gravies
  '07': 'protein',    // Sausages and Luncheon Meats
  '08': 'pantry',     // Breakfast Cereals
  '09': 'produce',    // Fruits and Fruit Juices
  '10': 'protein',    // Pork Products
  '11': 'produce',    // Vegetables and Vegetable Products
  '12': 'pantry',     // Nut and Seed Products
  '13': 'protein',    // Beef Products
  '14': 'beverage',   // Beverages
  '15': 'protein',    // Finfish and Shellfish Products
  '16': 'pantry',     // Legumes and Legume Products
  '17': 'protein',    // Lamb, Veal, and Game Products
  '18': 'baking',     // Baked Products
  '19': 'baking',     // Sweets
  '20': 'pantry',     // Cereal Grains and Pasta
  '21': 'other',      // Fast Foods
  '22': 'other',      // Meals, Entrees, and Side Dishes
  '23': 'specialty',  // American Indian/Alaska Native Foods
  '25': 'pantry',     // Snacks
  '26': 'other',      // Restaurant Foods
  '27': 'specialty',  // Ethnic Foods
}

/**
 * Keyword-based category detection from food description.
 * Used for Foundation Foods (6-digit NDB) and as fallback.
 * Checks are ordered: more specific first.
 */
const KEYWORD_RULES = [
  // Herbs and spices (must come before produce)
  { words: ['dried', 'ground', 'powder'], suffix: ['pepper', 'cumin', 'oregano', 'thyme', 'basil', 'sage', 'rosemary', 'paprika', 'coriander', 'cardamom', 'turmeric', 'cinnamon', 'clove', 'nutmeg', 'ginger', 'chili', 'cayenne', 'saffron', 'caraway', 'fennel seed', 'mustard seed', 'celery seed'], category: 'spice' },
  { words: ['spice', 'seasoning', 'herb, dried'], category: 'spice' },
  { exact: ['salt', 'black pepper, ground', 'white pepper, ground', 'red pepper, ground'], category: 'spice' },

  // Produce (catch-all for raw/fresh vegetables and fruit)
  { words: ['raw', 'fresh'], suffix: ['vegetable', 'fruit', 'berry', 'root', 'leaf', 'leaves', 'chicory', 'endive', 'radicchio', 'arugula', 'rabe', 'chard', 'kale', 'spinach', 'lettuce', 'watercress', 'fennel', 'celery', 'carrot', 'beet', 'turnip', 'parsnip', 'radish', 'onion', 'shallot', 'leek', 'garlic', 'mushroom', 'squash', 'zucchini', 'pumpkin', 'tomato', 'pepper', 'cucumber', 'eggplant', 'artichoke', 'asparagus', 'broccoli', 'cabbage', 'cauliflower', 'brussels', 'pea', 'bean', 'corn', 'potato', 'yam', 'sweet potato', 'apple', 'pear', 'peach', 'plum', 'cherry', 'grape', 'citrus', 'lemon', 'lime', 'orange', 'grapefruit', 'avocado', 'mango', 'pineapple', 'banana', 'strawberry', 'blueberry', 'raspberry', 'blackberry', 'melon', 'watermelon', 'fig', 'date', 'apricot', 'nectarine'], category: 'produce' },
  { words: ['vegetable', 'fruit', 'produce'], category: 'produce' },

  // Protein
  { words: ['beef', 'veal', 'bison', 'venison', 'elk', 'lamb', 'mutton', 'goat', 'pork', 'ham', 'bacon', 'chicken', 'turkey', 'duck', 'goose', 'quail', 'pheasant', 'rabbit', 'fish', 'salmon', 'tuna', 'cod', 'halibut', 'bass', 'trout', 'snapper', 'flounder', 'tilapia', 'shrimp', 'crab', 'lobster', 'scallop', 'oyster', 'clam', 'mussel', 'octopus', 'squid', 'anchovy', 'sardine', 'herring', 'mackerel'], category: 'protein' },
  { words: ['meat', 'poultry', 'seafood', 'shellfish', 'fillet', 'steak', 'roast', 'breast', 'thigh', 'drumstick', 'ground'], suffix: ['lean', 'fat', 'raw'], category: 'protein' },

  // Dairy
  { words: ['milk', 'cream', 'butter', 'cheese', 'yogurt', 'kefir', 'cottage', 'ricotta', 'mozzarella', 'cheddar', 'parmesan', 'brie', 'gouda', 'feta', 'gruyere', 'sour cream', 'whipped cream', 'half and half', 'evaporated milk', 'condensed milk'], category: 'dairy' },
  { words: ['egg'], exclude: ['eggplant', 'egg noodle', 'egg roll'], category: 'dairy' },

  // Oil and fats
  { words: ['oil', 'lard', 'shortening', 'ghee', 'margarine', 'fat'], exclude: ['essential oil'], category: 'oil' },

  // Alcohol
  { words: ['wine', 'beer', 'spirits', 'whiskey', 'vodka', 'rum', 'gin', 'brandy', 'champagne', 'sake', 'mead', 'cider', 'ale', 'lager', 'stout', 'port', 'sherry', 'vermouth'], category: 'alcohol' },

  // Beverages (non-alcoholic)
  { words: ['juice', 'coffee', 'tea', 'soda', 'water', 'smoothie', 'drink', 'beverage', 'kombucha'], category: 'beverage' },

  // Baking
  { words: ['flour', 'sugar', 'baking powder', 'baking soda', 'yeast', 'vanilla', 'chocolate', 'cocoa', 'candy', 'cookie', 'cake', 'pastry', 'bread', 'muffin', 'brownie', 'frosting', 'icing', 'syrup', 'honey', 'maple', 'molasses', 'jam', 'jelly', 'marmalade'], category: 'baking' },

  // Pantry
  { words: ['rice', 'pasta', 'noodle', 'grain', 'oat', 'wheat', 'barley', 'quinoa', 'millet', 'rye', 'corn meal', 'polenta', 'farro', 'spelt', 'lentil', 'chickpea', 'bean', 'pea', 'tofu', 'tempeh', 'nut', 'seed', 'almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut', 'pine nut', 'peanut', 'sunflower', 'pumpkin seed', 'sesame', 'flax', 'hemp seed', 'chia', 'breadcrumb', 'cracker', 'chip', 'pretzel', 'popcorn'], category: 'pantry' },

  // Condiment
  { words: ['sauce', 'gravy', 'soup', 'broth', 'stock', 'vinegar', 'mustard', 'ketchup', 'mayo', 'mayonnaise', 'relish', 'pickle', 'chutney', 'salsa', 'hot sauce', 'soy sauce', 'fish sauce', 'worcestershire', 'tabasco', 'sriracha', 'hoisin', 'oyster sauce', 'teriyaki', 'dressing', 'aioli'], category: 'condiment' },

  // Fresh herbs (before dry herb)
  { words: ['fresh', 'raw'], suffix: ['basil', 'parsley', 'cilantro', 'mint', 'dill', 'chive', 'tarragon', 'oregano', 'thyme', 'sage', 'rosemary', 'bay'], category: 'fresh_herb' },
  { words: ['basil, fresh', 'parsley, fresh', 'cilantro, fresh', 'mint, fresh', 'dill, fresh', 'chive, fresh'], category: 'fresh_herb' },
]

/**
 * Classify a food description into our ingredient_category enum.
 * Uses NDB number prefix for SR Legacy, keyword matching for Foundation/others.
 */
function classifyFood(description, ndbNumber) {
  const lower = description.toLowerCase()

  // For SR Legacy (4-5 digit NDB numbers), use NDB group prefix
  if (ndbNumber && String(ndbNumber).length <= 5) {
    const padded = String(ndbNumber).padStart(5, '0')
    const group = padded.substring(0, 2)
    if (NDB_GROUP_TO_CATEGORY[group]) {
      return NDB_GROUP_TO_CATEGORY[group]
    }
  }

  // Keyword rules for Foundation Foods and unmatched SR Legacy
  for (const rule of KEYWORD_RULES) {
    if (rule.exact) {
      if (rule.exact.some(e => lower === e || lower.startsWith(e + ','))) {
        return rule.category
      }
      continue
    }

    const hasExclude = rule.exclude && rule.exclude.some(ex => lower.includes(ex))
    if (hasExclude) continue

    const hasWord = rule.words && rule.words.some(w => lower.includes(w))
    if (!hasWord) continue

    if (rule.suffix) {
      const hasSuffix = rule.suffix.some(s => lower.includes(s))
      if (!hasSuffix) continue
    }

    return rule.category
  }

  return 'other'
}

// For foods with no food group or unknown group
const DEFAULT_CATEGORY = 'other'

// --- Unit determination ---

/**
 * Determine unit_type and standard_unit from USDA food group and food name.
 * Defaults to weight/g for most foods (universal cooking unit).
 */
function resolveUnit(foodGroup, foodName) {
  const grp = foodGroup || ''
  const nm = foodName.toLowerCase()

  if (grp === 'Beverages' || grp === 'Alcoholic Beverages') {
    return { unit_type: 'volume', standard_unit: 'ml' }
  }
  if (grp === 'Fats and Oils') {
    return { unit_type: 'volume', standard_unit: 'ml' }
  }
  // Eggs and things measured individually
  if (
    nm.includes('egg') && !nm.includes('eggplant') && !nm.includes('egg noodle')
    || nm.startsWith('avocado') && !nm.includes(',')
  ) {
    return { unit_type: 'each', standard_unit: 'each' }
  }

  return { unit_type: 'weight', standard_unit: 'g' }
}

// --- Slug generation ---

function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 120)
}

// --- Checkpoint support ---

function loadCheckpoint() {
  if (!existsSync(CHECKPOINT_FILE)) return { completed: [], lastPage: {} }
  try {
    return JSON.parse(readFileSync(CHECKPOINT_FILE, 'utf8'))
  } catch {
    return { completed: [], lastPage: {} }
  }
}

function saveCheckpoint(checkpoint) {
  mkdirSync(dirname(CHECKPOINT_FILE), { recursive: true })
  writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2))
}

// --- FDC API ---

async function fetchPage(dataType, pageNumber) {
  const url = new URL('https://api.nal.usda.gov/fdc/v1/foods/list')
  url.searchParams.set('api_key', API_KEY)
  url.searchParams.set('dataType', dataType)
  url.searchParams.set('pageSize', String(PAGE_SIZE))
  url.searchParams.set('pageNumber', String(pageNumber))

  const res = await fetch(url.toString())
  if (res.status === 429) {
    warn('Rate limit hit. Sleeping 65 seconds...')
    await sleep(65000)
    return fetchPage(dataType, pageNumber)
  }
  if (!res.ok) {
    throw new Error(`FDC API error: ${res.status} ${res.statusText} (${url})`)
  }
  return res.json()
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// --- DB upsert ---

async function upsertBatch(sql, foods) {
  if (foods.length === 0) return { inserted: 0, skipped: 0 }
  if (DRY_RUN) {
    log(`[DRY RUN] Would upsert ${foods.length} foods`)
    return { inserted: foods.length, skipped: 0 }
  }

  let inserted = 0
  let skipped = 0

  for (const food of foods) {
    try {
      // Check if slug already exists (to avoid unique constraint collision on slug)
      const slugBase = toSlug(food.name)
      let slug = slugBase

      // Try up to 5 suffix variants if slug is taken
      for (let i = 0; i < 5; i++) {
        const existing = await sql`
          SELECT id FROM system_ingredients WHERE slug = ${slug} LIMIT 1
        `
        if (existing.length === 0) break
        slug = `${slugBase}-${food.fdcId}`
        break
      }

      const result = await sql`
        INSERT INTO system_ingredients (
          name, category, subcategory, unit_type, standard_unit,
          allergen_tags, common_prep_actions, is_active,
          usda_fdc_id, usda_ndb_number, usda_food_group, slug, aliases,
          scales_linearly, is_leaf, hierarchy_depth,
          yield_pct, trim_loss_pct, cook_shrinkage_pct
        ) VALUES (
          ${food.name},
          ${food.category},
          ${food.subcategory || ''},
          ${food.unit_type},
          ${food.standard_unit},
          ${'{}'}::text[],
          ${'[]'}::jsonb,
          ${true},
          ${food.fdcId},
          ${food.ndbNumber || null},
          ${food.foodGroup || null},
          ${slug},
          ${food.aliases || []}::text[],
          ${true},
          ${true},
          ${0},
          ${1.0},
          ${0.0},
          ${0.0}
        )
        ON CONFLICT (usda_fdc_id) WHERE usda_fdc_id IS NOT NULL DO NOTHING
        RETURNING id
      `
      if (result.length > 0) {
        inserted++
      } else {
        skipped++
      }
    } catch (err) {
      // Name-level duplicate or other constraint - skip silently
      if (err.code === '23505') {
        skipped++
      } else {
        warn(`Failed to insert "${food.name}" (FDC ${food.fdcId}): ${err.message}`)
        skipped++
      }
    }
  }

  return { inserted, skipped }
}

// --- Transform FDC food to our schema ---

function transformFood(fdcFood) {
  const ndbNumber = fdcFood.ndbNumber || null
  const category = classifyFood(fdcFood.description, ndbNumber)
  const { unit_type, standard_unit } = resolveUnit(null, fdcFood.description)

  // Build aliases: include lowercase version and any common name
  const aliases = []
  const lower = fdcFood.description.toLowerCase()
  aliases.push(lower)
  if (fdcFood.commonName && fdcFood.commonName.toLowerCase() !== lower) {
    aliases.push(fdcFood.commonName.toLowerCase())
  }

  // Subcategory: derived from NDB group label for SR Legacy
  let subcategory = ''
  if (ndbNumber && String(ndbNumber).length <= 5) {
    const padded = String(ndbNumber).padStart(5, '0')
    const grpCode = padded.substring(0, 2)
    const grpLabels = {
      '01': 'dairy_egg', '02': 'spices_herbs', '03': 'baby_foods',
      '04': 'fats_oils', '05': 'poultry', '06': 'soups_sauces',
      '07': 'sausages_luncheon', '08': 'breakfast_cereals', '09': 'fruits',
      '10': 'pork', '11': 'vegetables', '12': 'nuts_seeds',
      '13': 'beef', '14': 'beverages', '15': 'fish_shellfish',
      '16': 'legumes', '17': 'lamb_veal_game', '18': 'baked_products',
      '19': 'sweets', '20': 'grains_pasta', '21': 'fast_foods',
      '22': 'meals_entrees', '23': 'indigenous', '25': 'snacks',
      '26': 'restaurant', '27': 'ethnic',
    }
    subcategory = grpLabels[grpCode] || ''
  }

  return {
    name: fdcFood.description,
    category,
    subcategory,
    unit_type,
    standard_unit,
    fdcId: fdcFood.fdcId,
    ndbNumber: ndbNumber,
    foodGroup: null, // not returned by list endpoint; stored via subcategory
    aliases: [...new Set(aliases)],
  }
}

// --- Main ---

async function main() {
  log('=== USDA FoodData Central Ingestion ===')
  log(`API key: ${API_KEY === 'DEMO_KEY' ? 'DEMO_KEY (rate limited: 30 req/hour)' : 'Custom key'}`)
  log(`Database: ${DB_URL.replace(/:[^:@]+@/, ':***@')}`)
  log(`Dry run: ${DRY_RUN}`)
  log(`Request delay: ${REQUEST_DELAY_MS}ms`)
  log('')

  if (API_KEY === 'DEMO_KEY') {
    log('NOTE: Running with DEMO_KEY. This is rate-limited to 30 requests/hour.')
    log('      For a full import, get a free API key at: https://api.data.gov/signup/')
    log('      Then: USDA_FDC_API_KEY=your_key node scripts/ingest-usda-foods.mjs')
    log('')
  }

  const sql = postgres(DB_URL, { max: 3 })
  const checkpoint = loadCheckpoint()

  let totalInserted = 0
  let totalSkipped = 0
  let totalRequests = 0

  for (const dataType of DATA_TYPES) {
    if (checkpoint.completed.includes(dataType)) {
      log(`[${dataType}] Already completed in previous run. Skipping.`)
      continue
    }

    log(`[${dataType}] Starting ingestion...`)
    let pageNumber = checkpoint.lastPage[dataType] || 1
    let dataTypeInserted = 0
    let dataTypeSkipped = 0

    while (true) {
      log(`[${dataType}] Page ${pageNumber}...`)

      let foods
      try {
        foods = await fetchPage(dataType, pageNumber)
        totalRequests++
      } catch (err) {
        warn(`[${dataType}] Page ${pageNumber} fetch failed: ${err.message}`)
        // Save checkpoint and exit gracefully
        checkpoint.lastPage[dataType] = pageNumber
        saveCheckpoint(checkpoint)
        log(`Checkpoint saved. Re-run script to resume from page ${pageNumber}.`)
        await sql.end()
        process.exit(1)
      }

      if (!Array.isArray(foods) || foods.length === 0) {
        log(`[${dataType}] No more foods at page ${pageNumber}. Done.`)
        break
      }

      const transformed = foods.map(transformFood)
      const { inserted, skipped } = await upsertBatch(sql, transformed)
      dataTypeInserted += inserted
      dataTypeSkipped += skipped
      totalInserted += inserted
      totalSkipped += skipped

      log(`[${dataType}] Page ${pageNumber}: +${inserted} inserted, ${skipped} skipped | Total so far: ${totalInserted} inserted`)

      // Save checkpoint after every page
      checkpoint.lastPage[dataType] = pageNumber + 1
      saveCheckpoint(checkpoint)

      if (foods.length < PAGE_SIZE) {
        // Last page
        break
      }

      pageNumber++
      await sleep(REQUEST_DELAY_MS)
    }

    // Mark dataset complete
    checkpoint.completed.push(dataType)
    checkpoint.lastPage[dataType] = pageNumber
    saveCheckpoint(checkpoint)
    log(`[${dataType}] Complete: ${dataTypeInserted} inserted, ${dataTypeSkipped} skipped`)
    log('')
  }

  await sql.end()

  log('=== Ingestion Complete ===')
  log(`Total inserted: ${totalInserted}`)
  log(`Total skipped (already existed): ${totalSkipped}`)
  log(`Total API requests: ${totalRequests}`)
  log('')

  // Clear checkpoint on success
  if (!DRY_RUN) {
    try {
      writeFileSync(CHECKPOINT_FILE, JSON.stringify({ completed: DATA_TYPES, lastPage: {} }, null, 2))
    } catch {}
  }

  log('Next step: run sync-normalization to re-link chef ingredients to the expanded catalog:')
  log('  node scripts/openclaw-pull/sync-normalization.mjs')
}

main().catch(err => {
  console.error('[FATAL]', err)
  process.exit(1)
})

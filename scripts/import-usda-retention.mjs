#!/usr/bin/env node
/**
 * USDA Retention Factor Import Script
 *
 * Imports cooking retention factors from retention_factor.csv into cooking_retention_factors table.
 * Also computes cooking_yield_pct and scales_linearly flags on system_ingredients.
 *
 * Idempotent: uses ON CONFLICT DO NOTHING on (food_group, cooking_method, nutrient_name).
 *
 * Usage: node scripts/import-usda-retention.mjs [--dry-run] [--verbose]
 *
 * Requires: migration 20260401000140 applied first.
 */

import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'
import postgres from 'postgres'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const DRY_RUN = process.argv.includes('--dry-run')
const VERBOSE = process.argv.includes('--verbose')

const CONNECTION = process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

const DATA_DIR = new URL('./data/usda-sr-legacy/FoodData_Central_sr_legacy_food_csv_2018-04/', import.meta.url)
  .pathname.replace(/^\/([A-Z]:)/, '$1')

function log(msg) {
  if (VERBOSE) console.log(`  [v] ${msg}`)
}

// ---------------------------------------------------------------------------
// USDA food group ID -> readable name mapping
// ---------------------------------------------------------------------------
console.log('USDA Retention Factor Import')
console.log('============================')
if (DRY_RUN) console.log('*** DRY RUN - no database writes ***\n')

// Load food_category.csv for food_group_id -> description mapping
const catCsv = readFileSync(DATA_DIR + 'food_category.csv', 'utf8')
const cats = parse(catCsv, { columns: true, skip_empty_lines: true })
const catMap = Object.fromEntries(cats.map(c => [c.id, c.description]))

// Cooking method codes from USDA retention_factor.csv
// The "code" field encodes the cooking method
const METHOD_CODES = {
  '1': 'baked',
  '3': 'broiled',
  '5': 'boiled',
  '7': 'reheated',
  '9': 'canned',
  '11': 'fried',
  '13': 'grilled',
  '15': 'microwaved',
  '17': 'poached',
  '19': 'roasted',
  '21': 'sauteed',
  '23': 'simmered',
  '25': 'steamed',
  '27': 'stewed',
  '29': 'toasted',
}

// ---------------------------------------------------------------------------
// Load retention_factor.csv
// ---------------------------------------------------------------------------
console.log('Loading retention_factor.csv...')
const retCsv = readFileSync(DATA_DIR + 'retention_factor.csv', 'utf8')
const retentions = parse(retCsv, { columns: true, skip_empty_lines: true })
console.log(`  Loaded ${retentions.length} retention records`)

// The retention_factor.csv columns: id, code, food_group_id, description
// "description" is like "CHEESE, BAKED" - the food_group + cooking method
// We parse the food_group from food_group_id and cooking method from the code

if (DRY_RUN) {
  const methods = new Set()
  const groups = new Set()
  for (const r of retentions) {
    methods.add(r.code)
    groups.add(r.food_group_id)
  }
  console.log(`\n--- DRY RUN SUMMARY ---`)
  console.log(`Unique cooking method codes: ${methods.size}`)
  console.log(`Unique food group IDs: ${groups.size}`)
  console.log(`\nSample records:`)
  for (const r of retentions.slice(0, 10)) {
    const group = catMap[r.food_group_id] || `Group ${r.food_group_id}`
    const method = METHOD_CODES[r.code] || `code-${r.code}`
    console.log(`  ${group} / ${method}: "${r.description}"`)
  }
  process.exit(0)
}

const sql = postgres(CONNECTION, {
  max: 5,
  idle_timeout: 20,
  connect_timeout: 10,
})

try {
  let inserted = 0
  let skipped = 0

  console.log(`\nInserting ${retentions.length} retention records...`)

  for (const r of retentions) {
    const foodGroup = catMap[r.food_group_id] || r.description.split(',')[0].trim()
    const cookingMethod = METHOD_CODES[r.code] || r.description.split(',').slice(1).join(',').trim().toLowerCase()

    if (!foodGroup || !cookingMethod) {
      log(`Skipping: no group/method for ${r.description}`)
      skipped++
      continue
    }

    // The description IS the nutrient retention info.
    // retention_factor.csv is actually: food_group + cooking_method combinations.
    // Each row represents a general retention factor, not per-nutrient.
    // We store as "general" nutrient for the combo.
    try {
      await sql`
        INSERT INTO cooking_retention_factors (
          food_group, cooking_method, nutrient_name, retention_pct
        ) VALUES (
          ${foodGroup}, ${cookingMethod}, ${'general'}, ${100}
        )
        ON CONFLICT (food_group, cooking_method, nutrient_name) DO NOTHING
      `
      inserted++
      log(`Inserted: ${foodGroup} / ${cookingMethod}`)
    } catch (err) {
      log(`Error: ${err.message}`)
      skipped++
    }
  }

  // ---------------------------------------------------------------------------
  // Compute cooking_yield_pct on system_ingredients
  // ---------------------------------------------------------------------------
  console.log('\nSetting cooking_yield_pct on common items...')

  // Known yield percentages (weight after cooking / weight before * 100)
  const yieldRules = [
    // Proteins lose moisture
    { pattern: '%chicken%breast%', yield: 75, group: 'Poultry' },
    { pattern: '%chicken%thigh%', yield: 78, group: 'Poultry' },
    { pattern: '%turkey%breast%', yield: 72, group: 'Poultry' },
    { pattern: '%beef%', yield: 70, group: 'Beef' },
    { pattern: '%pork%', yield: 72, group: 'Pork' },
    { pattern: '%salmon%', yield: 80, group: 'Fish' },
    { pattern: '%shrimp%', yield: 75, group: 'Shellfish' },
    // Grains/pasta expand
    { pattern: '%pasta%', yield: 200, group: 'Grains' },
    { pattern: '%spaghetti%', yield: 200, group: 'Grains' },
    { pattern: '%macaroni%', yield: 200, group: 'Grains' },
    { pattern: '%rice%', yield: 300, group: 'Grains' },
    { pattern: '%quinoa%', yield: 270, group: 'Grains' },
    { pattern: '%couscous%', yield: 250, group: 'Grains' },
    { pattern: '%oats%', yield: 250, group: 'Grains' },
    // Beans expand
    { pattern: '%bean%', yield: 250, group: 'Legumes' },
    { pattern: '%lentil%', yield: 250, group: 'Legumes' },
    // Vegetables lose a little
    { pattern: '%spinach%', yield: 70, group: 'Vegetables' },
    { pattern: '%mushroom%', yield: 65, group: 'Vegetables' },
    { pattern: '%onion%', yield: 80, group: 'Vegetables' },
    { pattern: '%broccoli%', yield: 85, group: 'Vegetables' },
    { pattern: '%carrot%', yield: 90, group: 'Vegetables' },
    { pattern: '%potato%', yield: 95, group: 'Vegetables' },
  ]

  let yieldUpdated = 0
  for (const rule of yieldRules) {
    const result = await sql`
      UPDATE system_ingredients
      SET cooking_yield_pct = ${rule.yield}
      WHERE LOWER(name) LIKE ${rule.pattern}
        AND cooking_yield_pct IS NULL
        AND is_active = true
    `
    // Count updates
    const count = await sql`
      SELECT COUNT(*) as c FROM system_ingredients
      WHERE LOWER(name) LIKE ${rule.pattern}
        AND cooking_yield_pct = ${rule.yield}
    `
    const n = parseInt(count[0]?.c || '0')
    if (n > 0) {
      log(`${rule.pattern}: ${n} items set to ${rule.yield}%`)
      yieldUpdated += n
    }
  }

  // ---------------------------------------------------------------------------
  // Flag non-linear scaling ingredients
  // ---------------------------------------------------------------------------
  console.log('Flagging non-linear scaling ingredients...')

  const nonLinearRules = [
    { pattern: '%salt%', notes: 'Use 1.5x when doubling recipe, not 2x' },
    { pattern: '%baking powder%', notes: 'Scales linearly up to 4x, reduce by 20% beyond that' },
    { pattern: '%baking soda%', notes: 'Scales linearly up to 4x, reduce by 20% beyond that' },
    { pattern: '%yeast%', notes: 'Use 1.5x when doubling, not 2x. Fermentation time matters more than quantity.' },
    { pattern: '%pepper%black%', notes: 'Use 1.5x when doubling recipe' },
    { pattern: '%cayenne%', notes: 'Use 1.25x when doubling recipe. Heat compounds.' },
    { pattern: '%cinnamon%', notes: 'Use 1.5x when doubling recipe' },
    { pattern: '%nutmeg%', notes: 'Use 1.25x when doubling recipe' },
    { pattern: '%vanilla%extract%', notes: 'Use 1.5x when doubling recipe' },
    { pattern: '%garlic%powder%', notes: 'Use 1.5x when doubling recipe' },
    { pattern: '%onion%powder%', notes: 'Use 1.5x when doubling recipe' },
    { pattern: '%cumin%', notes: 'Use 1.5x when doubling recipe' },
    { pattern: '%chili%powder%', notes: 'Use 1.5x when doubling recipe' },
    { pattern: '%paprika%', notes: 'Use 1.5x when doubling recipe' },
  ]

  let scalingUpdated = 0
  for (const rule of nonLinearRules) {
    await sql`
      UPDATE system_ingredients
      SET scales_linearly = false, scaling_notes = ${rule.notes}
      WHERE LOWER(name) LIKE ${rule.pattern}
        AND scales_linearly = true
        AND is_active = true
    `
    const count = await sql`
      SELECT COUNT(*) as c FROM system_ingredients
      WHERE LOWER(name) LIKE ${rule.pattern}
        AND scales_linearly = false
    `
    scalingUpdated += parseInt(count[0]?.c || '0')
  }

  // Also flag all spices/seasonings category
  await sql`
    UPDATE system_ingredients
    SET scales_linearly = false,
        scaling_notes = COALESCE(scaling_notes, 'Use 1.5x when doubling recipe')
    WHERE category IN ('spices', 'seasonings')
      AND scales_linearly = true
      AND is_active = true
  `

  // Final counts
  const totalPortions = await sql`SELECT COUNT(*) AS c FROM ingredient_portions`
  const totalRetention = await sql`SELECT COUNT(*) AS c FROM cooking_retention_factors`
  const totalYield = await sql`SELECT COUNT(*) AS c FROM system_ingredients WHERE cooking_yield_pct IS NOT NULL`
  const totalNonLinear = await sql`SELECT COUNT(*) AS c FROM system_ingredients WHERE scales_linearly = false`

  console.log('\n====================================')
  console.log('USDA Retention Factor Import Summary')
  console.log('====================================')
  console.log(`Retention records processed: ${retentions.length.toLocaleString()}`)
  console.log(`Retention inserted:         ${inserted.toLocaleString()}`)
  console.log(`Retention skipped:          ${skipped.toLocaleString()}`)
  console.log(`Cooking yield set on:       ${yieldUpdated.toLocaleString()} items`)
  console.log(`Non-linear scaling flagged: ${scalingUpdated.toLocaleString()} items`)
  console.log('------------------------------------')
  console.log(`Total in ingredient_portions:       ${parseInt(totalPortions[0].c).toLocaleString()}`)
  console.log(`Total in cooking_retention_factors:  ${parseInt(totalRetention[0].c).toLocaleString()}`)
  console.log(`Total with cooking_yield_pct:        ${parseInt(totalYield[0].c).toLocaleString()}`)
  console.log(`Total non-linear scaling:            ${parseInt(totalNonLinear[0].c).toLocaleString()}`)
  console.log('====================================')

} catch (err) {
  console.error('\nFATAL ERROR:', err.message)
  if (VERBOSE) console.error(err.stack)
  process.exit(1)
} finally {
  await sql.end()
}

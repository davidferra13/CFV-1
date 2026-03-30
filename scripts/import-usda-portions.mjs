#!/usr/bin/env node
/**
 * USDA Portion Data Import Script
 *
 * Imports all portion measures from food_portion.csv into ingredient_portions table.
 * Links via system_ingredients.usda_fdc_id -> food_portion.fdc_id.
 * Also updates cup_weight_grams and tbsp_weight_grams on system_ingredients.
 *
 * Idempotent: uses ON CONFLICT DO NOTHING on (system_ingredient_id, measure_description).
 *
 * Usage: node scripts/import-usda-portions.mjs [--dry-run] [--verbose]
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
// Load CSV
// ---------------------------------------------------------------------------
console.log('USDA Portion Import')
console.log('====================')
if (DRY_RUN) console.log('*** DRY RUN - no database writes ***\n')

console.log('Loading food_portion.csv...')
const portionCsv = readFileSync(DATA_DIR + 'food_portion.csv', 'utf8')
const portions = parse(portionCsv, { columns: true, skip_empty_lines: true })
console.log(`  Loaded ${portions.length} portion records`)

// ---------------------------------------------------------------------------
// Connect and import
// ---------------------------------------------------------------------------
if (DRY_RUN) {
  // Show stats without DB connection
  const byFdc = {}
  for (const p of portions) {
    byFdc[p.fdc_id] = (byFdc[p.fdc_id] || 0) + 1
  }
  console.log(`\n--- DRY RUN SUMMARY ---`)
  console.log(`Unique FDC IDs with portions: ${Object.keys(byFdc).length}`)
  console.log(`Total portion records: ${portions.length}`)
  console.log(`\nSample records:`)
  for (const p of portions.slice(0, 10)) {
    console.log(`  FDC ${p.fdc_id}: ${p.amount} x "${p.modifier || p.portion_description}" = ${p.gram_weight}g`)
  }
  process.exit(0)
}

const sql = postgres(CONNECTION, {
  max: 5,
  idle_timeout: 20,
  connect_timeout: 10,
})

try {
  // Build lookup: usda_fdc_id -> system_ingredient_id
  console.log('\nLoading system_ingredients FDC mapping...')
  const siRows = await sql`
    SELECT id, usda_fdc_id FROM system_ingredients
    WHERE usda_fdc_id IS NOT NULL AND is_active = true
  `
  const fdcToSi = new Map()
  for (const row of siRows) {
    fdcToSi.set(String(row.usda_fdc_id), row.id)
  }
  console.log(`  ${fdcToSi.size} system_ingredients have FDC IDs`)

  let inserted = 0
  let skipped = 0
  let cupUpdated = 0
  let tbspUpdated = 0

  const BATCH_SIZE = 100
  console.log(`\nInserting ${portions.length} portion records...`)

  for (let i = 0; i < portions.length; i += BATCH_SIZE) {
    const batch = portions.slice(i, i + BATCH_SIZE)

    for (const p of batch) {
      const siId = fdcToSi.get(p.fdc_id)
      if (!siId) {
        skipped++
        continue
      }

      const gramWeight = parseFloat(p.gram_weight)
      const amount = parseFloat(p.amount) || 1
      if (isNaN(gramWeight) || gramWeight <= 0) {
        skipped++
        continue
      }

      const perUnit = gramWeight / amount
      const desc = (p.modifier || p.portion_description || 'serving').trim()
      if (!desc) {
        skipped++
        continue
      }

      // Build a clean measure description
      const measureDesc = amount !== 1
        ? `${amount} ${desc}`
        : desc

      try {
        await sql`
          INSERT INTO ingredient_portions (
            system_ingredient_id, measure_description, gram_weight, sequence_number
          ) VALUES (
            ${siId}, ${measureDesc}, ${perUnit}, ${parseInt(p.seq_num) || null}
          )
          ON CONFLICT (system_ingredient_id, measure_description) DO NOTHING
        `
        inserted++
        log(`Inserted: ${measureDesc} = ${perUnit}g for SI ${siId}`)
      } catch (err) {
        log(`Error inserting portion: ${err.message}`)
        skipped++
        continue
      }

      // Update cup_weight_grams if this is a cup measure
      const descLower = desc.toLowerCase()
      if (/\bcup\b/.test(descLower) && !/tbsp|tablespoon|teaspoon|tsp/.test(descLower)) {
        await sql`
          UPDATE system_ingredients
          SET cup_weight_grams = ${perUnit}
          WHERE id = ${siId} AND cup_weight_grams IS NULL
        `
        cupUpdated++
      }

      // Update tbsp_weight_grams if this is a tablespoon measure
      if (/\btbsp\b|\btablespoon\b/.test(descLower)) {
        await sql`
          UPDATE system_ingredients
          SET tbsp_weight_grams = ${perUnit}
          WHERE id = ${siId} AND tbsp_weight_grams IS NULL
        `
        tbspUpdated++
      }
    }

    // Progress
    const pct = Math.round((i + batch.length) / portions.length * 100)
    process.stdout.write(`\r  Progress: ${pct}% (${i + batch.length}/${portions.length})`)
  }
  console.log() // newline

  // Final counts
  const totalPortions = await sql`SELECT COUNT(*) AS c FROM ingredient_portions`

  console.log('\n=============================')
  console.log('USDA Portion Import Summary')
  console.log('=============================')
  console.log(`Portion records processed: ${portions.length.toLocaleString()}`)
  console.log(`Inserted:                 ${inserted.toLocaleString()}`)
  console.log(`Skipped (no match/bad):   ${skipped.toLocaleString()}`)
  console.log(`Cup weights updated:      ${cupUpdated.toLocaleString()}`)
  console.log(`Tbsp weights updated:     ${tbspUpdated.toLocaleString()}`)
  console.log(`Total in table:           ${parseInt(totalPortions[0].c).toLocaleString()}`)
  console.log('=============================')

} catch (err) {
  console.error('\nFATAL ERROR:', err.message)
  if (VERBOSE) console.error(err.stack)
  process.exit(1)
} finally {
  await sql.end()
}

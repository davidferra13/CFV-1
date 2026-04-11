#!/usr/bin/env node
/**
 * Backfill system_ingredient_id on existing chef ingredients.
 *
 * Uses trigram similarity (pg_trgm) to match each unlinked ingredient
 * name against system_ingredients. Only writes when similarity >= threshold.
 *
 * Usage:
 *   node scripts/backfill-ingredient-links.mjs              # dry run (default)
 *   node scripts/backfill-ingredient-links.mjs --apply      # write to DB
 *   node scripts/backfill-ingredient-links.mjs --threshold 0.7  # stricter matching
 *
 * Safety: only fills NULL system_ingredient_id. Never overwrites manual links.
 */

import postgres from 'postgres'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir   = dirname(fileURLToPath(import.meta.url))
const PROJECT = join(__dir, '..')

try {
  const env = readFileSync(join(PROJECT, '.env.local'), 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
} catch {}

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const args         = process.argv.slice(2)
const DRY_RUN      = !args.includes('--apply')
const THRESHOLD    = parseFloat(args[args.indexOf('--threshold') + 1]) || 0.65
const BATCH_SIZE   = 200

const sql = postgres(DATABASE_URL, { max: 3 })

console.log('=== Ingredient Link Backfill ===')
console.log(`Mode:      ${DRY_RUN ? 'DRY RUN (pass --apply to write)' : 'APPLY'}`)
console.log(`Threshold: ${THRESHOLD}`)
console.log()

async function main() {
  // Count unlinked ingredients
  const [{ unlinked }] = await sql`
    SELECT COUNT(*) AS unlinked
    FROM ingredients
    WHERE system_ingredient_id IS NULL
      AND name IS NOT NULL AND name != ''
  `
  console.log(`Unlinked ingredients: ${unlinked}`)

  if (Number(unlinked) === 0) {
    console.log('Nothing to do.')
    await sql.end()
    return
  }

  // Find all unlinked ingredients with their best system_ingredient match
  console.log(`\nFinding matches at similarity >= ${THRESHOLD}...`)

  const candidates = await sql`
    SELECT
      i.id              AS ingredient_id,
      i.name            AS ingredient_name,
      i.tenant_id,
      si.id             AS system_id,
      si.name           AS system_name,
      extensions.similarity(lower(i.name), lower(si.name)) AS sim
    FROM ingredients i
    CROSS JOIN LATERAL (
      SELECT si2.id, si2.name,
             extensions.similarity(lower(i.name), lower(si2.name)) AS sim
      FROM system_ingredients si2
      WHERE si2.is_active = true
        AND extensions.similarity(lower(i.name), lower(si2.name)) > ${THRESHOLD}
      ORDER BY sim DESC
      LIMIT 1
    ) si
    WHERE i.system_ingredient_id IS NULL
      AND i.name IS NOT NULL AND i.name != ''
    ORDER BY sim DESC
  `

  if (candidates.length === 0) {
    console.log(`No matches found at threshold ${THRESHOLD}.`)
    console.log('Try a lower threshold: node scripts/backfill-ingredient-links.mjs --threshold 0.5')
    await sql.end()
    return
  }

  console.log(`\nFound ${candidates.length} matchable ingredients:\n`)

  // Print preview table
  const preview = candidates.slice(0, 30)
  for (const c of preview) {
    const simStr = `${(Number(c.sim) * 100).toFixed(0)}%`
    console.log(`  ${simStr.padEnd(5)} "${c.ingredient_name}" → "${c.system_name}"`)
  }
  if (candidates.length > 30) {
    console.log(`  ... and ${candidates.length - 30} more`)
  }

  if (DRY_RUN) {
    console.log(`\nDry run complete. Re-run with --apply to write ${candidates.length} links.`)
    await sql.end()
    return
  }

  // Apply in batches
  console.log(`\nApplying ${candidates.length} links in batches of ${BATCH_SIZE}...`)
  let applied = 0

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE)

    for (const c of batch) {
      await sql`
        UPDATE ingredients
        SET system_ingredient_id = ${c.system_id}
        WHERE id = ${c.ingredient_id}
          AND system_ingredient_id IS NULL
      `
    }

    applied += batch.length
    console.log(`  ${applied}/${candidates.length} applied...`)
  }

  // Final report
  const [{ remaining }] = await sql`
    SELECT COUNT(*) AS remaining FROM ingredients WHERE system_ingredient_id IS NULL
  `
  const [{ linked }] = await sql`
    SELECT COUNT(*) AS linked FROM ingredients WHERE system_ingredient_id IS NOT NULL
  `

  console.log(`\nDone.`)
  console.log(`Linked:    ${linked}`)
  console.log(`Remaining: ${remaining} (no match above threshold)`)

  await sql.end()
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })

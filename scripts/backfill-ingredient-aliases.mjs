#!/usr/bin/env node
/**
 * Backfill Ingredient Aliases
 *
 * Processes every active, non-archived chef ingredient across ALL tenants that
 * does not yet have an alias row. For each one, runs pg_trgm similarity against
 * system_ingredients and auto-confirms the match when the top score >= 0.75.
 *
 * This is a one-time backfill for existing data. Going forward, suggestMatchesAction
 * handles auto-confirm in real time as chefs add ingredients.
 *
 * Usage:
 *   node scripts/backfill-ingredient-aliases.mjs [--dry-run] [--limit N] [--verbose]
 *
 * Flags:
 *   --dry-run   Show what would be matched without writing to the database.
 *   --limit N   Process at most N ingredients (useful for smoke testing).
 *   --verbose   Print every match decision.
 */

import postgres from 'postgres'

const sql = postgres('postgresql://postgres:postgres@127.0.0.1:54322/postgres')

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const VERBOSE = args.includes('--verbose')
const limitIdx = args.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : null

const AUTO_CONFIRM_THRESHOLD = 0.75
const BATCH_SIZE = 50

// -----------------------------------------------------------------------
// Normalization (mirrors ingredient-matching-utils.ts - no TS import needed)
// -----------------------------------------------------------------------

const ABBREVIATIONS = {
  evoo: 'extra virgin olive oil',
  'ap flour': 'all purpose flour',
  'a.p. flour': 'all purpose flour',
  ap: 'all purpose',
  tbsp: 'tablespoon',
  tsp: 'teaspoon',
  pkg: 'package',
  pkt: 'packet',
  lg: 'large',
  sm: 'small',
  med: 'medium',
  oz: 'ounce',
  lb: 'pound',
  lbs: 'pound',
  qt: 'quart',
  pt: 'pint',
  gal: 'gallon',
}

const ARTICLES = new Set(['a', 'an', 'the', 'of'])

function normalizeIngredientName(name) {
  let result = name.trim().toLowerCase()
  result = result.replace(/[()]/g, ' ')
  result = result.replace(/[,.'"/]/g, ' ')
  result = result.replace(/-/g, ' ')
  result = result.replace(/\s+/g, ' ').trim()

  for (const [abbr, expanded] of Object.entries(ABBREVIATIONS)) {
    const escaped = abbr.replace(/\./g, '\\.')
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi')
    result = result.replace(regex, expanded)
  }

  const tokens = result.split(' ').filter((t) => !ARTICLES.has(t))
  // Simple depluralize: strip trailing 's' for words > 3 chars (rough but sufficient for scoring)
  const singular = tokens.map((t) => {
    if (t.length > 3 && t.endsWith('es') && !t.endsWith('ies')) return t.slice(0, -2)
    if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss')) return t.slice(0, -1)
    return t
  })

  return singular.join(' ').replace(/\s+/g, ' ').trim()
}

// -----------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------

async function main() {
  console.log('=== Ingredient Alias Backfill ===')
  if (DRY_RUN) console.log('[DRY RUN] No writes will occur.')
  console.log('')

  // 1. Get all active, non-archived ingredients without an alias row
  const unmatchedRows = await sql`
    SELECT
      i.id,
      i.tenant_id,
      i.name,
      i.weight_to_volume_ratio
    FROM ingredients i
    LEFT JOIN ingredient_aliases ia
      ON ia.ingredient_id = i.id
      AND ia.tenant_id    = i.tenant_id
    WHERE i.archived = false
      AND ia.id IS NULL
    ORDER BY i.tenant_id, i.name
    ${LIMIT ? sql`LIMIT ${LIMIT}` : sql``}
  `

  console.log(`Found ${unmatchedRows.length} unmatched ingredients across all tenants.`)
  console.log('')

  let confirmed = 0
  let belowThreshold = 0
  let noMatch = 0
  let errors = 0

  // Process in batches to avoid overwhelming the DB
  for (let i = 0; i < unmatchedRows.length; i += BATCH_SIZE) {
    const batch = unmatchedRows.slice(i, i + BATCH_SIZE)

    for (const ingredient of batch) {
      const normalized = normalizeIngredientName(ingredient.name)

      try {
        // Run trigram similarity against system_ingredients
        const matches = await sql`
          SELECT
            id,
            name,
            category,
            weight_to_volume_ratio,
            cup_weight_grams,
            extensions.similarity(lower(name), ${normalized}) AS score
          FROM system_ingredients
          WHERE extensions.similarity(lower(name), ${normalized}) > 0.3
            AND is_active = true
          ORDER BY score DESC
          LIMIT 1
        `

        if (matches.length === 0) {
          if (VERBOSE) console.log(`  NO MATCH  "${ingredient.name}" (normalized: "${normalized}")`)
          noMatch++
          continue
        }

        const top = matches[0]
        const score = parseFloat(top.score)

        if (score < AUTO_CONFIRM_THRESHOLD) {
          if (VERBOSE) {
            console.log(
              `  SKIP      "${ingredient.name}" -> "${top.name}" (score: ${score.toFixed(3)} < ${AUTO_CONFIRM_THRESHOLD})`
            )
          }
          belowThreshold++
          continue
        }

        if (VERBOSE || DRY_RUN) {
          console.log(
            `  CONFIRM   "${ingredient.name}" -> "${top.name}" (score: ${score.toFixed(3)}) [tenant: ${ingredient.tenant_id.slice(0, 8)}...]`
          )
        }

        if (!DRY_RUN) {
          // Insert alias
          await sql`
            INSERT INTO ingredient_aliases
              (tenant_id, ingredient_id, system_ingredient_id, match_method, similarity_score, confirmed_at, confirmed_by)
            VALUES
              (${ingredient.tenant_id}, ${ingredient.id}, ${top.id}, 'trigram', ${score}, now(), NULL)
            ON CONFLICT (tenant_id, ingredient_id) DO NOTHING
          `

          // Copy density data if the chef's ingredient is missing it
          if (!ingredient.weight_to_volume_ratio && top.weight_to_volume_ratio) {
            await sql`
              UPDATE ingredients
              SET weight_to_volume_ratio = ${top.weight_to_volume_ratio}
              WHERE id        = ${ingredient.id}
                AND tenant_id = ${ingredient.tenant_id}
                AND weight_to_volume_ratio IS NULL
            `
          }
        }

        confirmed++
      } catch (err) {
        console.error(`  ERROR     "${ingredient.name}":`, err.message)
        errors++
      }
    }

    // Progress indicator every 200 ingredients
    if (!VERBOSE && (i + BATCH_SIZE) % 200 === 0) {
      const done = Math.min(i + BATCH_SIZE, unmatchedRows.length)
      console.log(`  Progress: ${done} / ${unmatchedRows.length}`)
    }
  }

  console.log('')
  console.log('=== Results ===')
  console.log(`  Auto-confirmed (>= ${AUTO_CONFIRM_THRESHOLD}): ${confirmed}`)
  console.log(`  Below threshold:                        ${belowThreshold}`)
  console.log(`  No match found (< 0.3 similarity):     ${noMatch}`)
  if (errors > 0) console.log(`  Errors:                                 ${errors}`)
  console.log('')

  if (DRY_RUN) {
    console.log('[DRY RUN] No rows were written.')
  } else {
    console.log(`Done. ${confirmed} ingredient aliases created.`)
    if (belowThreshold > 0) {
      console.log(
        `${belowThreshold} ingredients scored between 0.3 and ${AUTO_CONFIRM_THRESHOLD} - these still require manual chef review in the costing UI.`
      )
    }
  }

  await sql.end()
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})

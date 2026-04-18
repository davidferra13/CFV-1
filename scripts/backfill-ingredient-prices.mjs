#!/usr/bin/env node
/**
 * Backfill Ingredient Prices
 *
 * One-time script to enrich legacy ingredients that have no price data.
 * For each unpriced ingredient:
 *   1. Auto-match to system_ingredients via pg_trgm (if no alias exists)
 *   2. Resolve best available price from Pi's 10-tier chain
 *   3. Write last_price_cents, last_price_source, last_price_store, last_price_confidence
 *
 * Usage:
 *   node scripts/backfill-ingredient-prices.mjs [--dry-run] [--limit N]
 *
 * Safe to re-run: skips ingredients that already have prices.
 */

import postgres from 'postgres'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OPENCLAW_API = process.env.OPENCLAW_API_URL || 'http://10.0.0.177:8081'

// Parse args
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const limitIdx = args.indexOf('--limit')
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : 500

// Load DB URL from .env.local
let dbUrl
try {
  const env = readFileSync(resolve(__dirname, '../.env.local'), 'utf8')
  const match = env.match(/^DATABASE_URL=(.+)$/m)
  if (match) dbUrl = match[1].trim()
} catch { /* ignore */ }

if (!dbUrl) {
  console.error('DATABASE_URL not found in .env.local')
  process.exit(1)
}

const sql = postgres(dbUrl)

function normalizeIngredientName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s-]/g, '')
}

async function main() {
  console.log(`Backfill Ingredient Prices${dryRun ? ' (DRY RUN)' : ''}`)
  console.log(`Limit: ${limit}`)
  console.log('')

  // Find unpriced ingredients across all tenants
  const unpriced = await sql`
    SELECT i.id, i.name, i.tenant_id
    FROM ingredients i
    WHERE i.last_price_cents IS NULL
      AND i.archived = false
      AND i.name IS NOT NULL
      AND trim(i.name) != ''
    ORDER BY i.created_at DESC
    LIMIT ${limit}
  `

  console.log(`Found ${unpriced.length} unpriced ingredients`)
  if (unpriced.length === 0) {
    console.log('Nothing to do.')
    await sql.end()
    return
  }

  let matched = 0
  let priced = 0
  let skipped = 0
  let errors = 0

  for (let idx = 0; idx < unpriced.length; idx++) {
    const ing = unpriced[idx]
    const normalized = normalizeIngredientName(ing.name)
    if (!normalized || normalized.length < 2) {
      skipped++
      continue
    }

    const progress = `[${idx + 1}/${unpriced.length}]`

    try {
      // Step 1: Check if alias already exists
      const [existingAlias] = await sql`
        SELECT id FROM ingredient_aliases
        WHERE tenant_id = ${ing.tenant_id}
          AND ingredient_id = ${ing.id}
        LIMIT 1
      `

      if (!existingAlias) {
        // pg_trgm match to system_ingredients
        const matches = await sql`
          SELECT id, name, extensions.similarity(lower(name), ${normalized}) AS score
          FROM system_ingredients
          WHERE extensions.similarity(lower(name), ${normalized}) > 0.4
            AND is_active = true
          ORDER BY score DESC
          LIMIT 1
        `

        if (matches.length > 0 && matches[0].score >= 0.5) {
          const best = matches[0]
          if (!dryRun) {
            await sql`
              INSERT INTO ingredient_aliases (tenant_id, ingredient_id, system_ingredient_id, match_method, similarity_score)
              VALUES (${ing.tenant_id}, ${ing.id}, ${best.id}, 'trigram_backfill', ${best.score})
              ON CONFLICT DO NOTHING
            `
          }
          matched++
          console.log(`${progress} MATCH: "${ing.name}" -> "${best.name}" (${(best.score * 100).toFixed(0)}%)`)
        }
      }

      // Step 2: Ask Pi for price via batch lookup
      const res = await fetch(`${OPENCLAW_API}/api/lookup/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: [ing.name] }),
        signal: AbortSignal.timeout(5000),
      }).catch(() => null)

      if (res?.ok) {
        const data = await res.json()
        const results = data.results || data.ingredients || []
        const match = results.find(r =>
          r.name?.toLowerCase() === ing.name.toLowerCase() ||
          r.query?.toLowerCase() === ing.name.toLowerCase()
        ) || results[0]

        if (match && (match.best_price_cents || match.price_cents)) {
          const cents = match.best_price_cents || match.price_cents
          const store = match.best_store || match.store || null
          const source = match.source || 'openclaw_backfill'
          const confidence = match.confidence || 0.5

          if (!dryRun) {
            await sql`
              UPDATE ingredients
              SET last_price_cents = ${cents},
                  last_price_source = ${source},
                  last_price_store = ${store},
                  last_price_confidence = ${confidence}
              WHERE id = ${ing.id}
                AND tenant_id = ${ing.tenant_id}
                AND last_price_cents IS NULL
            `
          }
          priced++
          console.log(`${progress} PRICED: "${ing.name}" = $${(cents / 100).toFixed(2)} @ ${store || 'unknown'}`)
          continue
        }
      }

      // Step 3: Fallback - check sibling aliases for price
      const [alias] = await sql`
        SELECT system_ingredient_id FROM ingredient_aliases
        WHERE tenant_id = ${ing.tenant_id}
          AND ingredient_id = ${ing.id}
        LIMIT 1
      `

      if (alias?.system_ingredient_id) {
        const siblings = await sql`
          SELECT ia.ingredient_id, i.last_price_cents, i.last_price_source, i.last_price_store, i.last_price_confidence
          FROM ingredient_aliases ia
          JOIN ingredients i ON i.id = ia.ingredient_id AND i.tenant_id = ia.tenant_id
          WHERE ia.tenant_id = ${ing.tenant_id}
            AND ia.system_ingredient_id = ${alias.system_ingredient_id}
            AND ia.ingredient_id != ${ing.id}
            AND i.last_price_cents IS NOT NULL
          LIMIT 1
        `

        if (siblings.length > 0) {
          const sib = siblings[0]
          if (!dryRun) {
            await sql`
              UPDATE ingredients
              SET last_price_cents = ${sib.last_price_cents},
                  last_price_source = ${'sibling_alias'},
                  last_price_store = ${sib.last_price_store},
                  last_price_confidence = ${(sib.last_price_confidence || 0.5) * 0.8}
              WHERE id = ${ing.id}
                AND tenant_id = ${ing.tenant_id}
                AND last_price_cents IS NULL
            `
          }
          priced++
          console.log(`${progress} SIBLING: "${ing.name}" = $${(sib.last_price_cents / 100).toFixed(2)} (via sibling alias)`)
          continue
        }
      }

      console.log(`${progress} SKIP: "${ing.name}" - no price found`)
      skipped++
    } catch (err) {
      console.error(`${progress} ERROR: "${ing.name}" - ${err.message}`)
      errors++
    }
  }

  console.log('')
  console.log('=== Summary ===')
  console.log(`Total processed: ${unpriced.length}`)
  console.log(`Matched to system: ${matched}`)
  console.log(`Priced: ${priced}`)
  console.log(`Skipped (no data): ${skipped}`)
  console.log(`Errors: ${errors}`)
  if (dryRun) console.log('(DRY RUN - no changes written)')

  await sql.end()
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})

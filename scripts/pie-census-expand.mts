/**
 * PIE Census Expand - Find and link naked ingredients
 *
 * Discovers canonical_ingredients with no normalization_map link
 * and attempts to create links by fuzzy-matching against products
 * that have prices.
 *
 * Run: npx tsx scripts/pie-census-expand.mts [--dry-run] [--limit=500]
 *
 * Exit codes: 0 = success, 1 = error
 */

import postgres from 'postgres'

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = postgres(DB_URL, { connect_timeout: 10 })

const dryRun = process.argv.includes('--dry-run')
const limitArg = process.argv.find(a => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 500

async function main() {
  const startTime = Date.now()

  // 1. Find naked ingredients (no norm link)
  const naked = await sql`
    SELECT ci.ingredient_id, ci.name, ci.category
    FROM openclaw.canonical_ingredients ci
    LEFT JOIN openclaw.normalization_map nm ON nm.canonical_ingredient_id = ci.ingredient_id
    WHERE nm.canonical_ingredient_id IS NULL
    ORDER BY ci.name
    LIMIT ${limit}
  `

  process.stderr.write(`Found ${naked.length} naked ingredients (limit: ${limit})\n`)

  if (naked.length === 0) {
    process.stderr.write('Nothing to do. Census fully linked.\n')
    await sql.end()
    process.exit(0)
  }

  let linked = 0
  let skipped = 0
  let failed = 0

  for (const row of naked) {
    const name = (row.name as string).toLowerCase().trim()

    // Try exact match first
    const exactMatch = await sql`
      SELECT p.id, p.name
      FROM openclaw.products p
      JOIN openclaw.store_products sp ON sp.product_id = p.id AND sp.price_cents > 0
      WHERE LOWER(TRIM(p.name)) = ${name}
        AND p.is_food = true
      LIMIT 1
    `

    if (exactMatch.length > 0) {
      if (!dryRun) {
        await sql`
          INSERT INTO openclaw.normalization_map (raw_name, canonical_ingredient_id, method, confidence)
          VALUES (${exactMatch[0].name}, ${row.ingredient_id}, 'exact', 1.0)
          ON CONFLICT DO NOTHING
        `
      }
      linked++
      continue
    }

    // Try trigram similarity (requires pg_trgm extension)
    try {
      const trigramMatch = await sql`
        SELECT p.id, p.name, extensions.similarity(LOWER(TRIM(p.name)), ${name}) as sim
        FROM openclaw.products p
        JOIN openclaw.store_products sp ON sp.product_id = p.id AND sp.price_cents > 0
        WHERE p.is_food = true
          AND extensions.similarity(LOWER(TRIM(p.name)), ${name}) > 0.6
        ORDER BY sim DESC
        LIMIT 1
      `

      if (trigramMatch.length > 0) {
        const sim = trigramMatch[0].sim as number
        if (sim >= 0.85) {
          // High confidence - auto-link
          if (!dryRun) {
            await sql`
              INSERT INTO openclaw.normalization_map (raw_name, canonical_ingredient_id, method, confidence)
              VALUES (${trigramMatch[0].name}, ${row.ingredient_id}, 'trigram', ${sim})
              ON CONFLICT DO NOTHING
            `
          }
          linked++
        } else {
          // Medium confidence - skip (needs review)
          skipped++
        }
      } else {
        skipped++
      }
    } catch {
      // Trigram not available or query failed
      skipped++
      failed++
    }

    // Progress every 100
    if ((linked + skipped) % 100 === 0) {
      process.stderr.write(`  Progress: ${linked} linked, ${skipped} skipped / ${naked.length}\n`)
    }
  }

  const elapsed = Date.now() - startTime

  const summary = {
    timestamp: new Date().toISOString(),
    dry_run: dryRun,
    processed: naked.length,
    linked,
    skipped,
    failed,
    elapsed_ms: elapsed,
  }

  console.log(JSON.stringify(summary, null, 2))

  process.stderr.write(`\n--- CENSUS EXPAND ${dryRun ? '(DRY RUN)' : ''} ---\n`)
  process.stderr.write(`Processed: ${naked.length}\n`)
  process.stderr.write(`Linked: ${linked}\n`)
  process.stderr.write(`Skipped: ${skipped} (below confidence threshold)\n`)
  process.stderr.write(`Failed: ${failed}\n`)
  process.stderr.write(`Time: ${elapsed}ms\n`)

  if (dryRun) {
    process.stderr.write('\nDry run complete. No changes made. Remove --dry-run to execute.\n')
  }

  await sql.end()
}

main().catch(async (e) => {
  process.stderr.write(`FATAL: ${e.message}\n`)
  await sql.end()
  process.exit(1)
})

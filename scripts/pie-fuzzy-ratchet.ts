/**
 * PIE Fuzzy Ratchet - Link naked ingredients via pg_trgm similarity
 *
 * Finds food ingredients in the census with no normalization_map entry,
 * then uses PostgreSQL trigram similarity to find the best product match.
 * Inserts matches above threshold into normalization_map.
 *
 * Threshold: 0.4 (pg_trgm similarity score)
 * Method: 'fuzzy-ratchet'
 * Confidence: raw similarity score
 *
 * Run: npx tsx scripts/pie-fuzzy-ratchet.ts [--dry-run] [--threshold=0.4] [--limit=5000]
 *
 * Exit codes: 0 = success, 1 = error
 */

import postgres from 'postgres'

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = postgres(DB_URL, { connect_timeout: 10 })

const DRY_RUN = process.argv.includes('--dry-run')
const thresholdArg = process.argv.find((a) => a.startsWith('--threshold='))
const THRESHOLD = thresholdArg ? parseFloat(thresholdArg.split('=')[1]) : 0.4
const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : 5000
const BATCH_SIZE = 100

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NakedIngredient {
  ingredient_id: string
  name: string
  category: string | null
}

interface MatchResult {
  ingredientId: string
  ingredientName: string
  productName: string
  similarity: number
  linked: boolean
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const startTime = Date.now()

  process.stderr.write(`\n=== PIE FUZZY RATCHET ${DRY_RUN ? '(DRY RUN)' : ''} ===\n`)
  process.stderr.write(`Threshold: ${THRESHOLD} | Batch: ${BATCH_SIZE} | Limit: ${LIMIT}\n\n`)

  // 1. Find naked ingredients (in census, no normalization_map entry)
  const naked: NakedIngredient[] = await sql`
    SELECT ci.ingredient_id, ci.name, ci.category
    FROM openclaw.canonical_ingredients ci
    LEFT JOIN openclaw.normalization_map nm
      ON nm.canonical_ingredient_id = ci.ingredient_id
    WHERE nm.canonical_ingredient_id IS NULL
    ORDER BY ci.name
    LIMIT ${LIMIT}
  `

  process.stderr.write(`Found ${naked.length} naked ingredients (limit: ${LIMIT})\n`)

  if (naked.length === 0) {
    process.stderr.write('Nothing to do. Census fully linked.\n')
    await sql.end()
    process.exit(0)
  }

  // Stats
  let matched = 0
  let inserted = 0
  let belowThreshold = 0
  let noMatch = 0
  let errors = 0
  let totalConfidence = 0
  const topMisses: Array<{ name: string; bestSim: number; bestProduct: string }> = []

  // 2. Process in batches
  for (let offset = 0; offset < naked.length; offset += BATCH_SIZE) {
    const batch = naked.slice(offset, offset + BATCH_SIZE)

    for (const row of batch) {
      const name = row.name.toLowerCase().trim()

      try {
        // Use pg_trgm similarity to find best product match
        // extensions schema holds pg_trgm (installed there by migrations)
        const matches = await sql`
          SELECT
            p.id,
            p.name,
            extensions.similarity(LOWER(TRIM(p.name)), ${name}) as sim
          FROM openclaw.products p
          JOIN openclaw.store_products sp
            ON sp.product_id = p.id AND sp.price_cents > 0
          WHERE p.is_food = true
            AND extensions.similarity(LOWER(TRIM(p.name)), ${name}) >= ${THRESHOLD}
          ORDER BY sim DESC
          LIMIT 1
        `

        if (matches.length === 0) {
          noMatch++
          topMisses.push({ name: row.name, bestSim: 0, bestProduct: '(none)' })
          continue
        }

        const best = matches[0]
        const sim = parseFloat(String(best.sim))

        matched++
        totalConfidence += sim

        if (!DRY_RUN) {
          try {
            await sql`
              INSERT INTO openclaw.normalization_map (
                raw_name, canonical_ingredient_id, method, confidence
              ) VALUES (
                ${best.name}, ${row.ingredient_id}, 'fuzzy-ratchet', ${sim}
              )
              ON CONFLICT (raw_name) DO NOTHING
            `
            inserted++
          } catch (insertErr: unknown) {
            // PK conflict or other constraint; count but continue
            errors++
          }
        } else {
          inserted++
        }
      } catch (queryErr: unknown) {
        errors++
        if (errors <= 3) {
          process.stderr.write(`  Error on "${row.name}": ${queryErr}\n`)
        }
      }
    }

    // Progress
    const processed = Math.min(offset + BATCH_SIZE, naked.length)
    process.stderr.write(
      `  Batch ${Math.floor(offset / BATCH_SIZE) + 1}: ${processed}/${naked.length} processed, ${matched} matched, ${inserted} inserted\n`
    )
  }

  // 3. Report
  const elapsed = Date.now() - startTime
  const avgConfidence = matched > 0 ? (totalConfidence / matched).toFixed(3) : '0'

  // Sort misses by name for readability, keep top 20
  topMisses.sort((a, b) => a.name.localeCompare(b.name))
  const displayMisses = topMisses.slice(0, 20)

  const summary = {
    timestamp: new Date().toISOString(),
    dry_run: DRY_RUN,
    threshold: THRESHOLD,
    total_naked: naked.length,
    matched,
    inserted,
    below_threshold: belowThreshold,
    no_match: noMatch,
    errors,
    avg_confidence: parseFloat(avgConfidence),
    elapsed_ms: elapsed,
    top_misses: displayMisses,
  }

  // JSON to stdout for piping/logging
  console.log(JSON.stringify(summary, null, 2))

  // Human-readable to stderr
  process.stderr.write(`\n--- RESULTS ${DRY_RUN ? '(DRY RUN - nothing written)' : ''} ---\n`)
  process.stderr.write(`Processed:      ${naked.length}\n`)
  process.stderr.write(`Matched:        ${matched} (avg confidence: ${avgConfidence})\n`)
  process.stderr.write(`Inserted:       ${inserted}\n`)
  process.stderr.write(`No match:       ${noMatch}\n`)
  process.stderr.write(`Errors:         ${errors}\n`)
  process.stderr.write(`Time:           ${elapsed}ms\n`)

  if (displayMisses.length > 0) {
    process.stderr.write(`\nTop misses (no product match above ${THRESHOLD}):\n`)
    for (const miss of displayMisses) {
      process.stderr.write(`  - ${miss.name}\n`)
    }
  }

  await sql.end()
  process.exit(errors > naked.length / 2 ? 1 : 0)
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`)
  process.exit(1)
})

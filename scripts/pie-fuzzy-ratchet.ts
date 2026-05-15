/**
 * PIE Fuzzy Ratchet v2 - Multi-strategy matching for naked ingredients
 *
 * Closes the coverage gap by matching ~8,360 naked food ingredients against
 * 7.8M products using a tiered strategy:
 *
 *   Tier 1: Normalized exact match (SQL-level normalization function)
 *   Tier 2: pg_trgm similarity with pre-filtered candidates (GIN index)
 *   Tier 3: Token overlap + Levenshtein scoring (local engine)
 *
 * Confidence tiers:
 *   >= 0.85: auto-link (insert into normalization_map)
 *   0.70-0.84: review queue (logged for manual confirmation)
 *   < 0.70: skip (too uncertain)
 *
 * Edge cases handled:
 *   - Size variants ("chicken breast 8oz" vs "chicken breast")
 *   - Brand prefixes ("Tyson Chicken Breast" -> "chicken breast")
 *   - Pluralization ("tomatoes" -> "tomato")
 *   - Synonyms via name-normalizer ("scallion" = "green onion")
 *
 * Run: npx tsx scripts/pie-fuzzy-ratchet.ts [--dry-run] [--limit=5000] [--auto-threshold=0.85] [--review-threshold=0.70]
 *
 * Exit codes: 0 = success, 1 = error
 */

import postgres from 'postgres'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = postgres(DB_URL, { connect_timeout: 10, max: 5 })

const DRY_RUN = process.argv.includes('--dry-run')
const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : 8500
const autoThresholdArg = process.argv.find((a) => a.startsWith('--auto-threshold='))
const AUTO_THRESHOLD = autoThresholdArg ? parseFloat(autoThresholdArg.split('=')[1]) : 0.85
const reviewThresholdArg = process.argv.find((a) => a.startsWith('--review-threshold='))
const REVIEW_THRESHOLD = reviewThresholdArg ? parseFloat(reviewThresholdArg.split('=')[1]) : 0.7
const BATCH_SIZE = 50
const TRGM_CUTOFF = 0.35 // pg_trgm pre-filter (broad net, score locally)
const MAX_CANDIDATES = 10 // top N pg_trgm candidates per ingredient

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NakedIngredient {
  ingredient_id: string
  name: string
  category: string | null
}

interface CandidateProduct {
  id: string
  name: string
  sim: number
  price_cents: number
}

interface MatchDecision {
  ingredientId: string
  ingredientName: string
  normalizedQuery: string
  productName: string
  productId: string
  confidence: number
  method: string
  tier: 'auto' | 'review' | 'skip'
  breakdown: {
    trgmSim: number
    tokenOverlap: number
    levenshtein: number
    categoryBonus: number
    lengthPenalty: number
  }
}

interface RatchetReport {
  timestamp: string
  dry_run: boolean
  config: {
    auto_threshold: number
    review_threshold: number
    trgm_cutoff: number
    limit: number
  }
  totals: {
    naked_found: number
    tier1_normalized: number
    tier2_trgm_matched: number
    auto_linked: number
    review_queued: number
    no_match: number
    errors: number
  }
  coverage: {
    before_linked: number
    after_linked: number
    total_census: number
    before_pct: string
    after_pct: string
    delta: string
  }
  avg_confidence: string
  elapsed_ms: number
  review_queue: MatchDecision[]
  top_misses: Array<{ name: string; category: string | null }>
}

// ---------------------------------------------------------------------------
// Local scoring (mirrors fuzzy-match-engine.ts logic, no Pi dependency)
// ---------------------------------------------------------------------------

// Levenshtein distance (optimized single-row)
function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  if (a.length > b.length) [a, b] = [b, a]

  const row = Array.from({ length: a.length + 1 }, (_, i) => i)
  for (let j = 1; j <= b.length; j++) {
    let prev = row[0]
    row[0] = j
    for (let i = 1; i <= a.length; i++) {
      const curr = row[i]
      row[i] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, row[i], row[i - 1])
      prev = curr
    }
  }
  return row[a.length]
}

function levenshteinSim(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(a, b) / maxLen
}

// Token overlap (weighted by token length)
function tokenOverlapScore(queryTokens: string[], candidateTokens: string[]): number {
  if (queryTokens.length === 0) return 0
  let matchedWeight = 0
  let totalWeight = 0

  for (const qt of queryTokens) {
    const weight = Math.max(1, qt.length / 3)
    totalWeight += weight

    if (candidateTokens.includes(qt)) {
      matchedWeight += weight
      continue
    }

    // Fuzzy token match
    let bestSim = 0
    for (const ct of candidateTokens) {
      if (Math.abs(ct.length - qt.length) > Math.max(qt.length, ct.length) * 0.5) continue
      const sim = levenshteinSim(qt, ct)
      if (sim > bestSim) bestSim = sim
    }
    if (bestSim > 0.7) matchedWeight += weight * bestSim
  }

  return totalWeight > 0 ? matchedWeight / totalWeight : 0
}

// Normalize locally (simplified version for scoring; DB does heavy lifting)
function localNormalize(name: string): string {
  let n = name.toLowerCase().trim()

  // Strip brand prefix pattern "Brand - Product"
  const dashIdx = n.indexOf(' - ')
  if (dashIdx > 0 && dashIdx < 30) n = n.slice(dashIdx + 3)

  // Strip size/quantity suffixes: "16 oz", "1 lb", "12 ct"
  n = n.replace(
    /\s*\d+(\.\d+)?\s*(oz|lb|lbs|g|kg|ml|l|ct|pk|pack|count|fl oz|gal|qt|pt)\.?\s*$/i,
    ''
  )

  // Strip parenthetical content
  n = n.replace(/\s*\([^)]*\)\s*/g, ' ')

  // Strip common descriptive prefixes
  const prefixes =
    /^(organic|fresh|frozen|dried|raw|whole|ground|boneless|skinless|unsalted|salted|roasted|natural|pure|real|lite|light|low fat|nonfat|fat free|sugar free|gluten free|all natural|premium|select|choice|fancy|extra|imported|domestic)\s+/g
  for (let i = 0; i < 4; i++) {
    const stripped = n.replace(prefixes, '')
    if (stripped === n) break
    n = stripped
  }

  // Basic singularization
  if (n.endsWith('ies') && n.length > 5) {
    const stem = n.slice(0, -3)
    if (!'aeiou'.includes(stem[stem.length - 1])) n = stem + 'y'
  } else if (n.endsWith('ves') && n.length > 4) {
    n = n.slice(0, -3) + 'f'
  } else if (n.endsWith('es') && n.length > 4 && /[sxz]$|[cs]h$/.test(n.slice(0, -2))) {
    n = n.slice(0, -2)
  } else if (
    n.endsWith('s') &&
    !n.endsWith('ss') &&
    !n.endsWith('us') &&
    !n.endsWith('is') &&
    n.length > 3
  ) {
    n = n.slice(0, -1)
  }

  return n.replace(/\s+/g, ' ').trim()
}

// Combined score for a candidate against a query
function scoreMatch(
  queryNorm: string,
  candidateName: string,
  trgmSim: number,
  queryCategory: string | null
): { confidence: number; breakdown: MatchDecision['breakdown'] } {
  const candNorm = localNormalize(candidateName)
  const queryTokens = queryNorm.split(' ').filter(Boolean)
  const candTokens = candNorm.split(' ').filter(Boolean)

  // Bidirectional token overlap (weighted toward forward match)
  const overlapFwd = tokenOverlapScore(queryTokens, candTokens)
  const overlapRev = tokenOverlapScore(candTokens, queryTokens)
  const tokenOverlap = (overlapFwd * 2 + overlapRev) / 3

  // Full-string Levenshtein
  const levSim = levenshteinSim(queryNorm, candNorm)

  // Length ratio penalty
  const lenRatio =
    Math.min(queryNorm.length, candNorm.length) / Math.max(queryNorm.length, candNorm.length)

  // Category bonus (products don't have category, so this is trgm-boosted heuristic)
  const categoryBonus = 0 // No product category available in this flow

  // Weighted combination
  const confidence = tokenOverlap * 0.4 + levSim * 0.25 + trgmSim * 0.25 + lenRatio * 0.1

  return {
    confidence,
    breakdown: {
      trgmSim,
      tokenOverlap,
      levenshtein: levSim,
      categoryBonus,
      lengthPenalty: lenRatio,
    },
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const startTime = Date.now()

  process.stderr.write(`\n=== PIE FUZZY RATCHET v2 ${DRY_RUN ? '(DRY RUN)' : ''} ===\n`)
  process.stderr.write(
    `Auto-link threshold: ${AUTO_THRESHOLD} | Review threshold: ${REVIEW_THRESHOLD}\n`
  )
  process.stderr.write(
    `pg_trgm pre-filter: ${TRGM_CUTOFF} | Batch: ${BATCH_SIZE} | Limit: ${LIMIT}\n\n`
  )

  // Ensure pg_trgm extension is available
  await sql`SET pg_trgm.similarity_threshold = ${TRGM_CUTOFF}`

  // Get current coverage baseline
  const [{ cnt: totalCensus }] = await sql<[{ cnt: number }]>`
    SELECT COUNT(*)::int as cnt FROM openclaw.canonical_ingredients
  `
  const [{ cnt: beforeLinked }] = await sql<[{ cnt: number }]>`
    SELECT COUNT(DISTINCT canonical_ingredient_id)::int as cnt FROM openclaw.normalization_map
  `

  // ---------------------------------------------------------------------------
  // TIER 1: Normalized exact match (bulk SQL, fast)
  // Find ingredients whose SQL-normalized name matches a product's SQL-normalized name
  // ---------------------------------------------------------------------------

  process.stderr.write('--- TIER 1: Normalized exact match ---\n')

  const tier1Linked = DRY_RUN
    ? await sql<[{ cnt: number }]>`
        SELECT COUNT(*)::int as cnt
        FROM openclaw.canonical_ingredients ci
        LEFT JOIN openclaw.normalization_map nm ON nm.canonical_ingredient_id = ci.ingredient_id
        WHERE nm.canonical_ingredient_id IS NULL
          AND EXISTS (
            SELECT 1 FROM openclaw.products p
            JOIN openclaw.store_products sp ON sp.product_id = p.id AND sp.price_cents > 0
            WHERE p.is_food = true
              AND openclaw.normalize_ingredient_name(p.name) = openclaw.normalize_ingredient_name(ci.name)
          )
      `.then((r) => r[0].cnt)
    : await sql`
        INSERT INTO openclaw.normalization_map (raw_name, canonical_ingredient_id, method, confidence)
        SELECT DISTINCT ON (ci.ingredient_id)
          p.name,
          ci.ingredient_id,
          'fuzzy-ratchet-norm',
          0.95
        FROM openclaw.canonical_ingredients ci
        LEFT JOIN openclaw.normalization_map nm ON nm.canonical_ingredient_id = ci.ingredient_id
        JOIN openclaw.products p ON p.is_food = true
          AND openclaw.normalize_ingredient_name(p.name) = openclaw.normalize_ingredient_name(ci.name)
        JOIN openclaw.store_products sp ON sp.product_id = p.id AND sp.price_cents > 0
        WHERE nm.canonical_ingredient_id IS NULL
        ORDER BY ci.ingredient_id, length(p.name) ASC
        ON CONFLICT (raw_name) DO NOTHING
      `.then((r) => r.count)

  const tier1Count = typeof tier1Linked === 'number' ? tier1Linked : Number(tier1Linked)
  process.stderr.write(`  Tier 1 linked: ${tier1Count}\n`)

  // ---------------------------------------------------------------------------
  // TIER 2+3: pg_trgm candidates -> local scoring
  // ---------------------------------------------------------------------------

  process.stderr.write('\n--- TIER 2+3: Trigram + local scoring ---\n')

  // Get remaining naked ingredients
  const naked: NakedIngredient[] = await sql`
    SELECT ci.ingredient_id, ci.name, ci.category
    FROM openclaw.canonical_ingredients ci
    LEFT JOIN openclaw.normalization_map nm ON nm.canonical_ingredient_id = ci.ingredient_id
    WHERE nm.canonical_ingredient_id IS NULL
    ORDER BY ci.name
    LIMIT ${LIMIT}
  `

  process.stderr.write(`  Remaining naked: ${naked.length}\n`)

  // Stats
  let autoLinked = 0
  let reviewQueued = 0
  let noMatch = 0
  let errors = 0
  let totalConfidence = 0
  const reviewQueue: MatchDecision[] = []
  const topMisses: Array<{ name: string; category: string | null }> = []

  // Process in batches
  for (let offset = 0; offset < naked.length; offset += BATCH_SIZE) {
    const batch = naked.slice(offset, offset + BATCH_SIZE)

    // For each ingredient, find top pg_trgm candidates then score locally
    for (const row of batch) {
      try {
        const queryNorm = localNormalize(row.name)

        // Skip very short names (likely garbage data)
        if (queryNorm.length < 3) {
          noMatch++
          continue
        }

        // Get top N candidates from products using pg_trgm
        const candidates: CandidateProduct[] = await sql`
          SELECT
            p.id,
            p.name,
            extensions.similarity(
              openclaw.normalize_ingredient_name(p.name),
              ${queryNorm}
            ) as sim,
            COALESCE(sp.price_cents, 0) as price_cents
          FROM openclaw.products p
          JOIN openclaw.store_products sp ON sp.product_id = p.id AND sp.price_cents > 0
          WHERE p.is_food = true
            AND openclaw.normalize_ingredient_name(p.name) % ${queryNorm}
          ORDER BY sim DESC
          LIMIT ${MAX_CANDIDATES}
        `

        if (candidates.length === 0) {
          noMatch++
          if (topMisses.length < 50) {
            topMisses.push({ name: row.name, category: row.category })
          }
          continue
        }

        // Score each candidate locally with the full engine
        let bestDecision: MatchDecision | null = null

        for (const cand of candidates) {
          const trgmSim = parseFloat(String(cand.sim))
          const { confidence, breakdown } = scoreMatch(queryNorm, cand.name, trgmSim, row.category)

          if (!bestDecision || confidence > bestDecision.confidence) {
            const tier =
              confidence >= AUTO_THRESHOLD
                ? 'auto'
                : confidence >= REVIEW_THRESHOLD
                  ? 'review'
                  : 'skip'

            bestDecision = {
              ingredientId: row.ingredient_id,
              ingredientName: row.name,
              normalizedQuery: queryNorm,
              productName: cand.name,
              productId: cand.id,
              confidence,
              method: 'fuzzy-ratchet-trgm',
              tier,
              breakdown,
            }
          }
        }

        if (!bestDecision || bestDecision.tier === 'skip') {
          noMatch++
          if (topMisses.length < 50) {
            topMisses.push({ name: row.name, category: row.category })
          }
          continue
        }

        totalConfidence += bestDecision.confidence

        if (bestDecision.tier === 'auto') {
          // High confidence: auto-link
          if (!DRY_RUN) {
            await sql`
              INSERT INTO openclaw.normalization_map (
                raw_name, canonical_ingredient_id, method, confidence
              ) VALUES (
                ${bestDecision.productName},
                ${bestDecision.ingredientId},
                ${bestDecision.method},
                ${Math.round(bestDecision.confidence * 100) / 100}
              )
              ON CONFLICT (raw_name) DO NOTHING
            `
          }
          autoLinked++
        } else {
          // Review queue
          reviewQueue.push(bestDecision)
          reviewQueued++
        }
      } catch (err: unknown) {
        errors++
        if (errors <= 5) {
          process.stderr.write(`  Error on "${row.name}": ${err}\n`)
        }
      }
    }

    // Progress
    const processed = Math.min(offset + BATCH_SIZE, naked.length)
    const pct = ((processed / naked.length) * 100).toFixed(0)
    process.stderr.write(
      `  [${pct}%] ${processed}/${naked.length} | auto:${autoLinked} review:${reviewQueued} miss:${noMatch} err:${errors}\n`
    )
  }

  // ---------------------------------------------------------------------------
  // Coverage delta
  // ---------------------------------------------------------------------------

  const [{ cnt: afterLinked }] = await sql<[{ cnt: number }]>`
    SELECT COUNT(DISTINCT canonical_ingredient_id)::int as cnt FROM openclaw.normalization_map
  `

  const elapsed = Date.now() - startTime
  const totalMatched = autoLinked + reviewQueued
  const avgConf = totalMatched > 0 ? (totalConfidence / totalMatched).toFixed(3) : '0'

  // ---------------------------------------------------------------------------
  // Report
  // ---------------------------------------------------------------------------

  const report: RatchetReport = {
    timestamp: new Date().toISOString(),
    dry_run: DRY_RUN,
    config: {
      auto_threshold: AUTO_THRESHOLD,
      review_threshold: REVIEW_THRESHOLD,
      trgm_cutoff: TRGM_CUTOFF,
      limit: LIMIT,
    },
    totals: {
      naked_found: naked.length + tier1Count,
      tier1_normalized: tier1Count,
      tier2_trgm_matched: autoLinked + reviewQueued,
      auto_linked: autoLinked,
      review_queued: reviewQueued,
      no_match: noMatch,
      errors,
    },
    coverage: {
      before_linked: beforeLinked,
      after_linked: DRY_RUN ? beforeLinked + tier1Count + autoLinked : afterLinked,
      total_census: totalCensus,
      before_pct: ((beforeLinked / totalCensus) * 100).toFixed(1),
      after_pct: (
        ((DRY_RUN ? beforeLinked + tier1Count + autoLinked : afterLinked) / totalCensus) *
        100
      ).toFixed(1),
      delta: `+${tier1Count + autoLinked}`,
    },
    avg_confidence: avgConf,
    elapsed_ms: elapsed,
    review_queue: reviewQueue.slice(0, 100), // Top 100 for manual review
    top_misses: topMisses.slice(0, 30),
  }

  // JSON to stdout (machine-readable)
  console.log(JSON.stringify(report, null, 2))

  // Human-readable summary to stderr
  process.stderr.write(`\n${'='.repeat(60)}\n`)
  process.stderr.write(`PIE FUZZY RATCHET RESULTS ${DRY_RUN ? '(DRY RUN)' : ''}\n`)
  process.stderr.write(`${'='.repeat(60)}\n`)
  process.stderr.write(`\n`)
  process.stderr.write(`COVERAGE DELTA:\n`)
  process.stderr.write(
    `  Before: ${beforeLinked}/${totalCensus} (${report.coverage.before_pct}%)\n`
  )
  process.stderr.write(
    `  After:  ${report.coverage.after_linked}/${totalCensus} (${report.coverage.after_pct}%)\n`
  )
  process.stderr.write(`  Gained: ${report.coverage.delta} ingredients linked\n`)
  process.stderr.write(`\n`)
  process.stderr.write(`BREAKDOWN:\n`)
  process.stderr.write(`  Tier 1 (normalized exact): ${tier1Count}\n`)
  process.stderr.write(
    `  Tier 2+3 (trgm + scored): ${autoLinked} auto-linked, ${reviewQueued} review queue\n`
  )
  process.stderr.write(`  No match found:            ${noMatch}\n`)
  process.stderr.write(`  Errors:                    ${errors}\n`)
  process.stderr.write(`  Avg confidence (matched):  ${avgConf}\n`)
  process.stderr.write(`\n`)
  process.stderr.write(`TIME: ${(elapsed / 1000).toFixed(1)}s\n`)

  if (reviewQueue.length > 0) {
    process.stderr.write(`\nREVIEW QUEUE SAMPLE (top 10):\n`)
    for (const r of reviewQueue.slice(0, 10)) {
      process.stderr.write(
        `  ${r.ingredientName} -> "${r.productName}" (conf: ${r.confidence.toFixed(3)})\n`
      )
    }
  }

  if (topMisses.length > 0) {
    process.stderr.write(`\nTOP MISSES (no product match above ${REVIEW_THRESHOLD}):\n`)
    for (const m of topMisses.slice(0, 15)) {
      process.stderr.write(`  - ${m.name} [${m.category || 'uncategorized'}]\n`)
    }
  }

  process.stderr.write(`\n`)

  await sql.end()
  process.exit(errors > naked.length / 2 ? 1 : 0)
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`)
  process.exit(1)
})

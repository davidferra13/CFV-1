/**
 * PIE Accuracy Bootstrap: Resolved Prices vs Pi Bridge Ground Truth
 *
 * Compares what PIE serves (resolved_prices) against raw store shelf prices
 * from the Pi bridge (1.1M real observations). This measures how accurate
 * PIE's price resolution actually is.
 *
 * Strategy:
 *   1. Sample ingredients from resolved_prices (with their canonical names)
 *   2. Batch-query Pi bridge for real store prices (median_cents)
 *   3. Compute deviation and record in price_predictions
 *   4. Roll up monthly accuracy stats
 *
 * Usage: npx tsx scripts/pie-accuracy-bootstrap.mts [--limit 5000] [--state MA]
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import postgres from 'postgres'
// Inline unit classification + conversion (avoids @/ path alias issues in tsx scripts)
const WEIGHT_UNITS = new Set(['oz', 'ounce', 'ounces', 'lb', 'lbs', 'pound', 'pounds', 'g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms', 'mg'])
const VOLUME_UNITS = new Set(['tsp', 'teaspoon', 'tbsp', 'tablespoon', 'cup', 'cups', 'fl oz', 'fl_oz', 'floz', 'pint', 'pt', 'quart', 'qt', 'gallon', 'gal', 'ml', 'l', 'liter', 'liters', 'dl'])
const COUNT_UNITS = new Set(['each', 'ea', 'piece', 'pieces', 'unit', 'whole', 'bunch', 'head', 'can', 'bag', 'bottle', 'jar', 'package', 'stick', 'slice', 'ct', 'count', 'pk', 'pack', 'box', 'dozen', 'doz'])

type UnitFamily = 'weight' | 'volume' | 'count' | 'unknown'

function getUnitFamily(raw: string): UnitFamily {
  const u = raw.trim().toLowerCase()
  if (WEIGHT_UNITS.has(u)) return 'weight'
  if (VOLUME_UNITS.has(u)) return 'volume'
  if (COUNT_UNITS.has(u)) return 'count'
  return 'unknown'
}

// Convert cents to a common base unit within the same family
// Weight -> cents per oz, Volume -> cents per fl_oz, Count -> cents per each
const WEIGHT_TO_OZ: Record<string, number> = {
  oz: 1, ounce: 1, ounces: 1,
  lb: 16, lbs: 16, pound: 16, pounds: 16,
  g: 1/28.3495, gram: 1/28.3495, grams: 1/28.3495,
  kg: 35.274, kilogram: 35.274, kilograms: 35.274,
  mg: 1/28349.5,
}
const VOLUME_TO_FLOZ: Record<string, number> = {
  'fl oz': 1, fl_oz: 1, floz: 1,
  tsp: 1/6, teaspoon: 1/6,
  tbsp: 0.5, tablespoon: 0.5,
  cup: 8, cups: 8,
  pint: 16, pt: 16,
  quart: 32, qt: 32,
  gallon: 128, gal: 128,
  ml: 1/29.5735, l: 33.814, liter: 33.814, liters: 33.814, dl: 3.3814,
}
const COUNT_TO_EACH: Record<string, number> = {
  each: 1, ea: 1, piece: 1, pieces: 1, unit: 1, whole: 1,
  ct: 1, count: 1, pk: 1, pack: 1, box: 1, bag: 1, bottle: 1, jar: 1,
  can: 1, stick: 1, slice: 1, head: 1, bunch: 1, package: 1,
  dozen: 12, doz: 12,
}

/** Normalize cents to base unit (oz for weight, fl_oz for volume, each for count).
 *  Returns null if unit is unknown or not convertible. */
function normalizeCentsToBase(cents: number, rawUnit: string): number | null {
  const u = rawUnit.trim().toLowerCase()
  if (WEIGHT_TO_OZ[u] !== undefined) return cents / WEIGHT_TO_OZ[u]
  if (VOLUME_TO_FLOZ[u] !== undefined) return cents / VOLUME_TO_FLOZ[u]
  if (COUNT_TO_EACH[u] !== undefined) return cents / COUNT_TO_EACH[u]
  return null
}

const sql = postgres(process.env.DATABASE_URL!, { max: 3 })

const PI_BRIDGE_URL = process.env.PI_BRIDGE_URL || 'http://10.0.0.177:7700'
const BATCH_SIZE = 100
const THRESHOLD_PCT = 15

// --- CLI args ---
const args = process.argv.slice(2)
const limitIdx = args.indexOf('--limit')
const SAMPLE_LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : 5000
const stateIdx = args.indexOf('--state')
const STATE_FILTER = stateIdx >= 0 ? args[stateIdx + 1] : undefined
const SKIP_UNIT_FILTER = args.includes('--no-unit-filter')
const minObsIdx = args.indexOf('--min-observations')
const MIN_OBSERVATIONS = minObsIdx >= 0 ? parseInt(args[minObsIdx + 1]) : 3
const MAX_DEVIATION_CAP = 200 // Skip comparisons with >200% deviation as likely product mismatches
const SKIP_OUTLIER_CAP = args.includes('--no-outlier-cap')
const simIdx = args.indexOf('--min-similarity')
const MIN_SIMILARITY = simIdx >= 0 ? parseFloat(args[simIdx + 1]) : 0.6
const SKIP_NAME_FILTER = args.includes('--no-name-filter')

/** Dice coefficient on character bigrams. 0 = no overlap, 1 = identical. */
function diceSimilarity(a: string, b: string): number {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const bigrams = (s: string): Set<string> => {
    const n = norm(s)
    const set = new Set<string>()
    for (let i = 0; i < n.length - 1; i++) set.add(n.slice(i, i + 2))
    return set
  }
  const setA = bigrams(a)
  const setB = bigrams(b)
  if (setA.size === 0 && setB.size === 0) return 1
  if (setA.size === 0 || setB.size === 0) return 0
  let intersection = 0
  for (const bg of setA) if (setB.has(bg)) intersection++
  return (2 * intersection) / (setA.size + setB.size)
}

type FailureCause = 'accurate' | 'unit_mismatch' | 'name_mismatch' | 'stale_data' | 'geographic' | 'unknown'

function categorizeFailure(
  absDev: number,
  pieUnit: string,
  piUnit: string,
  pieName: string,
  piName: string,
  similarity: number
): FailureCause {
  if (absDev <= THRESHOLD_PCT) return 'accurate'
  // >100% deviation with different unit families = unit mismatch
  const pieFamily = getUnitFamily(pieUnit)
  const piFamily = getUnitFamily(piUnit)
  if (pieFamily !== piFamily && pieFamily !== 'unknown' && piFamily !== 'unknown') return 'unit_mismatch'
  if (absDev > 100) return 'unit_mismatch' // >100% almost always unit/size confusion
  // Low similarity = wrong product matched
  if (similarity < 0.7) return 'name_mismatch'
  // Remaining medium deviations
  if (absDev > 50) return 'geographic' // likely regional price difference
  return 'unknown'
}

// --- Pi Bridge Fetch ---
// Single endpoint returns individual product prices with names, so we can
// filter out irrelevant products (e.g. "Shea Butter Soap" when looking up "Butter").
// The batch endpoint AVGs across ALL linked products including wrong ones.

interface PiSinglePrice {
  price_cents: number
  price_unit: string
  price_per_standard_unit_cents: number | null
  standard_unit: string | null
  product_name: string | null
  in_stock: boolean
}

interface PiSingleResult {
  ingredient: {
    id: string
    name: string
    category: string | null
    standard_unit: string | null
  }
  prices: PiSinglePrice[]
  count: number
  query_ms: number
}

/** Check if a product name is actually relevant to the ingredient.
 *  "Butter" should match "Unsalted Butter 1lb" but NOT "Shea Butter Lotion". */
function isProductRelevant(productName: string, ingredientName: string): boolean {
  const pn = productName.toLowerCase()
  const ing = ingredientName.toLowerCase()

  // Exact containment with word boundary check
  const idx = pn.indexOf(ing)
  if (idx === -1) return false

  // Check it's a word boundary (not middle of another word)
  const before = idx > 0 ? pn[idx - 1] : ' '
  const after = idx + ing.length < pn.length ? pn[idx + ing.length] : ' '
  const wordBoundary = /[\s,\-()\/]|^$/
  if (!wordBoundary.test(before) && before !== ' ') return false
  if (!wordBoundary.test(after) && after !== ' ') return false

  // Reject if ingredient name appears only as an adjective/modifier
  // e.g. "Butter Lettuce" - "butter" modifies "lettuce", not actual butter
  // Heuristic: if ingredient is at position 0 and word after it is a noun, likely modifier
  // Better heuristic: reject known false-positive categories
  const falsePositivePatterns = [
    /lotion|soap|shampoo|conditioner|cream\b.*\b(body|skin|face|hand)/i,
    /petroleum|vaseline|nivea|dove|pantene/i,
  ]
  for (const pat of falsePositivePatterns) {
    if (pat.test(pn)) return false
  }

  return true
}

interface FilteredPiResult {
  canonical_name: string
  median_cents: number
  min_cents: number
  max_cents: number
  observation_count: number
  unit: string
  standardized: boolean // true if price_per_standard_unit_cents was used
  query_ms: number
}

async function piSingleLookup(name: string, state?: string): Promise<FilteredPiResult | null> {
  try {
    const params = new URLSearchParams({ name })
    if (state) params.set('state', state)
    const resp = await fetch(`${PI_BRIDGE_URL}/price?${params}`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!resp.ok) return null
    const data = await resp.json() as PiSingleResult
    if (!data.prices || data.prices.length === 0) return null

    // Filter to only relevant products
    const relevant = data.prices.filter(p => {
      if (!p.product_name) return false
      if (!p.in_stock) return false
      return isProductRelevant(p.product_name, name)
    })

    if (relevant.length === 0) return null

    // Prefer price_per_standard_unit_cents (normalized), fall back to price_cents
    const standardized = relevant.some(p => p.price_per_standard_unit_cents != null)
    const cents = relevant
      .map(p => standardized && p.price_per_standard_unit_cents != null
        ? p.price_per_standard_unit_cents
        : p.price_cents)
      .filter(c => c > 0)
      .sort((a, b) => a - b)

    if (cents.length === 0) return null

    const median = cents[Math.floor(cents.length / 2)]
    return {
      canonical_name: data.ingredient.name,
      median_cents: median,
      min_cents: cents[0],
      max_cents: cents[cents.length - 1],
      observation_count: cents.length,
      unit: (standardized ? data.ingredient.standard_unit : relevant[0].price_unit) || 'each',
      standardized,
      query_ms: data.query_ms,
    }
  } catch {
    return null
  }
}

// --- Main ---
async function main() {
  const start = Date.now()
  console.log('[accuracy-bootstrap] PIE vs Pi Bridge ground truth comparison')
  console.log(`[accuracy-bootstrap] Sample limit: ${SAMPLE_LIMIT}, State: ${STATE_FILTER || 'all'}, Unit filter: ${SKIP_UNIT_FILTER ? 'OFF' : 'ON'}, Name filter: ${SKIP_NAME_FILTER ? 'OFF' : `ON (>=${MIN_SIMILARITY})`}`)

  // 0. Verify tables
  const tableCheck = await sql`
    SELECT count(*) AS cnt
    FROM information_schema.tables
    WHERE table_schema = 'openclaw'
      AND table_name IN ('resolved_prices', 'price_predictions', 'learning_accuracy')
  `
  if (Number(tableCheck[0]?.cnt ?? 0) < 3) {
    console.log('[accuracy-bootstrap] Missing tables. Run migrations first.')
    await sql.end()
    process.exit(1)
  }

  // 1. Check Pi bridge health
  try {
    const health = await fetch(`${PI_BRIDGE_URL}/health`, { signal: AbortSignal.timeout(30000) })
    const h = await health.json()
    console.log(`[accuracy-bootstrap] Pi bridge: ${h.total_prices?.toLocaleString()} prices, ${h.db_size_mb}MB`)
  } catch {
    console.log('[accuracy-bootstrap] Pi bridge unreachable. Cannot proceed.')
    await sql.end()
    process.exit(1)
  }

  // 2. Sample resolved_prices with ingredient names
  console.log('[accuracy-bootstrap] Sampling resolved_prices...')
  const samples = await sql`
    SELECT
      rp.canonical_ingredient_id,
      rp.pricing_region_id::text,
      rp.price_cents,
      rp.price_unit,
      rp.computation_method,
      rp.confidence,
      ci.name AS ingredient_name
    FROM openclaw.resolved_prices rp
    JOIN openclaw.canonical_ingredients ci
      ON ci.ingredient_id = rp.canonical_ingredient_id
    WHERE rp.price_cents > 0
      AND ci.name IS NOT NULL
      AND ci.name != ''
    ORDER BY random()
    LIMIT ${SAMPLE_LIMIT}
  `

  if (samples.length === 0) {
    console.log('[accuracy-bootstrap] No resolved_prices with ingredient names found.')
    await sql.end()
    process.exit(0)
  }
  console.log(`[accuracy-bootstrap] Sampled ${samples.length} resolved prices`)

  // 3. Batch query Pi bridge
  console.log('[accuracy-bootstrap] Querying Pi bridge for ground truth...')
  let matched = 0
  let inserted = 0
  let unitMismatchSkipped = 0
  let nameFilterSkipped = 0
  let outlierSkipped = 0
  let totalAbsErrorPct = 0
  let withinThreshold = 0
  let withinRange = 0
  let piQueryMs = 0
  const failureCounts: Record<FailureCause, number> = {
    accurate: 0, unit_mismatch: 0, name_mismatch: 0, stale_data: 0, geographic: 0, unknown: 0,
  }

  // Group by ingredient name for dedup (preserve original case for Pi)
  const nameToSamples = new Map<string, typeof samples>()
  for (const s of samples) {
    const name = s.ingredient_name.trim()
    if (!nameToSamples.has(name)) nameToSamples.set(name, [])
    nameToSamples.get(name)!.push(s)
  }

  const uniqueNames = [...nameToSamples.keys()]
  console.log(`[accuracy-bootstrap] ${uniqueNames.length} unique ingredient names to check`)
  console.log(`[accuracy-bootstrap] Using single endpoint with product name filtering`)

  let productFilteredOut = 0

  for (let i = 0; i < uniqueNames.length; i++) {
    const name = uniqueNames[i]
    const piResult = await piSingleLookup(name, STATE_FILTER)

    if (!piResult) {
      // Track how many had prices but all got filtered by product relevance
      // (vs just not found at all)
      continue
    }

    piQueryMs += piResult.query_ms

    if (piResult.observation_count < MIN_OBSERVATIONS) continue

    const resolvedSamples = nameToSamples.get(name)
    if (!resolvedSamples) continue

    // Name similarity filter
    if (!SKIP_NAME_FILTER) {
      const similarity = diceSimilarity(name, piResult.canonical_name)
      if (similarity < MIN_SIMILARITY) {
        nameFilterSkipped++
        continue
      }
    }

    for (const sample of resolvedSamples) {
      const pieRawUnit = sample.price_unit || 'lb'
      const piRawUnit = piResult.unit || 'each'
      const pieFamily = getUnitFamily(pieRawUnit)
      const piFamily = getUnitFamily(piRawUnit)

      // Unit-compatibility filter
      if (!SKIP_UNIT_FILTER && pieFamily !== 'unknown' && piFamily !== 'unknown' && pieFamily !== piFamily) {
        unitMismatchSkipped++
        continue
      }

      // Normalize both prices to same base unit
      const pieNorm = normalizeCentsToBase(Number(sample.price_cents), pieRawUnit)
      const piNorm = normalizeCentsToBase(piResult.median_cents, piRawUnit)

      const pieCents = (pieNorm !== null && piNorm !== null) ? Math.round(pieNorm) : Number(sample.price_cents)
      const realCents = (pieNorm !== null && piNorm !== null) ? Math.round(piNorm) : piResult.median_cents

      matched++

      const rawErrorPct = ((pieCents - realCents) / Math.max(realCents, 1)) * 100
      const rawAbsErrorPct = Math.abs(rawErrorPct)

      // Range-based check
      const piMinNorm = (pieNorm !== null && piNorm !== null) ? normalizeCentsToBase(piResult.min_cents, piRawUnit) : null
      const piMaxNorm = (pieNorm !== null && piNorm !== null) ? normalizeCentsToBase(piResult.max_cents, piRawUnit) : null
      const piMin = piMinNorm !== null ? Math.round(piMinNorm) : piResult.min_cents
      const piMax = piMaxNorm !== null ? Math.round(piMaxNorm) : piResult.max_cents
      const rangeBuffer = 0.10
      if (pieCents >= piMin * (1 - rangeBuffer) && pieCents <= piMax * (1 + rangeBuffer)) withinRange++

      // Skip extreme outliers
      if (!SKIP_OUTLIER_CAP && rawAbsErrorPct > MAX_DEVIATION_CAP) {
        outlierSkipped++
        matched--
        continue
      }

      const errorPct = Math.max(-999.999, Math.min(999.999, rawErrorPct))
      const absErrorPct = Math.min(999.999, rawAbsErrorPct)

      totalAbsErrorPct += rawAbsErrorPct
      if (rawAbsErrorPct <= THRESHOLD_PCT) withinThreshold++

      const similarity = diceSimilarity(name, piResult.canonical_name)
      const cause = categorizeFailure(rawAbsErrorPct, pieRawUnit, piRawUnit, name, piResult.canonical_name, similarity)
      failureCounts[cause]++

      await sql`
        INSERT INTO openclaw.price_predictions (
          canonical_ingredient_id, pricing_region_id,
          predicted_cents, predicted_unit,
          derivation_method, confidence,
          predicted_at,
          actual_cents, actual_source, actual_observed_at,
          resolved_at, error_pct, abs_error_pct
        ) VALUES (
          ${sample.canonical_ingredient_id},
          ${sample.pricing_region_id}::uuid,
          ${pieCents},
          ${sample.price_unit || 'lb'},
          ${sample.computation_method || 'resolved_price'},
          ${Number(sample.confidence) || 0.5},
          now(),
          ${realCents},
          ${'pi_bridge_filtered_median'},
          now(),
          now(),
          ${Math.round(errorPct * 1000) / 1000},
          ${Math.round(absErrorPct * 1000) / 1000}
        )
      `
      inserted++
    }

    if ((i + 1) % 200 === 0 || i + 1 === uniqueNames.length) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1)
      console.log(`  [progress] ${i + 1}/${uniqueNames.length} names checked, ${matched} matched, ${inserted} inserted (${elapsed}s)`)
    }
  }

  if (inserted === 0) {
    console.log('[accuracy-bootstrap] No matches between resolved_prices and Pi bridge.')
    console.log('[accuracy-bootstrap] This can happen if ingredient names do not match between systems.')
    await sql.end()
    process.exit(0)
  }

  // 4. Monthly accuracy rollups
  console.log('[accuracy-bootstrap] Computing monthly accuracy rollups...')
  const rollupsUpdated = await computeMonthlyAccuracyLocal()

  // 5. Summary
  const avgDeviation = matched > 0 ? (totalAbsErrorPct / matched) : 0
  const accuracyPct = matched > 0 ? ((withinThreshold / matched) * 100) : 0
  const totalElapsed = ((Date.now() - start) / 1000).toFixed(1)

  console.log('')
  console.log('=== PIE ACCURACY BOOTSTRAP SUMMARY ===')
  console.log(`  Resolved prices sampled: ${samples.length}`)
  console.log(`  Unique ingredient names: ${uniqueNames.length}`)
  console.log(`  Name-filter skipped:     ${nameFilterSkipped}`)
  console.log(`  Unit-mismatch skipped:   ${unitMismatchSkipped}`)
  console.log(`  Outlier skipped (>${MAX_DEVIATION_CAP}%): ${outlierSkipped}`)
  console.log(`  Pi bridge matches:       ${matched}`)
  console.log(`  Predictions recorded:    ${inserted}`)
  console.log(`  Average deviation:       ${avgDeviation.toFixed(2)}%`)
  console.log(`  Accuracy (within ${THRESHOLD_PCT}%):  ${accuracyPct.toFixed(1)}% (${withinThreshold}/${matched})`)
  const rangePct = matched > 0 ? ((withinRange / matched) * 100) : 0
  console.log(`  Within Pi range (+/-10%): ${rangePct.toFixed(1)}% (${withinRange}/${matched})`)
  console.log(`  Pi query time:           ${(piQueryMs / 1000).toFixed(1)}s`)
  console.log(`  Monthly rollups:         ${rollupsUpdated}`)
  console.log(`  Total duration:          ${totalElapsed}s`)
  console.log('=======================================')
  if (unitMismatchSkipped > 0) {
    const skipPct = ((unitMismatchSkipped / (matched + unitMismatchSkipped)) * 100).toFixed(1)
    console.log(`  [note] ${skipPct}% of potential comparisons excluded due to unit-family mismatch`)
  }
  console.log(`  [note] Using single endpoint with product-name relevance filtering`)
  console.log(`  [note] Only products whose name matches the ingredient are included`)

  // Failure cause breakdown
  const totalCategorized = Object.values(failureCounts).reduce((a, b) => a + b, 0)
  if (totalCategorized > 0) {
    console.log('')
    console.log('[accuracy-bootstrap] === FAILURE ANALYSIS ===')
    for (const cause of ['accurate', 'unit_mismatch', 'name_mismatch', 'geographic', 'stale_data', 'unknown'] as FailureCause[]) {
      const count = failureCounts[cause]
      const pct = ((count / totalCategorized) * 100).toFixed(1)
      console.log(`[accuracy-bootstrap]   ${cause.padEnd(16)} ${count.toLocaleString().padStart(6)} (${pct.padStart(5)}%)`)
    }
  }

  await sql.end()
}

async function computeMonthlyAccuracyLocal(): Promise<number> {
  const result = await sql`
    INSERT INTO openclaw.learning_accuracy (
      month, derivation_method,
      total_predictions, resolved_predictions,
      mean_abs_error_pct, median_abs_error_pct, p90_abs_error_pct,
      accuracy_pct, improved_vs_prior, computed_at
    )
    SELECT
      date_trunc('month', pp.predicted_at)::date AS month,
      pp.derivation_method,
      count(*) AS total_predictions,
      count(*) FILTER (WHERE pp.actual_cents IS NOT NULL) AS resolved_predictions,
      ROUND(AVG(pp.abs_error_pct) FILTER (WHERE pp.abs_error_pct IS NOT NULL), 3),
      ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY pp.abs_error_pct)
        FILTER (WHERE pp.abs_error_pct IS NOT NULL))::numeric, 3),
      ROUND((PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY pp.abs_error_pct)
        FILTER (WHERE pp.abs_error_pct IS NOT NULL))::numeric, 3),
      ROUND(
        100.0 * count(*) FILTER (WHERE pp.abs_error_pct IS NOT NULL AND pp.abs_error_pct <= 15)
        / GREATEST(count(*) FILTER (WHERE pp.abs_error_pct IS NOT NULL), 1),
        2
      ),
      NULL,
      now()
    FROM openclaw.price_predictions pp
    WHERE pp.predicted_at >= date_trunc('month', now()) - INTERVAL '2 months'
    GROUP BY date_trunc('month', pp.predicted_at), pp.derivation_method
    ON CONFLICT (month, derivation_method) DO UPDATE SET
      total_predictions = EXCLUDED.total_predictions,
      resolved_predictions = EXCLUDED.resolved_predictions,
      mean_abs_error_pct = EXCLUDED.mean_abs_error_pct,
      median_abs_error_pct = EXCLUDED.median_abs_error_pct,
      p90_abs_error_pct = EXCLUDED.p90_abs_error_pct,
      accuracy_pct = EXCLUDED.accuracy_pct,
      computed_at = EXCLUDED.computed_at
  `

  // Compute improved_vs_prior
  await sql`
    UPDATE openclaw.learning_accuracy la
    SET improved_vs_prior = (
      la.accuracy_pct > COALESCE(prior.accuracy_pct, 0)
    )
    FROM openclaw.learning_accuracy prior
    WHERE prior.month = la.month - INTERVAL '1 month'
      AND prior.derivation_method = la.derivation_method
      AND la.resolved_predictions > 0
      AND prior.resolved_predictions > 0
  `

  return result.count
}

main().catch(e => { console.error(e); process.exit(1) })

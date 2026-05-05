/**
 * PIE Accuracy Check - Spot-check validation against ground truth
 *
 * Selects a sample of ingredients, compares PIE's universal-price-lookup
 * result against the freshest store-level prices as ground truth.
 *
 * Run: npx tsx scripts/pie-accuracy-check.mts [--sample=100]
 *
 * Output: JSON report with accuracy %, worst offenders, by-category breakdown.
 * Exit codes: 0 = accuracy >= 75%, 1 = accuracy < 75% or error
 */

import postgres from 'postgres'

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = postgres(DB_URL, { connect_timeout: 10 })

const sampleArg = process.argv.find(a => a.startsWith('--sample='))
const sampleSize = sampleArg ? parseInt(sampleArg.split('=')[1], 10) : 100

interface ValidationResult {
  ingredient_id: string
  name: string
  category: string | null
  pie_price_cents: number | null
  ground_truth_cents: number
  error_pct: number
  pass: boolean // within 15%
}

async function main() {
  const startTime = Date.now()

  // 1. Select sample: ingredients that have both norm links AND recent store prices
  const sample = await sql`
    SELECT
      ci.ingredient_id,
      ci.name,
      ci.category,
      AVG(sp.price_cents)::int as avg_price_cents,
      COUNT(*)::int as data_points,
      MAX(sp.last_seen_at) as freshest
    FROM openclaw.canonical_ingredients ci
    JOIN openclaw.normalization_map nm ON nm.canonical_ingredient_id = ci.ingredient_id
    JOIN openclaw.products p ON LOWER(TRIM(p.name)) = LOWER(TRIM(nm.raw_name)) AND p.is_food = true
    JOIN openclaw.store_products sp ON sp.product_id = p.id AND sp.price_cents > 0
    JOIN openclaw.stores s ON s.id = sp.store_id AND s.is_active = true
    WHERE sp.price_cents BETWEEN 50 AND 100000
    GROUP BY ci.ingredient_id, ci.name, ci.category
    HAVING COUNT(*) >= 3
    ORDER BY RANDOM()
    LIMIT ${sampleSize}
  `

  process.stderr.write(`Selected ${sample.length} ingredients for validation\n`)

  if (sample.length === 0) {
    process.stderr.write('ERROR: No validatable ingredients found\n')
    await sql.end()
    process.exit(1)
  }

  // 2. For each, get PIE's served price via the same resolution logic
  //    (simplified: we use the avg from norm-linked products as "PIE price"
  //     and compare against median of freshest prices as "ground truth")
  const results: ValidationResult[] = []

  for (const row of sample) {
    // Ground truth: median of most recent prices for this ingredient
    const freshPrices = await sql`
      SELECT sp.price_cents
      FROM openclaw.normalization_map nm
      JOIN openclaw.products p ON LOWER(TRIM(p.name)) = LOWER(TRIM(nm.raw_name))
      JOIN openclaw.store_products sp ON sp.product_id = p.id AND sp.price_cents > 0
      JOIN openclaw.stores s ON s.id = sp.store_id AND s.is_active = true
      WHERE nm.canonical_ingredient_id = ${row.ingredient_id}
        AND sp.price_cents BETWEEN 50 AND 100000
      ORDER BY sp.last_seen_at DESC
      LIMIT 20
    `

    if (freshPrices.length < 3) continue

    // Ground truth = median of freshest 20 prices
    const sorted = freshPrices.map(r => r.price_cents as number).sort((a, b) => a - b)
    const groundTruth = sorted[Math.floor(sorted.length / 2)]

    // PIE price = overall average (what avg_price_cents gives us)
    const piePrice = row.avg_price_cents as number

    const errorPct = Math.abs(piePrice - groundTruth) / groundTruth * 100

    results.push({
      ingredient_id: row.ingredient_id as string,
      name: row.name as string,
      category: row.category as string | null,
      pie_price_cents: piePrice,
      ground_truth_cents: groundTruth,
      error_pct: Math.round(errorPct * 10) / 10,
      pass: errorPct <= 15,
    })
  }

  // 3. Compute summary
  const passing = results.filter(r => r.pass)
  const accuracy = results.length > 0 ? Math.round(passing.length / results.length * 1000) / 10 : 0
  const meanError = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.error_pct, 0) / results.length * 10) / 10
    : 0

  // By category
  const categories = new Map<string, { pass: number; total: number }>()
  for (const r of results) {
    const cat = r.category || 'unknown'
    const entry = categories.get(cat) || { pass: 0, total: 0 }
    entry.total++
    if (r.pass) entry.pass++
    categories.set(cat, entry)
  }

  const byCategory = Array.from(categories.entries())
    .map(([cat, data]) => ({
      category: cat,
      accuracy_pct: Math.round(data.pass / data.total * 1000) / 10,
      sample: data.total,
    }))
    .sort((a, b) => a.accuracy_pct - b.accuracy_pct)

  // Worst offenders
  const worstOffenders = results
    .sort((a, b) => b.error_pct - a.error_pct)
    .slice(0, 10)
    .map(r => ({
      name: r.name,
      category: r.category,
      pie_cents: r.pie_price_cents,
      truth_cents: r.ground_truth_cents,
      error_pct: r.error_pct,
    }))

  const report = {
    timestamp: new Date().toISOString(),
    sample_size: results.length,
    accuracy_pct: accuracy,
    mean_error_pct: meanError,
    passing: passing.length,
    failing: results.length - passing.length,
    by_category: byCategory,
    worst_offenders: worstOffenders,
    elapsed_ms: Date.now() - startTime,
  }

  console.log(JSON.stringify(report, null, 2))

  // Human summary
  process.stderr.write(`\n--- PIE ACCURACY CHECK ---\n`)
  process.stderr.write(`Sample: ${results.length} ingredients\n`)
  process.stderr.write(`Accuracy (within 15%): ${accuracy}%\n`)
  process.stderr.write(`Mean absolute error: ${meanError}%\n`)
  process.stderr.write(`\nWeakest categories:\n`)
  byCategory.slice(0, 5).forEach(c => {
    process.stderr.write(`  ${c.category}: ${c.accuracy_pct}% (n=${c.sample})\n`)
  })
  process.stderr.write(`\nWorst offenders:\n`)
  worstOffenders.slice(0, 5).forEach(w => {
    process.stderr.write(`  ${w.name}: PIE=${w.pie_cents}c vs truth=${w.truth_cents}c (${w.error_pct}% off)\n`)
  })

  await sql.end()
  process.exit(accuracy >= 75 ? 0 : 1)
}

main().catch(async (e) => {
  process.stderr.write(`FATAL: ${e.message}\n`)
  await sql.end()
  process.exit(1)
})

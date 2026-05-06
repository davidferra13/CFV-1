import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import postgres from 'postgres'

const args = process.argv.slice(2)
const VERBOSE = args.includes('--verbose')

const sql = postgres(process.env.DATABASE_URL!, { max: 2 })

const stats = await sql`
  SELECT
    count(*)::int as total,
    round(avg(abs_error_pct)::numeric, 2) as avg_deviation,
    round((100.0 * count(*) FILTER (WHERE abs_error_pct <= 15) / GREATEST(count(*), 1))::numeric, 1) as accuracy_pct,
    round(min(abs_error_pct)::numeric, 2) as min_err,
    round((percentile_cont(0.5) within group (order by abs_error_pct))::numeric, 2) as median_err,
    round((percentile_cont(0.9) within group (order by abs_error_pct))::numeric, 2) as p90_err
  FROM openclaw.price_predictions
  WHERE actual_cents IS NOT NULL
`
console.log('=== PIE ACCURACY (from price_predictions) ===')
console.log(`  Total comparisons: ${stats[0].total}`)
console.log(`  Avg deviation:     ${stats[0].avg_deviation}%`)
console.log(`  Median deviation:  ${stats[0].median_err}%`)
console.log(`  P90 deviation:     ${stats[0].p90_err}%`)
console.log(`  Accuracy (<=15%):  ${stats[0].accuracy_pct}%`)

// By method
const byMethod = await sql`
  SELECT
    derivation_method,
    count(*)::int as cnt,
    round(avg(abs_error_pct)::numeric, 2) as avg_err,
    round((100.0 * count(*) FILTER (WHERE abs_error_pct <= 15) / GREATEST(count(*), 1))::numeric, 1) as accuracy
  FROM openclaw.price_predictions
  WHERE actual_cents IS NOT NULL
  GROUP BY derivation_method
  ORDER BY cnt DESC
  LIMIT 10
`
console.log('\n  By method:')
for (const m of byMethod) {
  console.log(`    ${m.derivation_method}: ${m.cnt} predictions, avg err=${m.avg_err}%, accuracy=${m.accuracy}%`)
}

// Outlier analysis: show how many predictions have >100% deviation (likely unit mismatches)
const outliers = await sql`
  SELECT
    count(*)::int as total,
    count(*) FILTER (WHERE abs_error_pct > 100)::int as over_100,
    count(*) FILTER (WHERE abs_error_pct > 200)::int as over_200,
    count(*) FILTER (WHERE abs_error_pct > 500)::int as over_500
  FROM openclaw.price_predictions
  WHERE actual_cents IS NOT NULL
`
console.log('\n  Outlier analysis (likely unit mismatches):')
console.log(`    >100% deviation: ${outliers[0].over_100} (${((outliers[0].over_100 / outliers[0].total) * 100).toFixed(1)}%)`)
console.log(`    >200% deviation: ${outliers[0].over_200} (${((outliers[0].over_200 / outliers[0].total) * 100).toFixed(1)}%)`)
console.log(`    >500% deviation: ${outliers[0].over_500} (${((outliers[0].over_500 / outliers[0].total) * 100).toFixed(1)}%)`)

// Verbose: top-10 worst deviations with names and units
if (VERBOSE) {
  const worst = await sql`
    SELECT
      pp.predicted_cents,
      pp.predicted_unit,
      pp.actual_cents,
      pp.derivation_method,
      pp.abs_error_pct,
      pp.error_pct,
      ci.name AS pie_name,
      pp.actual_source
    FROM openclaw.price_predictions pp
    JOIN openclaw.canonical_ingredients ci
      ON ci.ingredient_id = pp.canonical_ingredient_id
    WHERE pp.actual_cents IS NOT NULL
      AND pp.abs_error_pct IS NOT NULL
    ORDER BY pp.abs_error_pct DESC
    LIMIT 10
  `
  console.log('\n  Top-10 worst deviations:')
  console.log('    ' + 'Name'.padEnd(30) + 'PIE'.padStart(8) + 'Unit'.padStart(6) + 'Actual'.padStart(8) + 'Dev%'.padStart(8))
  console.log('    ' + '-'.repeat(60))
  for (const w of worst) {
    const name = (w.pie_name as string).slice(0, 28).padEnd(30)
    const pie = String(w.predicted_cents).padStart(8)
    const unit = (w.predicted_unit || 'lb').padStart(6)
    const actual = String(w.actual_cents).padStart(8)
    const dev = `${Number(w.abs_error_pct).toFixed(1)}%`.padStart(8)
    console.log(`    ${name}${pie}${unit}${actual}${dev}`)
  }
}

// Run rollup
const rollup = await sql`
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
console.log(`\n  Rollup rows upserted: ${rollup.count}`)

await sql.end()

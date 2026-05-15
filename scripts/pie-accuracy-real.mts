/**
 * PIE Real Accuracy Check - Ground Truth Validation
 *
 * Unlike pie-accuracy-check.mts (which compares PIE's mean vs median of its own data),
 * this script measures PIE accuracy against REAL receipt prices from chefs.
 *
 * Queries pie_prediction_resolutions where source = 'receipt' or 'receipt_ground_truth'
 * and computes:
 *   - % within 15% (SLA target: 90%)
 *   - Mean absolute error
 *   - By-category breakdown
 *   - By-tier breakdown
 *   - By-state breakdown
 *   - Worst offenders
 *   - Trend vs prior period
 *
 * Run: npx tsx scripts/pie-accuracy-real.mts [--days=30] [--append-log]
 *
 * Exit codes: 0 = SLA met (90% within 15%), 1 = SLA not met or error
 */

import postgres from 'postgres'
import { appendFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = postgres(DB_URL, { connect_timeout: 10 })

const daysArg = process.argv.find(a => a.startsWith('--days='))
const days = daysArg ? parseInt(daysArg.split('=')[1], 10) : 30
const appendLog = process.argv.includes('--append-log')

const SLA_TARGET = 90 // 90% within 15%
const SLA_THRESHOLD = 15 // "accurate" = within 15%

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const startTime = Date.now()

  // 1. Overall accuracy from receipt-sourced ground truth
  const [overall] = await sql`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN deviation_pct <= ${SLA_THRESHOLD} THEN 1 END) as within_sla,
      ROUND(AVG(deviation_pct)::numeric, 2) as mean_error,
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY deviation_pct)::numeric, 2) as median_error,
      ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY deviation_pct)::numeric, 2) as p90_error
    FROM pie_prediction_resolutions
    WHERE resolved_at > NOW() - make_interval(days => ${days})
      AND source IN ('receipt', 'receipt_ground_truth')
  `

  const totalComparisons = parseInt(overall.total) || 0
  const withinSlaCount = parseInt(overall.within_sla) || 0
  const withinSlaPct = totalComparisons > 0
    ? Math.round((withinSlaCount / totalComparisons) * 1000) / 10
    : 0
  const meanError = parseFloat(overall.mean_error) || 0
  const medianError = parseFloat(overall.median_error) || 0
  const p90Error = parseFloat(overall.p90_error) || 0

  if (totalComparisons === 0) {
    process.stderr.write('WARNING: No ground truth comparisons found.\n')
    process.stderr.write('PIE has ZERO validated accuracy. Receipt data needed.\n')

    // Check how many ground truth records exist at all
    const [gtCount] = await sql`SELECT COUNT(*) as c FROM pie_ground_truth`
    const [predCount] = await sql`
      SELECT COUNT(*) as c FROM pie_prediction_resolutions
    `

    process.stderr.write(`\nDiagnostics:\n`)
    process.stderr.write(`  pie_ground_truth rows: ${gtCount.c}\n`)
    process.stderr.write(`  pie_prediction_resolutions rows: ${predCount.c}\n`)
    process.stderr.write(`  (Need receipt imports to generate ground truth comparisons)\n`)

    const report = {
      timestamp: new Date().toISOString(),
      status: 'NO_DATA',
      message: 'No ground truth comparisons. PIE accuracy is unmeasured.',
      ground_truth_rows: parseInt(gtCount.c),
      prediction_resolution_rows: parseInt(predCount.c),
      sla_target_pct: SLA_TARGET,
      sla_met: false,
      elapsed_ms: Date.now() - startTime,
    }

    console.log(JSON.stringify(report, null, 2))

    if (appendLog) appendToLog(report)
    await sql.end()
    process.exit(1)
  }

  // 2. By resolution tier
  const byTier = await sql`
    SELECT
      COALESCE(resolution_tier, 'unknown') as tier,
      COUNT(*) as comparisons,
      COUNT(CASE WHEN deviation_pct <= ${SLA_THRESHOLD} THEN 1 END) as within_sla,
      ROUND(AVG(deviation_pct)::numeric, 2) as mean_error
    FROM pie_prediction_resolutions
    WHERE resolved_at > NOW() - make_interval(days => ${days})
      AND source IN ('receipt', 'receipt_ground_truth')
    GROUP BY COALESCE(resolution_tier, 'unknown')
    ORDER BY AVG(deviation_pct) ASC
  `

  // 3. By category
  const byCategory = await sql`
    SELECT
      COALESCE(ci.category, 'unknown') as category,
      COUNT(*) as comparisons,
      COUNT(CASE WHEN pr.deviation_pct <= ${SLA_THRESHOLD} THEN 1 END) as within_sla,
      ROUND(AVG(pr.deviation_pct)::numeric, 2) as mean_error
    FROM pie_prediction_resolutions pr
    LEFT JOIN openclaw.canonical_ingredients ci ON ci.ingredient_id = pr.ingredient_id
    WHERE pr.resolved_at > NOW() - make_interval(days => ${days})
      AND pr.source IN ('receipt', 'receipt_ground_truth')
    GROUP BY COALESCE(ci.category, 'unknown')
    HAVING COUNT(*) >= 2
    ORDER BY AVG(pr.deviation_pct) DESC
  `

  // 4. By state
  const byState = await sql`
    SELECT
      COALESCE(gt.store_state, 'unknown') as state,
      COUNT(*) as comparisons,
      COUNT(CASE WHEN pr.deviation_pct <= ${SLA_THRESHOLD} THEN 1 END) as within_sla,
      ROUND(AVG(pr.deviation_pct)::numeric, 2) as mean_error
    FROM pie_prediction_resolutions pr
    JOIN pie_ground_truth gt ON gt.ingredient_id = pr.ingredient_id
      AND gt.created_at BETWEEN pr.resolved_at - interval '1 hour' AND pr.resolved_at + interval '1 hour'
    WHERE pr.resolved_at > NOW() - make_interval(days => ${days})
      AND pr.source IN ('receipt', 'receipt_ground_truth')
      AND gt.store_state IS NOT NULL
    GROUP BY gt.store_state
    HAVING COUNT(*) >= 2
    ORDER BY AVG(pr.deviation_pct) DESC
  `

  // 5. Worst offenders
  const worstOffenders = await sql`
    SELECT
      pr.ingredient_id,
      COALESCE(ci.name, pr.ingredient_id) as name,
      pr.actual_cents as receipt_cents,
      pr.predicted_cents as pie_cents,
      ROUND(pr.deviation_pct::numeric, 1) as error_pct,
      pr.resolution_tier as tier
    FROM pie_prediction_resolutions pr
    LEFT JOIN openclaw.canonical_ingredients ci ON ci.ingredient_id = pr.ingredient_id
    WHERE pr.resolved_at > NOW() - make_interval(days => ${days})
      AND pr.source IN ('receipt', 'receipt_ground_truth')
      AND pr.deviation_pct > ${SLA_THRESHOLD}
    ORDER BY pr.deviation_pct DESC
    LIMIT 15
  `

  // 6. Prior period comparison (trend)
  const [prior] = await sql`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN deviation_pct <= ${SLA_THRESHOLD} THEN 1 END) as within_sla
    FROM pie_prediction_resolutions
    WHERE resolved_at > NOW() - make_interval(days => ${days * 2})
      AND resolved_at <= NOW() - make_interval(days => ${days})
      AND source IN ('receipt', 'receipt_ground_truth')
  `

  const priorTotal = parseInt(prior.total) || 0
  const priorSla = priorTotal > 0
    ? Math.round((parseInt(prior.within_sla) / priorTotal) * 1000) / 10
    : null

  // 7. Also check compound learning stats
  const [compoundStats] = await sql`
    SELECT
      COUNT(*) as total_predictions,
      COUNT(*) FILTER (WHERE actual_cents IS NOT NULL) as resolved,
      ROUND(AVG(abs_error_pct) FILTER (WHERE abs_error_pct IS NOT NULL)::numeric, 2) as avg_abs_error
    FROM openclaw.price_predictions
    WHERE predicted_at > NOW() - make_interval(days => ${days})
  `

  // Build report
  const report = {
    timestamp: new Date().toISOString(),
    period_days: days,
    status: withinSlaPct >= SLA_TARGET ? 'SLA_MET' : 'SLA_NOT_MET',
    sla_target_pct: SLA_TARGET,
    sla_threshold_pct: SLA_THRESHOLD,
    total_comparisons: totalComparisons,
    within_sla_count: withinSlaCount,
    within_sla_pct: withinSlaPct,
    mean_absolute_error_pct: meanError,
    median_absolute_error_pct: medianError,
    p90_error_pct: p90Error,
    trend_vs_prior: priorSla !== null ? {
      prior_period_pct: priorSla,
      current_period_pct: withinSlaPct,
      delta: Math.round((withinSlaPct - priorSla) * 10) / 10,
      improving: withinSlaPct > priorSla,
    } : null,
    by_tier: byTier.map(r => ({
      tier: r.tier,
      comparisons: parseInt(r.comparisons),
      within_sla_pct: parseInt(r.comparisons) > 0
        ? Math.round((parseInt(r.within_sla) / parseInt(r.comparisons)) * 1000) / 10
        : 0,
      mean_error_pct: parseFloat(r.mean_error),
    })),
    by_category: byCategory.map(r => ({
      category: r.category,
      comparisons: parseInt(r.comparisons),
      within_sla_pct: parseInt(r.comparisons) > 0
        ? Math.round((parseInt(r.within_sla) / parseInt(r.comparisons)) * 1000) / 10
        : 0,
      mean_error_pct: parseFloat(r.mean_error),
    })),
    by_state: byState.map(r => ({
      state: r.state,
      comparisons: parseInt(r.comparisons),
      within_sla_pct: parseInt(r.comparisons) > 0
        ? Math.round((parseInt(r.within_sla) / parseInt(r.comparisons)) * 1000) / 10
        : 0,
      mean_error_pct: parseFloat(r.mean_error),
    })),
    worst_offenders: worstOffenders.map(r => ({
      name: r.name,
      receipt_cents: parseInt(r.receipt_cents),
      pie_cents: parseInt(r.pie_cents),
      error_pct: parseFloat(r.error_pct),
      tier: r.tier,
    })),
    compound_learning: {
      total_predictions: parseInt(compoundStats.total_predictions) || 0,
      resolved: parseInt(compoundStats.resolved) || 0,
      resolution_rate_pct: parseInt(compoundStats.total_predictions) > 0
        ? Math.round((parseInt(compoundStats.resolved) / parseInt(compoundStats.total_predictions)) * 1000) / 10
        : 0,
      avg_abs_error_pct: parseFloat(compoundStats.avg_abs_error) || null,
    },
    elapsed_ms: Date.now() - startTime,
  }

  // Output JSON report to stdout
  console.log(JSON.stringify(report, null, 2))

  // Human-readable summary to stderr
  process.stderr.write(`\n=== PIE REAL ACCURACY REPORT ===\n`)
  process.stderr.write(`Period: last ${days} days\n`)
  process.stderr.write(`Ground truth comparisons: ${totalComparisons}\n`)
  process.stderr.write(`\n`)
  process.stderr.write(`  Accuracy (within 15%): ${withinSlaPct}% ${withinSlaPct >= SLA_TARGET ? '[SLA MET]' : '[SLA NOT MET]'}\n`)
  process.stderr.write(`  SLA target: ${SLA_TARGET}%\n`)
  process.stderr.write(`  Mean absolute error: ${meanError}%\n`)
  process.stderr.write(`  Median absolute error: ${medianError}%\n`)
  process.stderr.write(`  P90 error: ${p90Error}%\n`)

  if (priorSla !== null) {
    const delta = Math.round((withinSlaPct - priorSla) * 10) / 10
    process.stderr.write(`  Trend: ${delta > 0 ? '+' : ''}${delta}% vs prior period (${priorSla}%)\n`)
  }

  process.stderr.write(`\nBy Resolution Tier:\n`)
  for (const t of report.by_tier) {
    process.stderr.write(`  ${t.tier}: ${t.within_sla_pct}% accurate (n=${t.comparisons}, mean err=${t.mean_error_pct}%)\n`)
  }

  process.stderr.write(`\nWeakest Categories:\n`)
  for (const c of report.by_category.slice(0, 5)) {
    process.stderr.write(`  ${c.category}: ${c.within_sla_pct}% (n=${c.comparisons}, mean err=${c.mean_error_pct}%)\n`)
  }

  if (report.worst_offenders.length > 0) {
    process.stderr.write(`\nWorst Offenders:\n`)
    for (const w of report.worst_offenders.slice(0, 5)) {
      process.stderr.write(`  ${w.name}: PIE=${w.pie_cents}c vs receipt=${w.receipt_cents}c (${w.error_pct}% off, tier=${w.tier})\n`)
    }
  }

  process.stderr.write(`\nCompound Learning:\n`)
  process.stderr.write(`  Predictions: ${report.compound_learning.total_predictions}\n`)
  process.stderr.write(`  Resolved: ${report.compound_learning.resolved} (${report.compound_learning.resolution_rate_pct}%)\n`)
  if (report.compound_learning.avg_abs_error_pct) {
    process.stderr.write(`  Avg abs error (all sources): ${report.compound_learning.avg_abs_error_pct}%\n`)
  }

  process.stderr.write(`\nElapsed: ${report.elapsed_ms}ms\n`)

  // Append to accuracy log if requested
  if (appendLog) {
    appendToLog(report)
    process.stderr.write(`\nAppended to docs/pie-accuracy-log.md\n`)
  }

  await sql.end()
  process.exit(withinSlaPct >= SLA_TARGET ? 0 : 1)
}

// ---------------------------------------------------------------------------
// Append to accuracy log
// ---------------------------------------------------------------------------

function appendToLog(report: Record<string, unknown>) {
  const docsDir = join(process.cwd(), 'docs')
  if (!existsSync(docsDir)) mkdirSync(docsDir, { recursive: true })

  const logPath = join(docsDir, 'pie-accuracy-log.md')
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  let entry: string

  if ((report as { status?: string }).status === 'NO_DATA') {
    entry = `\n## ${now} - NO DATA\n\nNo ground truth comparisons available. PIE accuracy is unmeasured.\n- Ground truth rows: ${(report as { ground_truth_rows?: number }).ground_truth_rows ?? 0}\n- Prediction resolutions: ${(report as { prediction_resolution_rows?: number }).prediction_resolution_rows ?? 0}\n\n---\n`
  } else {
    const r = report as {
      period_days: number
      total_comparisons: number
      within_sla_pct: number
      sla_target_pct: number
      mean_absolute_error_pct: number
      median_absolute_error_pct: number
      p90_error_pct: number
      status: string
      trend_vs_prior: { delta: number; prior_period_pct: number } | null
      compound_learning: { total_predictions: number; resolved: number; resolution_rate_pct: number }
      by_tier: Array<{ tier: string; within_sla_pct: number; comparisons: number }>
    }

    entry = `\n## ${now} - ${r.status}\n\n`
    entry += `| Metric | Value |\n|--------|-------|\n`
    entry += `| Period | ${r.period_days} days |\n`
    entry += `| Comparisons | ${r.total_comparisons} |\n`
    entry += `| Within 15% (SLA) | ${r.within_sla_pct}% |\n`
    entry += `| SLA Target | ${r.sla_target_pct}% |\n`
    entry += `| Mean Abs Error | ${r.mean_absolute_error_pct}% |\n`
    entry += `| Median Abs Error | ${r.median_absolute_error_pct}% |\n`
    entry += `| P90 Error | ${r.p90_error_pct}% |\n`

    if (r.trend_vs_prior) {
      entry += `| Trend vs Prior | ${r.trend_vs_prior.delta > 0 ? '+' : ''}${r.trend_vs_prior.delta}% (prior: ${r.trend_vs_prior.prior_period_pct}%) |\n`
    }

    entry += `| Compound Predictions | ${r.compound_learning.total_predictions} (${r.compound_learning.resolution_rate_pct}% resolved) |\n`

    if (r.by_tier && r.by_tier.length > 0) {
      entry += `\n### By Tier\n\n| Tier | Accuracy | N |\n|------|----------|---|\n`
      for (const t of r.by_tier) {
        entry += `| ${t.tier} | ${t.within_sla_pct}% | ${t.comparisons} |\n`
      }
    }

    entry += `\n---\n`
  }

  // Create file with header if it doesn't exist
  if (!existsSync(logPath)) {
    const header = `# PIE Accuracy Log (Ground Truth)\n\nReal accuracy measurements from receipt price comparisons.\nSLA: 90% of prices within 15% of actual receipt price.\n\n---\n`
    appendFileSync(logPath, header, 'utf-8')
  }

  appendFileSync(logPath, entry, 'utf-8')
}

main().catch(async (e) => {
  process.stderr.write(`FATAL: ${e.message}\n${e.stack}\n`)
  await sql.end()
  process.exit(1)
})

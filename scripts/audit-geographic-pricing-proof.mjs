#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
const write = args.includes('--write')
const dryRun = args.includes('--dry-run') || !write

const code = `
  const queryModule = await import('./lib/pricing/geographic-proof-query.ts')
  const mod = queryModule.default ?? queryModule
  const startedAt = Date.now()
  const result = await mod.runGeographicPricingProof({
    write: ${write ? 'true' : 'false'},
    requestedBy: 'cli',
  })
  const elapsedMs = Date.now() - startedAt
  const failureCounts = new Map()
  const geographyCounts = new Map()
  for (const row of result.rows) {
    if (row.failureReason) {
      failureCounts.set(row.failureReason, (failureCounts.get(row.failureReason) ?? 0) + 1)
    }
    const geography = geographyCounts.get(row.geographyCode) ?? {
      geographyCode: row.geographyCode,
      geographyName: row.geographyName,
      safe_to_quote: 0,
      verify_first: 0,
      planning_only: 0,
      not_usable: 0,
      blockers: new Map(),
    }
    geography[row.quoteSafety] += 1
    if (row.failureReason) {
      geography.blockers.set(row.failureReason, (geography.blockers.get(row.failureReason) ?? 0) + 1)
    }
    geographyCounts.set(row.geographyCode, geography)
  }
  const topBlockers = Array.from(failureCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([blocker, count]) => ({ blocker, count }))
  const geographySummaries = Array.from(geographyCounts.values())
    .map((geography) => ({
      geographyCode: geography.geographyCode,
      geographyName: geography.geographyName,
      safe_to_quote: geography.safe_to_quote,
      verify_first: geography.verify_first,
      planning_only: geography.planning_only,
      not_usable: geography.not_usable,
      topBlockers: Array.from(geography.blockers.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 3)
        .map(([blocker, count]) => ({ blocker, count })),
    }))
    .sort((a, b) => a.geographyName.localeCompare(b.geographyName))
  const payload = {
    success: result.success,
    mode: ${dryRun ? "'dry-run'" : "'write'"},
    runId: result.runId,
    wrote: result.wrote,
    elapsedMs,
    totalRows: result.totalRows,
    expectedRows: result.expectedRows,
    safeToQuoteCount: result.safeToQuoteCount,
    verifyFirstCount: result.verifyFirstCount,
    planningOnlyCount: result.planningOnlyCount,
    notUsableCount: result.notUsableCount,
    error: result.error,
    geographies: Array.from(new Set(result.rows.map((row) => row.geographyCode))).length,
    basketItems: Array.from(new Set(result.rows.map((row) => row.ingredientKey))).length,
    topBlockers,
    geographySummaries,
  }
  console.log(JSON.stringify(payload, null, 2))
  if (!result.success || result.totalRows !== result.expectedRows) {
    process.exit(1)
  }
`

const child = spawnSync(process.execPath, ['--import', 'tsx', '--eval', code], {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit',
})

process.exit(child.status ?? 1)

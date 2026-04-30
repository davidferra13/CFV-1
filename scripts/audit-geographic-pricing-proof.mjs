#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
const write = args.includes('--write')
const dryRun = args.includes('--dry-run') || !write

const code = `
  const queryModule = await import('./lib/pricing/geographic-proof-query.ts')
  const mod = queryModule.default ?? queryModule
  const result = await mod.runGeographicPricingProof({
    write: ${write ? 'true' : 'false'},
    requestedBy: 'cli',
  })
  const payload = {
    success: result.success,
    mode: ${dryRun ? "'dry-run'" : "'write'"},
    runId: result.runId,
    wrote: result.wrote,
    totalRows: result.totalRows,
    expectedRows: result.expectedRows,
    safeToQuoteCount: result.safeToQuoteCount,
    verifyFirstCount: result.verifyFirstCount,
    planningOnlyCount: result.planningOnlyCount,
    notUsableCount: result.notUsableCount,
    error: result.error,
    geographies: Array.from(new Set(result.rows.map((row) => row.geographyCode))).length,
    basketItems: Array.from(new Set(result.rows.map((row) => row.ingredientKey))).length,
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

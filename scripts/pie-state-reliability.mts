/**
 * PIE state reliability report.
 *
 * Run:
 *   npx tsx scripts/pie-state-reliability.mts
 *   npx tsx scripts/pie-state-reliability.mts --json
 *   npx tsx scripts/pie-state-reliability.mts --write-snapshot
 *
 * This is a reliability scoreboard, not an acquisition job. It tells PIE which
 * states are ready for local pricing claims and which must be labeled as
 * estimated or unreliable.
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import postgres from 'postgres'
import type { StateReliabilityResult } from '../lib/pricing/state-reliability'

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const JSON_ONLY = process.argv.includes('--json')
const FAIL_ON_UNRELIABLE = process.argv.includes('--fail-on-unreliable')
const WRITE_SNAPSHOT_INDEX = process.argv.indexOf('--write-snapshot')
const WRITE_SNAPSHOT_PATH =
  WRITE_SNAPSHOT_INDEX >= 0
    ? process.argv[WRITE_SNAPSHOT_INDEX + 1] || 'data/pie-state-reliability-snapshot.json'
    : null

const sql = postgres(DB_URL, { connect_timeout: 10, max: 2 })

function fmtPct(value: number | null): string {
  return value === null ? 'n/a' : `${value.toFixed(1)}%`
}

function fmtNum(value: number): string {
  return value.toLocaleString('en-US')
}

function compactBlockers(state: StateReliabilityResult): string {
  return state.blockers.length ? state.blockers.join(', ') : '-'
}

function printHuman(states: StateReliabilityResult[], generatedAt: string) {
  const summary = states.reduce(
    (acc, state) => {
      acc[state.status]++
      if (state.blockers.includes('unvalidated_accuracy')) acc.unvalidated++
      return acc
    },
    { reliable: 0, usable: 0, estimated: 0, unreliable: 0, unvalidated: 0 }
  )

  console.log(`PIE STATE RELIABILITY [${generatedAt}]`)
  console.log('='.repeat(96))
  console.log(
    `Reliable: ${summary.reliable} | Usable: ${summary.usable} | Estimated: ${summary.estimated} | Unreliable: ${summary.unreliable} | Unvalidated: ${summary.unvalidated}`
  )
  console.log('')
  console.log(
    [
      'ST'.padEnd(3),
      'STATUS'.padEnd(10),
      'SCORE'.padStart(5),
      'PRICED'.padStart(11),
      'STORES'.padStart(7),
      'CHAINS'.padStart(7),
      '7D'.padStart(7),
      '30D'.padStart(7),
      'ACC'.padStart(8),
      'BLOCKERS',
    ].join(' ')
  )
  console.log('-'.repeat(96))

  for (const state of states) {
    console.log(
      [
        state.state.padEnd(3),
        state.status.padEnd(10),
        String(state.score).padStart(5),
        fmtNum(state.pricedProducts).padStart(11),
        fmtNum(state.stores).padStart(7),
        fmtNum(state.chains).padStart(7),
        fmtPct(state.fresh7dPct).padStart(7),
        fmtPct(state.fresh30dPct).padStart(7),
        fmtPct(state.accuracyPct).padStart(8),
        compactBlockers(state),
      ].join(' ')
    )
  }

  const worst = [...states].sort((a, b) => a.score - b.score).slice(0, 10)
  console.log('')
  console.log('Worst 10:')
  for (const state of worst) {
    console.log(
      `  ${state.state}: ${state.status}, score ${state.score}, ${fmtNum(
        state.pricedProducts
      )} priced, ${state.stores} stores, 7d ${fmtPct(state.fresh7dPct)}`
    )
  }
}

try {
  const { getStateReliabilityReport } = await import('../lib/pricing/state-reliability.ts')
  const report = await getStateReliabilityReport(sql)
  await sql.end()

  if (WRITE_SNAPSHOT_PATH) {
    await mkdir(dirname(WRITE_SNAPSHOT_PATH), { recursive: true })
    await writeFile(WRITE_SNAPSHOT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  }

  if (JSON_ONLY) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    printHuman(report.states, report.generatedAt)
  }

  process.exit(FAIL_ON_UNRELIABLE && report.summary.unreliable > 0 ? 1 : 0)
} catch (err) {
  await sql.end({ timeout: 1 }).catch(() => {})
  console.error('[pie-state-reliability] Failed:', err instanceof Error ? err.message : err)
  process.exit(1)
}

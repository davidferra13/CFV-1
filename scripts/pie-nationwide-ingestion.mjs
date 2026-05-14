#!/usr/bin/env node
/**
 * PIE Nationwide Store Ingestion Orchestrator
 *
 * Runs OSM, SNAP, and USDA farmers market ingestion across all 50 states + DC.
 * Tracks progress to JSON, supports resume, and prints a summary table.
 *
 * Usage:
 *   node scripts/pie-nationwide-ingestion.mjs                     # run all
 *   node scripts/pie-nationwide-ingestion.mjs --script osm        # OSM only
 *   node scripts/pie-nationwide-ingestion.mjs --script snap       # SNAP only
 *   node scripts/pie-nationwide-ingestion.mjs --script farmers    # farmers markets only
 *   node scripts/pie-nationwide-ingestion.mjs --start-from TX     # begin from Texas
 *   node scripts/pie-nationwide-ingestion.mjs --force             # ignore progress, re-run all
 *   node scripts/pie-nationwide-ingestion.mjs --dry-run           # pass --dry-run to child scripts
 */

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL',
  'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME',
  'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH',
  'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
  'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI',
  'WY',
]

const SCRIPTS = {
  osm: {
    file: 'ingest-osm-stores.mjs',
    label: 'OSM Stores',
  },
  snap: {
    file: 'ingest-snap-retailers.mjs',
    label: 'SNAP Retailers',
  },
  farmers: {
    file: 'ingest-usda-farmers-markets.mjs',
    label: 'Farmers Markets',
  },
}

const PROGRESS_PATH = resolve(__dirname, 'pie-ingestion-progress.json')
const SUMMARY_PATH = resolve(__dirname, 'pie-ingestion-summary.json')

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)
const FORCE = args.includes('--force')
const DRY_RUN = args.includes('--dry-run')

function getArgValue(flag) {
  const idx = args.indexOf(flag)
  if (idx === -1) return null
  return args[idx + 1] || null
}

const SCRIPT_FILTER = getArgValue('--script')
const START_FROM = getArgValue('--start-from')?.toUpperCase() || null

// Validate --script flag
if (SCRIPT_FILTER && !SCRIPTS[SCRIPT_FILTER]) {
  console.error(`Unknown script type: "${SCRIPT_FILTER}". Valid: osm, snap, farmers`)
  process.exit(1)
}

// Validate --start-from flag
if (START_FROM && !ALL_STATES.includes(START_FROM)) {
  console.error(`Unknown state: "${START_FROM}". Must be a valid 2-letter state code.`)
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Progress tracking
// ---------------------------------------------------------------------------

/** @returns {Record<string, { status: string, count: number, timestamp: string }>} */
function loadProgress() {
  if (FORCE) return {}
  try {
    if (existsSync(PROGRESS_PATH)) {
      return JSON.parse(readFileSync(PROGRESS_PATH, 'utf-8'))
    }
  } catch {
    // Corrupted file; start fresh
  }
  return {}
}

function saveProgress(progress) {
  writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2))
}

function progressKey(state, scriptType) {
  return `${state}:${scriptType}`
}

// ---------------------------------------------------------------------------
// Script execution
// ---------------------------------------------------------------------------

/**
 * Run a single ingestion script for a single state.
 * Returns { status, output } where status is 'completed' or 'failed'.
 */
function runScript(scriptType, state) {
  const script = SCRIPTS[scriptType]
  const scriptPath = resolve(__dirname, script.file)
  const cmdParts = ['node', scriptPath, '--state', state]
  if (DRY_RUN) cmdParts.push('--dry-run')

  const cmd = cmdParts.join(' ')

  try {
    const output = execSync(cmd, {
      encoding: 'utf-8',
      timeout: 600_000, // 10 min per state per script
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    return { status: 'completed', output }
  } catch (err) {
    const stderr = err.stderr || ''
    const stdout = err.stdout || ''
    return { status: 'failed', output: stdout, error: stderr || err.message }
  }
}

/**
 * Parse inserted/skipped counts from script stdout.
 * Looks for patterns like "Inserted: 42, Skipped: 3" or similar.
 */
function parseStoreCount(output) {
  // OSM format: "Inserted: 42, Skipped: 3"
  const insertMatch = output.match(/Inserted:\s*(\d+)/i)
  const skipMatch = output.match(/Skipped:\s*(\d+)/i)

  // SNAP/farmers may use different output; try generic number extraction
  const inserted = insertMatch ? parseInt(insertMatch[1], 10) : 0
  const skipped = skipMatch ? parseInt(skipMatch[1], 10) : 0

  return { inserted, skipped }
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== PIE Nationwide Store Ingestion ===')
  console.log(`Started: ${new Date().toISOString()}`)
  if (DRY_RUN) console.log('MODE: dry-run (no data will be written)')
  if (FORCE) console.log('MODE: force (ignoring previous progress)')
  if (SCRIPT_FILTER) console.log(`FILTER: ${SCRIPT_FILTER} only`)
  if (START_FROM) console.log(`START FROM: ${START_FROM}`)
  console.log('')

  const progress = loadProgress()
  const results = []

  // Determine which scripts to run
  const scriptTypes = SCRIPT_FILTER ? [SCRIPT_FILTER] : Object.keys(SCRIPTS)

  // Determine which states to run
  let states = [...ALL_STATES]
  if (START_FROM) {
    const idx = states.indexOf(START_FROM)
    if (idx > 0) {
      console.log(`Skipping ${idx} states before ${START_FROM}`)
      states = states.slice(idx)
    }
  }

  const totalTasks = states.length * scriptTypes.length
  let completedTasks = 0
  let skippedTasks = 0

  for (const state of states) {
    for (const scriptType of scriptTypes) {
      const key = progressKey(state, scriptType)

      // Check resume
      if (progress[key]?.status === 'completed') {
        skippedTasks++
        completedTasks++
        results.push({
          state,
          script: scriptType,
          status: 'skipped (already completed)',
          inserted: progress[key].count || 0,
          skipped: 0,
        })
        continue
      }

      const label = SCRIPTS[scriptType].label
      console.log(`[${state}] [${label}] started (${completedTasks + 1}/${totalTasks})`)

      const { status, output, error } = runScript(scriptType, state)
      const counts = parseStoreCount(output || '')

      if (status === 'completed') {
        console.log(`[${state}] [${label}] completed (${counts.inserted} inserted, ${counts.skipped} skipped)`)
        progress[key] = {
          status: 'completed',
          count: counts.inserted,
          skipped: counts.skipped,
          timestamp: new Date().toISOString(),
        }
      } else {
        const errMsg = (error || '').split('\n')[0]?.substring(0, 120) || 'unknown error'
        console.log(`[${state}] [${label}] FAILED: ${errMsg}`)
        progress[key] = {
          status: 'failed',
          count: 0,
          error: errMsg,
          timestamp: new Date().toISOString(),
        }
      }

      results.push({
        state,
        script: scriptType,
        status,
        inserted: counts.inserted,
        skipped: counts.skipped,
        error: status === 'failed' ? (error || '').split('\n')[0]?.substring(0, 120) : undefined,
      })

      // Save progress after each task
      saveProgress(progress)
      completedTasks++
    }
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  console.log('\n\n=== INGESTION SUMMARY ===')
  console.log(`Completed: ${new Date().toISOString()}`)
  console.log(`Tasks: ${totalTasks} total, ${skippedTasks} resumed/skipped`)
  console.log('')

  // Build per-state summary
  const stateSummary = {}
  for (const state of ALL_STATES) {
    stateSummary[state] = { osm: 0, snap: 0, farmers: 0, errors: [] }
  }

  for (const r of results) {
    const s = stateSummary[r.state]
    if (!s) continue
    if (r.script === 'osm') s.osm = r.inserted
    else if (r.script === 'snap') s.snap = r.inserted
    else if (r.script === 'farmers') s.farmers = r.inserted
    if (r.status === 'failed') s.errors.push(r.script)
  }

  // Print table
  console.log('State | OSM Stores | SNAP Retailers | Farmers Markets | Errors')
  console.log('------|------------|----------------|-----------------|-------')

  let totalOsm = 0
  let totalSnap = 0
  let totalFarmers = 0
  let totalErrors = 0

  for (const state of ALL_STATES) {
    const s = stateSummary[state]
    totalOsm += s.osm
    totalSnap += s.snap
    totalFarmers += s.farmers
    totalErrors += s.errors.length

    const errStr = s.errors.length > 0 ? s.errors.join(', ') : ''
    console.log(
      `  ${state}  | ${String(s.osm).padStart(10)} | ${String(s.snap).padStart(14)} | ${String(s.farmers).padStart(15)} | ${errStr}`
    )
  }

  console.log('------|------------|----------------|-----------------|-------')
  console.log(
    `TOTAL | ${String(totalOsm).padStart(10)} | ${String(totalSnap).padStart(14)} | ${String(totalFarmers).padStart(15)} | ${totalErrors} errors`
  )

  // Write summary JSON
  const summary = {
    timestamp: new Date().toISOString(),
    dryRun: DRY_RUN,
    totals: {
      osm_stores: totalOsm,
      snap_retailers: totalSnap,
      farmers_markets: totalFarmers,
      errors: totalErrors,
    },
    states: stateSummary,
  }
  writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2))
  console.log(`\nSummary written to: ${SUMMARY_PATH}`)
  console.log(`Progress written to: ${PROGRESS_PATH}`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})

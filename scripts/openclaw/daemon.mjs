#!/usr/bin/env node

// OpenClaw - Autonomous US Food Business Crawler (Acquisition-Only Mode)
// Runs continuously on Raspberry Pi, systematically covering every US state.
// States are crawled in population-ranked order for maximum early impact.
// All data stays LOCAL - no Supabase sync. Pure data acquisition.
//
// Usage:
//   node daemon.mjs              # Start crawling (resumes where it left off)
//   DRY_RUN=1 node daemon.mjs   # Preview mode (no writes)

import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { generateCells, countCells } from './lib/grid.mjs'
import { queryCell } from './lib/osm-client.mjs'
import {
  loadProgress,
  saveProgress,
  markCellComplete,
  markCellFailed,
  isCellDone,
  getProgress,
  saveFindings,
  getStorageStats,
} from './lib/storage.mjs'

const DRY_RUN = process.env.DRY_RUN === '1'
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'DFPrivateChef@gmail.com'

// Milestone notifications via Resend (ChefFlow's email provider)
const NEW_ENGLAND = new Set(['MA', 'NH', 'VT', 'ME', 'CT', 'RI'])

async function sendNotification(subject, body) {
  if (!RESEND_API_KEY) {
    log(`[notify] No RESEND_API_KEY set, skipping email: ${subject}`)
    return
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'CheFlow <noreply@cheflowhq.com>',
        to: NOTIFY_EMAIL,
        subject,
        text: body,
      }),
    })
    if (res.ok) {
      log(`[notify] Email sent: ${subject}`)
    } else {
      const err = await res.text().catch(() => 'unknown')
      log(`[notify] Email failed (${res.status}): ${err}`)
    }
  } catch (err) {
    log(`[notify] Email error: ${err.message}`)
  }
}

// Load regions
const __dirname = dirname(fileURLToPath(import.meta.url))
const regionsPath = join(__dirname, 'data', 'regions.json')
const regions = JSON.parse(readFileSync(regionsPath, 'utf-8'))

// Population-ranked crawl order (from regions.json)
const PRIORITY_ORDER = regions._priorityOrder

function log(msg) {
  const ts = new Date().toISOString()
  const line = `[${ts}] ${msg}`
  console.log(line)
}

function formatDuration(ms) {
  const hours = Math.floor(ms / 3600000)
  const mins = Math.floor((ms % 3600000) / 60000)
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

async function crawlState(stateCode, stateBbox, stateName) {
  const cells = generateCells(stateCode, stateBbox)
  const total = cells.length
  let completed = 0
  let skipped = 0
  let newBusinesses = 0

  log(`[${stateCode}] Starting ${stateName}: ${total} cells to crawl`)

  for (const cell of cells) {
    if (isCellDone(cell.id)) {
      skipped++
      completed++
      continue
    }

    const results = await queryCell(cell.bbox)

    if (results === null) {
      // Failed after all retries
      markCellFailed(cell.id, 'all retries exhausted')
      completed++
      continue
    }

    if (!DRY_RUN && results.length > 0) {
      saveFindings(stateCode, results)
    }

    markCellComplete(cell.id, results.length)
    newBusinesses += results.length
    completed++

    // Progress update every 50 cells
    if ((completed - skipped) % 50 === 0 && completed > skipped) {
      const pct = ((completed / total) * 100).toFixed(1)
      log(`[${stateCode}] ${pct}% (${completed}/${total}) - ${newBusinesses} businesses found`)
    }
  }

  log(`[${stateCode}] COMPLETE: ${stateName} - ${newBusinesses} new businesses, ${skipped} cells resumed`)
  return { cells: total, newBusinesses, skipped }
}

async function main() {
  const startTime = Date.now()
  loadProgress()

  log('='.repeat(60))
  log('OpenClaw - US Food Business Crawler (Acquisition Only)')
  log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
  log('Sync: DISABLED (local storage only)')
  log('Order: Population-ranked (highest pop first)')
  log('='.repeat(60))

  // Build ordered state list from priority order
  const usStates = regions.US
  const stateList = []

  for (const code of PRIORITY_ORDER) {
    const info = usStates[code]
    if (!info) continue

    // Alaska uses multiple zones instead of a single bbox
    if (info.zones) {
      stateList.push({ code, name: info.name, zones: info.zones })
    } else {
      stateList.push({ code, name: info.name, bbox: info.bbox })
    }
  }

  // Count total work
  let totalCells = 0
  for (const state of stateList) {
    if (state.zones) {
      for (const zone of state.zones) {
        totalCells += countCells(zone.bbox)
      }
    } else {
      totalCells += countCells(state.bbox)
    }
  }

  const progress = getProgress()
  log(`States to crawl: ${stateList.length} (population-ranked)`)
  log(`Total cells to cover: ${totalCells}`)
  log(`Already completed: ${progress.totalCellsCompleted}`)
  log(`Businesses found so far: ${progress.totalBusinesses}`)
  log('')

  let totalNewBusinesses = 0
  let statesCompleted = 0

  for (const state of stateList) {
    if (state.zones) {
      // Multi-zone state (Alaska)
      log(`[${state.code}] ${state.name} has ${state.zones.length} zones`)
      let stateBusinesses = 0
      for (const zone of state.zones) {
        log(`[${state.code}] Zone: ${zone.name} (${zone.note})`)
        const result = await crawlState(state.code, zone.bbox, `${state.name} - ${zone.name}`)
        stateBusinesses += result.newBusinesses
      }
      totalNewBusinesses += stateBusinesses
    } else {
      const result = await crawlState(state.code, state.bbox, state.name)
      totalNewBusinesses += result.newBusinesses
    }

    statesCompleted++
    saveProgress()
    log(`[progress] ${statesCompleted}/${stateList.length} states complete`)
    log('')

    // New England milestone: notify when all 6 NE states are done
    if (NEW_ENGLAND.has(state.code)) {
      const neFinished = stateList
        .slice(0, statesCompleted)
        .filter((s) => NEW_ENGLAND.has(s.code)).length
      if (neFinished === NEW_ENGLAND.size) {
        const p = getProgress()
        await sendNotification(
          'OpenClaw: New England Complete',
          `All 6 New England states have been crawled.\n\n` +
          `Duration: ${formatDuration(Date.now() - startTime)}\n` +
          `Businesses found so far: ${p.totalBusinesses}\n` +
          `Cells completed: ${p.totalCellsCompleted}\n\n` +
          `The crawler is now continuing with the remaining ${stateList.length - statesCompleted} states.`
        )
      }
    }
  }

  // Retry failed cells
  const finalProgress = getProgress()
  const failedCount = Object.keys(finalProgress.failedCells).length
  if (failedCount > 0) {
    log(`[retry] ${failedCount} cells failed during crawl, attempting retry...`)
    let retrySuccess = 0
    for (const [cellId, info] of Object.entries(finalProgress.failedCells)) {
      if (info.attempts >= 5) continue // Give up after 5 total attempts

      const parts = cellId.split('_')
      const stateCode = parts[0]
      const lat = parseFloat(parts[1])
      const lon = parseFloat(parts[2])
      const bbox = [lat, lon, lat + 0.08, lon + 0.08]

      const results = await queryCell(bbox)
      if (results !== null) {
        if (!DRY_RUN && results.length > 0) {
          saveFindings(stateCode, results)
        }
        markCellComplete(cellId, results.length)
        retrySuccess++
      } else {
        markCellFailed(cellId, 'retry failed')
      }
    }
    log(`[retry] Recovered ${retrySuccess}/${failedCount} failed cells`)
  }

  saveProgress()

  const elapsed = Date.now() - startTime
  const final = getProgress()
  const storage = getStorageStats()
  const remainingFailed = Object.keys(final.failedCells).length

  log('')
  log('='.repeat(60))
  log('OPENCLAW US CRAWL COMPLETE')
  log('='.repeat(60))
  log(`Duration:           ${formatDuration(elapsed)}`)
  log(`Total cells:        ${totalCells}`)
  log(`Cells completed:    ${final.totalCellsCompleted}`)
  log(`Cells failed:       ${remainingFailed}`)
  log(`Businesses found:   ${final.totalBusinesses}`)
  log(`States covered:     ${storage.states}`)
  log(`Cities discovered:  ${storage.cities}`)
  log(`Local files:        ${storage.files}`)
  log(`Sync status:        DISABLED (acquisition only)`)
  log('')

  if (remainingFailed === 0) {
    log('STATUS: ALL US STATES COMPLETED SUCCESSFULLY')
  } else {
    log(`STATUS: COMPLETED WITH ${remainingFailed} UNRESOLVABLE CELLS`)
    log('(These cells consistently returned errors from all Overpass endpoints)')
  }
  log('='.repeat(60))

  // Final completion notification
  await sendNotification(
    'OpenClaw: Full US Crawl Complete',
    `All ${stateList.length} states have been crawled.\n\n` +
    `Duration: ${formatDuration(elapsed)}\n` +
    `Businesses found: ${final.totalBusinesses}\n` +
    `Cells completed: ${final.totalCellsCompleted}\n` +
    `Cells failed: ${remainingFailed}\n` +
    `States: ${storage.states}\n` +
    `Cities: ${storage.cities}\n` +
    `Local files: ${storage.files}`
  )
}

main().catch(async (err) => {
  log(`[fatal] ${err.message}`)
  saveProgress()
  await sendNotification(
    'OpenClaw: CRASHED',
    `The crawler has crashed.\n\nError: ${err.message}\n\nProgress has been saved. Restart with: node daemon.mjs`
  )
  process.exit(1)
})

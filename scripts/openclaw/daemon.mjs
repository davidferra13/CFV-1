#!/usr/bin/env node

// OpenClaw - Autonomous Worldwide Food Business Crawler
// Runs continuously on Raspberry Pi, systematically covering every region.
// Grid-walks each US state cell by cell, extracts comprehensive data,
// stores locally in crawler_findings/, and syncs to Supabase.
//
// Usage:
//   node daemon.mjs              # Start crawling (resumes where it left off)
//   DRY_RUN=1 node daemon.mjs   # Preview mode (no writes)
//
// The daemon runs until all cells in all states are complete,
// then reports success and exits.

import { readFileSync } from 'fs'
import { dirname, join } from 'path'
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
import { syncToSupabase } from './lib/sync.mjs'

const DRY_RUN = process.env.DRY_RUN === '1'

// Load regions
const regionsPath = join(dirname(new URL(import.meta.url).pathname), 'data', 'regions.json')
const regions = JSON.parse(readFileSync(regionsPath, 'utf-8'))

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

async function crawlState(countryCode, stateCode, stateBbox, stateName) {
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
  log('OpenClaw - Autonomous Food Business Crawler')
  log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
  log('='.repeat(60))

  // Count total work
  const usStates = regions.US
  let totalCells = 0
  const stateList = Object.entries(usStates)

  for (const [code, info] of stateList) {
    totalCells += countCells(info.bbox)
  }

  const progress = getProgress()
  log(`Total cells to cover: ${totalCells}`)
  log(`Already completed: ${progress.totalCellsCompleted}`)
  log(`Businesses found so far: ${progress.totalBusinesses}`)
  log('')

  let totalNewBusinesses = 0
  let statesCompleted = 0
  let lastSyncTime = Date.now()

  for (const [stateCode, stateInfo] of stateList) {
    const result = await crawlState('US', stateCode, stateInfo.bbox, stateInfo.name)
    totalNewBusinesses += result.newBusinesses
    statesCompleted++

    // Sync to Supabase every 30 minutes
    if (!DRY_RUN && Date.now() - lastSyncTime > 30 * 60 * 1000) {
      log('[sync] Running periodic sync to Supabase...')
      const syncResult = await syncToSupabase()
      log(`[sync] Synced: ${syncResult.synced} new, ${syncResult.skipped} dupes, ${syncResult.failed} errors`)
      lastSyncTime = Date.now()
    }

    // Save progress after each state
    saveProgress()

    log(`[progress] ${statesCompleted}/${stateList.length} states complete`)
    log('')
  }

  // Final sync
  if (!DRY_RUN) {
    log('[sync] Running final sync to Supabase...')
    const syncResult = await syncToSupabase()
    log(`[sync] Final sync: ${syncResult.synced} new, ${syncResult.skipped} dupes, ${syncResult.failed} errors`)
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
  log('OPENCLAW CRAWL COMPLETE')
  log('='.repeat(60))
  log(`Duration:           ${formatDuration(elapsed)}`)
  log(`Total cells:        ${totalCells}`)
  log(`Cells completed:    ${final.totalCellsCompleted}`)
  log(`Cells failed:       ${remainingFailed}`)
  log(`Businesses found:   ${final.totalBusinesses}`)
  log(`States covered:     ${storage.states}`)
  log(`Cities discovered:  ${storage.cities}`)
  log(`Local files:        ${storage.files}`)
  log('')

  if (remainingFailed === 0) {
    log('STATUS: ALL TASKS COMPLETED SUCCESSFULLY')
  } else {
    log(`STATUS: COMPLETED WITH ${remainingFailed} UNRESOLVABLE CELLS`)
    log('(These cells consistently returned errors from all Overpass endpoints)')
  }
  log('='.repeat(60))
}

main().catch((err) => {
  log(`[fatal] ${err.message}`)
  saveProgress()
  process.exit(1)
})

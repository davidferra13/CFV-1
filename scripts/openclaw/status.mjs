#!/usr/bin/env node

// Quick status check for OpenClaw crawler.
// Run: node status.mjs

import { readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { countCells } from './lib/grid.mjs'
import { getStorageStats } from './lib/storage.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const regionsPath = join(__dirname, 'data', 'regions.json')
const progressPath = join(__dirname, 'data', 'progress.json')

const regions = JSON.parse(readFileSync(regionsPath, 'utf-8'))

// Count total cells
let totalCells = 0
for (const [, info] of Object.entries(regions.US)) {
  if (info.zones) {
    for (const zone of info.zones) totalCells += countCells(zone.bbox)
  } else {
    totalCells += countCells(info.bbox)
  }
}

// Load progress
let progress = null
if (existsSync(progressPath)) {
  progress = JSON.parse(readFileSync(progressPath, 'utf-8'))
}

const storage = getStorageStats()

console.log('')
console.log('='.repeat(50))
console.log('OpenClaw Status Report')
console.log('='.repeat(50))

if (!progress) {
  console.log('Status: NOT STARTED')
  console.log(`Total cells to crawl: ${totalCells}`)
} else {
  const completed = progress.totalCellsCompleted
  const failed = Object.keys(progress.failedCells).length
  const pct = ((completed / totalCells) * 100).toFixed(1)

  console.log(`Started:         ${progress.startedAt}`)
  console.log(`Last updated:    ${progress.lastUpdated}`)
  console.log('')
  console.log(`Progress:        ${completed} / ${totalCells} cells (${pct}%)`)
  console.log(`Failed cells:    ${failed}`)
  console.log(`Businesses:      ${progress.totalBusinesses}`)
  console.log('')
  console.log(`States on disk:  ${storage.states}`)
  console.log(`City files:      ${storage.cities}`)
  console.log(`Total files:     ${storage.files}`)
  console.log('')

  if (completed >= totalCells && failed === 0) {
    console.log('STATUS: COMPLETE - All tasks finished successfully')
  } else if (completed >= totalCells) {
    console.log(`STATUS: COMPLETE WITH ERRORS - ${failed} cells could not be crawled`)
  } else {
    const remaining = totalCells - completed
    // Estimate: ~6 seconds per cell
    const etaHours = (remaining * 6) / 3600
    console.log(`STATUS: IN PROGRESS`)
    console.log(`Remaining:       ${remaining} cells (~${etaHours.toFixed(0)} hours at current rate)`)
  }
}

console.log('='.repeat(50))
console.log('')

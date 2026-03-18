// Local filesystem storage for crawler findings.
// Organizes by country/state/city. Tracks progress for resume.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import config from '../config.json' with { type: 'json' }

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE_DIR = join(__dirname, '..', config.storage.findingsDir)
const PROGRESS_FILE = join(__dirname, '..', config.storage.progressFile)

// ─── Progress tracking ─────────────────────────────────────────────────────────

let progress = null

export function loadProgress() {
  try {
    if (existsSync(PROGRESS_FILE)) {
      progress = JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'))
    } else {
      progress = {
        startedAt: new Date().toISOString(),
        completedCells: {},
        failedCells: {},
        totalBusinesses: 0,
        totalCellsCompleted: 0,
        lastUpdated: new Date().toISOString(),
      }
      saveProgress()
    }
  } catch {
    progress = {
      startedAt: new Date().toISOString(),
      completedCells: {},
      failedCells: {},
      totalBusinesses: 0,
      totalCellsCompleted: 0,
      lastUpdated: new Date().toISOString(),
    }
  }
  return progress
}

export function saveProgress() {
  if (!progress) return
  progress.lastUpdated = new Date().toISOString()
  mkdirSync(dirname(PROGRESS_FILE), { recursive: true })
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2))
}

export function markCellComplete(cellId, businessCount) {
  if (!progress) loadProgress()
  progress.completedCells[cellId] = {
    completedAt: new Date().toISOString(),
    businesses: businessCount,
  }
  progress.totalBusinesses += businessCount
  progress.totalCellsCompleted++
  // Remove from failed if it was there
  delete progress.failedCells[cellId]
  // Save every 10 cells to reduce disk writes
  if (progress.totalCellsCompleted % 10 === 0) {
    saveProgress()
  }
}

export function markCellFailed(cellId, reason) {
  if (!progress) loadProgress()
  const existing = progress.failedCells[cellId] || { attempts: 0 }
  progress.failedCells[cellId] = {
    attempts: existing.attempts + 1,
    lastAttempt: new Date().toISOString(),
    reason,
  }
  saveProgress()
}

export function isCellDone(cellId) {
  if (!progress) loadProgress()
  return !!progress.completedCells[cellId]
}

export function getProgress() {
  if (!progress) loadProgress()
  return progress
}

// ─── Findings storage ───────────────────────────────────────────────────────────

/**
 * Save findings for a cell, organized by state and city.
 */
export function saveFindings(stateCode, businesses) {
  if (!businesses || businesses.length === 0) return

  // Group by city
  const byCity = {}
  for (const biz of businesses) {
    const city = biz.address?.city || '_unknown'
    if (!byCity[city]) byCity[city] = []
    byCity[city].push(biz)
  }

  for (const [city, bizList] of Object.entries(byCity)) {
    const safeCity = city.replace(/[^a-zA-Z0-9 .-]/g, '').replace(/\s+/g, '_').toLowerCase()
    const dir = join(BASE_DIR, 'US', stateCode)
    mkdirSync(dir, { recursive: true })

    const filePath = join(dir, `${safeCity}.json`)

    // Append to existing file if it exists
    let existing = []
    try {
      if (existsSync(filePath)) {
        existing = JSON.parse(readFileSync(filePath, 'utf-8'))
      }
    } catch {
      existing = []
    }

    // Merge, dedup by osm_id
    const existingIds = new Set(existing.map((b) => b.osm_id))
    const newBiz = bizList.filter((b) => !existingIds.has(b.osm_id))

    if (newBiz.length > 0) {
      const merged = [...existing, ...newBiz]
      writeFileSync(filePath, JSON.stringify(merged, null, 2))
    }
  }
}

// ─── Stats ──────────────────────────────────────────────────────────────────────

/**
 * Get storage stats (total files, total businesses on disk).
 */
export function getStorageStats() {
  const stats = { files: 0, states: 0, cities: 0 }
  const usDir = join(BASE_DIR, 'US')

  if (!existsSync(usDir)) return stats

  const states = readdirSync(usDir).filter((f) => {
    try { return statSync(join(usDir, f)).isDirectory() } catch { return false }
  })
  stats.states = states.length

  for (const state of states) {
    const files = readdirSync(join(usDir, state)).filter((f) => f.endsWith('.json'))
    stats.files += files.length
    stats.cities += files.length
  }

  return stats
}

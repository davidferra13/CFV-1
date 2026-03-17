// Checkpoint Manager - Save and restore agent state for crash recovery.
// Checkpoints include Q-table state, epsilon, episode counter, and coverage data.

import fs from 'fs'
import path from 'path'
import type { CheckpointMeta } from './types'
import * as db from './database'

const CHECKPOINT_DIR = path.resolve(__dirname, '../../data/rl-checkpoints')

/**
 * Save a checkpoint of the current agent state.
 */
export function saveCheckpoint(
  episodeNumber: number,
  epsilon: number,
  totalReward: number
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const checkpointId = `checkpoint-${timestamp}`
  const checkpointPath = path.join(CHECKPOINT_DIR, checkpointId)

  // Ensure directory exists
  fs.mkdirSync(checkpointPath, { recursive: true })

  // Save metadata
  const meta: CheckpointMeta = {
    timestamp: new Date().toISOString(),
    episodeNumber,
    epsilon,
    totalReward,
    routesCovered: db.getRouteCoverageCount(),
    anomaliesFound: db.getAnomalyCount(),
  }

  fs.writeFileSync(path.join(checkpointPath, 'meta.json'), JSON.stringify(meta, null, 2))

  // Save episode counter state
  fs.writeFileSync(
    path.join(checkpointPath, 'episode_counter.json'),
    JSON.stringify({ episodeNumber, epsilon }, null, 2)
  )

  console.log(`[checkpoint] Saved checkpoint ${checkpointId} at episode ${episodeNumber}`)
  return checkpointId
}

/**
 * Find and load the most recent valid checkpoint.
 * Returns null if no valid checkpoint exists.
 */
export function loadLatestCheckpoint(): {
  episodeNumber: number
  epsilon: number
  checkpointId: string
} | null {
  if (!fs.existsSync(CHECKPOINT_DIR)) return null

  const entries = fs
    .readdirSync(CHECKPOINT_DIR)
    .filter((e) => e.startsWith('checkpoint-'))
    .sort()
    .reverse()

  for (const entry of entries) {
    const checkpointPath = path.join(CHECKPOINT_DIR, entry)
    const metaPath = path.join(checkpointPath, 'meta.json')
    const counterPath = path.join(checkpointPath, 'episode_counter.json')

    if (!fs.existsSync(metaPath) || !fs.existsSync(counterPath)) continue

    try {
      const counter = JSON.parse(fs.readFileSync(counterPath, 'utf-8'))
      console.log(`[checkpoint] Loaded checkpoint ${entry} at episode ${counter.episodeNumber}`)
      return {
        episodeNumber: counter.episodeNumber,
        epsilon: counter.epsilon,
        checkpointId: entry,
      }
    } catch (err) {
      console.warn(`[checkpoint] Failed to load checkpoint ${entry}:`, err)
      continue
    }
  }

  return null
}

/**
 * Clean up old checkpoints, keeping only the N most recent.
 */
export function pruneCheckpoints(keepCount: number = 5): void {
  if (!fs.existsSync(CHECKPOINT_DIR)) return

  const entries = fs
    .readdirSync(CHECKPOINT_DIR)
    .filter((e) => e.startsWith('checkpoint-'))
    .sort()

  if (entries.length <= keepCount) return

  const toDelete = entries.slice(0, entries.length - keepCount)
  for (const entry of toDelete) {
    const checkpointPath = path.join(CHECKPOINT_DIR, entry)
    fs.rmSync(checkpointPath, { recursive: true, force: true })
  }

  console.log(`[checkpoint] Pruned ${toDelete.length} old checkpoints`)
}

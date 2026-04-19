// CIL - Exponential decay for relation strengths
// Runs daily as a scheduled job. Relations weaken over time without reinforcement.

import type Database from 'better-sqlite3'

// Per-entity-type decay rates (from CIL spec)
// Lambda values: higher = faster decay
const DECAY_RATES: Record<string, number> = {
  chef: 0.003, // half-life: 231 days
  client: 0.003, // half-life: 231 days
  event: 0.03, // half-life: 23 days
  ingredient: 0.01, // half-life: 69 days
  vendor: 0.005, // half-life: 139 days
  recipe: 0.005, // half-life: 139 days
  staff: 0.01, // half-life: 69 days
}

const MS_PER_DAY = 86_400_000
const ARCHIVE_THRESHOLD = 0.05
const ARCHIVE_MIN_DAYS = 90

interface RelationRow {
  id: string
  from_entity: string
  strength: number
  periodicity: number | null
  last_reinforced: number
}

export function runDecay(
  db: Database.Database,
  now?: number
): { decayed: number; archived: number } {
  const currentTime = now ?? Date.now()
  let decayed = 0
  let archived = 0

  const relations = db
    .prepare(
      'SELECT id, from_entity, strength, periodicity, last_reinforced FROM relations WHERE chef_override = 0'
    )
    .all() as RelationRow[]

  const updateStmt = db.prepare('UPDATE relations SET strength = ? WHERE id = ?')
  const deleteStmt = db.prepare('DELETE FROM relations WHERE id = ?')

  const runInTransaction = db.transaction(() => {
    for (const rel of relations) {
      const daysSinceReinforced = (currentTime - rel.last_reinforced) / MS_PER_DAY
      if (daysSinceReinforced < 1) continue // Skip recently reinforced

      const entityType = rel.from_entity.split('_')[0]
      const lambda = DECAY_RATES[entityType] ?? 0.01
      const decayFactor = Math.exp(-lambda * daysSinceReinforced)
      const newStrength = rel.strength * decayFactor

      // Periodic relations get extended grace period
      const archiveAfterDays = rel.periodicity ? rel.periodicity * 1.5 : ARCHIVE_MIN_DAYS

      if (newStrength < ARCHIVE_THRESHOLD && daysSinceReinforced > archiveAfterDays) {
        // Archive: remove from active graph
        // (In future phases, move to archived_relations table instead of deleting)
        deleteStmt.run(rel.id)
        archived++
      } else if (Math.abs(newStrength - rel.strength) > 0.001) {
        updateStmt.run(newStrength, rel.id)
        decayed++
      }
    }
  })

  runInTransaction()
  return { decayed, archived }
}

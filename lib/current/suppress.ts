// The Current - Suppression Rules
// Dedup, category interleave, source diversity.

import type { CurrentUnit } from './types'

/**
 * Deduplicate units by entityType:entityId.
 * Keeps the highest-scored version when the same entity appears in multiple sources.
 */
export function dedup(units: CurrentUnit[]): CurrentUnit[] {
  const seen = new Map<string, CurrentUnit>()

  for (const unit of units) {
    const key = `${unit.entityType}:${unit.entityId}`
    const existing = seen.get(key)

    if (!existing || unit.score > existing.score) {
      seen.set(key, unit)
    }
  }

  return Array.from(seen.values()).sort((a, b) => b.score - a.score)
}

/**
 * Apply suppression rules after dedup:
 * 1. Category interleave: max 2 consecutive from same category
 * 2. Source diversity: max 3 from same source in top 10
 */
export function suppress(units: CurrentUnit[]): CurrentUnit[] {
  const result: CurrentUnit[] = []
  const sourceCountInTop10 = new Map<string, number>()

  for (const unit of units) {
    // Category interleave: check last 2 entries
    if (result.length >= 2) {
      const last = result[result.length - 1]
      const secondLast = result[result.length - 2]
      if (last.category === unit.category && secondLast.category === unit.category) {
        // Would be 3rd consecutive from same category; defer it
        // Push to end of array for later consideration
        continue
      }
    }

    // Source diversity: max 3 from same source in top 10
    if (result.length < 10) {
      const count = sourceCountInTop10.get(unit.source) ?? 0
      if (count >= 3) continue
      sourceCountInTop10.set(unit.source, count + 1)
    }

    result.push(unit)
  }

  return result
}

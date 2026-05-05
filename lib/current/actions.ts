'use server'

import { collectAll } from './collect'
import { rankAll } from './rank'
import { dedup, suppress } from './suppress'
import type { CurrentFeed } from './types'

const GROWTH_MODE_THRESHOLD = 300
const TOP_N = 3

/**
 * Get the unified operational feed for the current chef.
 * Single entry point for The Current dashboard component.
 */
export async function getCurrentFeed(): Promise<CurrentFeed> {
  // 1. Collect from all 7 sources
  const raw = await collectAll()

  // 2. Rank everything
  const ranked = rankAll(raw)

  // 3. Dedup by entity
  const unique = dedup(ranked)

  // 4. Detect growth mode before suppression
  const aboveThreshold = unique.filter((u) => u.score >= GROWTH_MODE_THRESHOLD)
  let growthMode = aboveThreshold.length < 3

  // 5. If growth mode, boost growth/optimization units
  if (growthMode) {
    for (const unit of unique) {
      if (unit.source === 'cil') unit.score += 200
      else if (unit.category === 'optimization') unit.score += 150
      else if (unit.category === 'growth') unit.score += 100
    }
    unique.sort((a, b) => b.score - a.score)
  }

  // 6. Apply suppression rules
  const suppressed = suppress(unique)

  return {
    units: suppressed,
    top: suppressed.slice(0, TOP_N),
    totalCount: suppressed.length,
    growthMode,
    computedAt: new Date().toISOString(),
  }
}

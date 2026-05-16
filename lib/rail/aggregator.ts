// Rail Item Lifecycle Engine: aggregator
// Collects from all source adapters, re-scores, filters, caps, returns tiered result.

import type { RailItem, RailTier, RailItemState } from './types'
import { DENSITY_CAPS, RAIL_TIER_ORDER } from './types'
import {
  calculateScore,
  calculateUrgencyMultiplier,
  calculateFreshnessDecay,
  assignTier,
  applyTimeOfDayDampening,
} from './scoring'
import { getCILRailItems } from './sources/cil'
import { getIntelligenceRailItems } from './sources/intelligence'
import { getCommunicationRailItems } from './sources/communication'
import { getEventRailItems } from './sources/events'
import { getFinanceRailItems } from './sources/finance'

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface AggregatedRailResult {
  critical: RailItem[]
  action: RailItem[]
  awareness: RailItem[]
  opportunity: RailItem[]
  totalItems: number
  overflow: Record<RailTier, number>
  assembledAt: string
}

// ---------------------------------------------------------------------------
// Batch state lookup (avoids N+1 individual DB calls)
// ---------------------------------------------------------------------------

const FILTER_STATES: Set<string> = new Set(['resolved', 'expired', 'archived'])

async function getItemStates(
  tenantId: string,
  userId: string,
  itemKeys: string[]
): Promise<Map<string, { state: string; snoozedUntil: Date | null }>> {
  const map = new Map<string, { state: string; snoozedUntil: Date | null }>()
  if (!itemKeys.length) return map

  const { pgClient } = await import('@/lib/db')
  const rows: Record<string, unknown>[] = await pgClient`
    SELECT item_key, state, snoozed_until
    FROM rail_item_state
    WHERE tenant_id = ${tenantId}
      AND user_id = ${userId}
      AND item_key = ANY(${itemKeys})
  `

  for (const row of rows) {
    map.set(row.item_key as string, {
      state: row.state as string,
      snoozedUntil: row.snoozed_until ? new Date(row.snoozed_until as string) : null,
    })
  }
  return map
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractFulfilled<T>(result: PromiseSettledResult<T[]>): T[] {
  return result.status === 'fulfilled' ? result.value : []
}

function shouldFilter(
  stateEntry: { state: string; snoozedUntil: Date | null } | undefined,
  now: Date
): boolean {
  if (!stateEntry) return false
  if (FILTER_STATES.has(stateEntry.state)) return true
  if (
    stateEntry.state === 'snoozed' &&
    stateEntry.snoozedUntil &&
    stateEntry.snoozedUntil.getTime() > now.getTime()
  ) {
    return true
  }
  return false
}

// ---------------------------------------------------------------------------
// Main aggregator
// ---------------------------------------------------------------------------

export async function aggregateRailItems(
  tenantId: string,
  userId: string
): Promise<AggregatedRailResult> {
  const now = new Date()

  // 1. Collect from all sources in parallel
  const [cil, intel, comm, events, finance] = await Promise.allSettled([
    getCILRailItems(tenantId),
    getIntelligenceRailItems(tenantId),
    getCommunicationRailItems(tenantId),
    getEventRailItems(tenantId),
    getFinanceRailItems(tenantId),
  ])

  // 2. Flatten
  const allItems: RailItem[] = [
    ...extractFulfilled(cil),
    ...extractFulfilled(intel),
    ...extractFulfilled(comm),
    ...extractFulfilled(events),
    ...extractFulfilled(finance),
  ]

  // 3. Re-score each item through the scoring pipeline
  for (const item of allItems) {
    const urgencyMultiplier = calculateUrgencyMultiplier(item.expiresAt, now)
    const freshnessDecay = calculateFreshnessDecay(item.surfacedAt, item.ttlMinutes, now)
    const finalScore = calculateScore({
      baseScore: item.score,
      urgencyMultiplier,
      freshnessDecay,
      userRelevance: 1.0,
    })
    const dampenedScore = applyTimeOfDayDampening(finalScore, now)
    item.score = dampenedScore
    item.tier = assignTier(dampenedScore)
  }

  // 4. Filter out dismissed / snoozed items (batch lookup)
  const itemKeys = allItems.map((item) => `${item.source}:${item.id}`)
  const stateMap = await getItemStates(tenantId, userId, itemKeys)

  const activeItems = allItems.filter((item) => {
    const key = `${item.source}:${item.id}`
    return !shouldFilter(stateMap.get(key), now)
  })

  // 5. Group by tier, sort by score descending, compute overflow, cap
  const grouped: Record<RailTier, RailItem[]> = {
    critical: [],
    action: [],
    awareness: [],
    opportunity: [],
  }

  for (const item of activeItems) {
    grouped[item.tier].push(item)
  }

  const overflow: Record<RailTier, number> = {
    critical: 0,
    action: 0,
    awareness: 0,
    opportunity: 0,
  }

  for (const tier of RAIL_TIER_ORDER) {
    grouped[tier].sort((a, b) => b.score - a.score)
    const cap = DENSITY_CAPS[tier]
    const excess = Math.max(0, grouped[tier].length - cap)
    overflow[tier] = excess
    grouped[tier] = grouped[tier].slice(0, cap)
  }

  const totalItems =
    grouped.critical.length +
    grouped.action.length +
    grouped.awareness.length +
    grouped.opportunity.length

  // 6. Return
  return {
    critical: grouped.critical,
    action: grouped.action,
    awareness: grouped.awareness,
    opportunity: grouped.opportunity,
    totalItems,
    overflow,
    assembledAt: now.toISOString(),
  }
}

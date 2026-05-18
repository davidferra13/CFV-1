/**
 * Feed Aggregation Engine
 *
 * Groups similar rail items to reduce cognitive load.
 * Example: "3 menus need confirmation" instead of 3 separate cards.
 *
 * Critical-tier items are NEVER aggregated; they always show individually.
 * Groups of 1 remain as individual items (no wrapping).
 */

import type { UniversalRailItem } from '@/lib/discovery/universal-rail-types'
import { extractGroupKey, getWindowMs } from './aggregation-rules'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AggregatedFeedItem {
  kind: 'aggregated'
  /** The key used to group these items (category::verb) */
  groupKey: string
  /** Number of items in the group */
  count: number
  /** All grouped items, sorted by score descending */
  items: UniversalRailItem[]
  /** Highest-scoring item, used for summary display */
  representativeItem: UniversalRailItem
  /** Whether the group can be expanded in the UI */
  expandable: boolean
  /** Human-readable summary label for the group */
  label?: string
}

export type FeedItem = AggregatedFeedItem | UniversalRailItem

// ---------------------------------------------------------------------------
// Tier detection
//
// Items with baseUrgency >= 80 are critical tier.
// Same threshold as TIER_THRESHOLDS in rail/types.ts.
// ---------------------------------------------------------------------------

const CRITICAL_URGENCY_FLOOR = 80

function isCriticalTier(item: UniversalRailItem): boolean {
  return item.baseUrgency >= CRITICAL_URGENCY_FLOOR
}

// ---------------------------------------------------------------------------
// Time window check
// ---------------------------------------------------------------------------

function areWithinWindow(items: UniversalRailItem[], windowMs: number): boolean {
  if (items.length < 2) return true

  // Use lastSeenAt or fall back to treating all items as within window
  // when timestamps are not available
  const timestamps = items
    .map((i) => (i.lastSeenAt ? new Date(i.lastSeenAt).getTime() : null))
    .filter((t): t is number => t !== null)

  // If no timestamps, assume items are within window (they came from
  // the same assembly pass)
  if (timestamps.length < 2) return true

  const min = Math.min(...timestamps)
  const max = Math.max(...timestamps)
  return max - min <= windowMs
}

// ---------------------------------------------------------------------------
// Core grouping
// ---------------------------------------------------------------------------

/**
 * Group scored rail items by source + action verb within a time window.
 *
 * Rules:
 * 1. Critical-tier items are never grouped.
 * 2. Items sharing the same groupKey AND within the time window get grouped.
 * 3. Groups of 1 are returned as plain UniversalRailItems (no wrapper).
 * 4. Groups are sorted by the representative item's score (highest first).
 */
export function groupFeedItems(items: UniversalRailItem[]): FeedItem[] {
  const critical: UniversalRailItem[] = []
  const groupable: UniversalRailItem[] = []

  // 1. Separate critical items
  for (const item of items) {
    if (isCriticalTier(item)) {
      critical.push(item)
    } else {
      groupable.push(item)
    }
  }

  // 2. Group by key
  const groups = new Map<string, UniversalRailItem[]>()
  for (const item of groupable) {
    const key = extractGroupKey(item)
    const existing = groups.get(key)
    if (existing) {
      existing.push(item)
    } else {
      groups.set(key, [item])
    }
  }

  // 3. Build output, applying time window filter
  const result: FeedItem[] = []

  // Critical items first, always individual
  for (const item of critical) {
    result.push(item)
  }

  // Process groups
  for (const [groupKey, groupItems] of groups) {
    // Sort by score descending within the group
    groupItems.sort((a, b) => b.score - a.score)

    const windowMs = getWindowMs(groupItems[0].category)

    // Check time window; if items span too wide, split into sub-groups
    if (groupItems.length >= 2 && areWithinWindow(groupItems, windowMs)) {
      const representative = groupItems[0] // highest score
      result.push({
        kind: 'aggregated',
        groupKey,
        count: groupItems.length,
        items: groupItems,
        representativeItem: representative,
        expandable: true,
      })
    } else if (groupItems.length >= 2) {
      // Items outside window: try to form sub-groups by proximity
      const subGroups = splitByWindow(groupItems, windowMs)
      for (const sub of subGroups) {
        if (sub.length >= 2) {
          sub.sort((a, b) => b.score - a.score)
          result.push({
            kind: 'aggregated',
            groupKey,
            count: sub.length,
            items: sub,
            representativeItem: sub[0],
            expandable: true,
          })
        } else {
          result.push(sub[0])
        }
      }
    } else {
      // Single item, no wrapping
      result.push(groupItems[0])
    }
  }

  // 4. Sort final output: critical first (by score), then by representative score
  result.sort((a, b) => {
    const scoreA = isAggregated(a) ? a.representativeItem.score : a.score
    const scoreB = isAggregated(b) ? b.representativeItem.score : b.score
    const critA = !isAggregated(a) && isCriticalTier(a) ? 1 : 0
    const critB = !isAggregated(b) && isCriticalTier(b) ? 1 : 0
    // Critical items always on top
    if (critA !== critB) return critB - critA
    return scoreB - scoreA
  })

  return result
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Type guard for AggregatedFeedItem.
 */
export function isAggregated(item: FeedItem): item is AggregatedFeedItem {
  return 'kind' in item && item.kind === 'aggregated'
}

/**
 * Split items into sub-groups where each sub-group fits within the time window.
 * Greedy approach: iterate sorted-by-time, start a new group when gap exceeds window.
 */
function splitByWindow(items: UniversalRailItem[], windowMs: number): UniversalRailItem[][] {
  const sorted = [...items].sort((a, b) => {
    const tA = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0
    const tB = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0
    return tA - tB
  })

  const groups: UniversalRailItem[][] = []
  let current: UniversalRailItem[] = [sorted[0]]
  const firstSeen = sorted[0].lastSeenAt
  let windowStart = firstSeen ? new Date(firstSeen).getTime() : 0

  for (let i = 1; i < sorted.length; i++) {
    const seen = sorted[i].lastSeenAt
    const t = seen ? new Date(seen).getTime() : 0
    if (t - windowStart <= windowMs) {
      current.push(sorted[i])
    } else {
      groups.push(current)
      current = [sorted[i]]
      windowStart = t
    }
  }
  groups.push(current)

  return groups
}

/**
 * Temporal Resurfacing Engine
 *
 * Applies time-aware score modifiers to feed items.
 * Deadline proximity, staleness decay, recurrence detection,
 * and time-of-day relevance. Pure functions only.
 */

import type { UniversalRailItem } from '@/lib/discovery/universal-rail-types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TemporalModifier {
  multiplier: number
  reason: 'deadline_proximity' | 'staleness_decay' | 'recurrence' | 'time_of_day' | 'none'
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MS_HOUR = 3_600_000
const MS_DAY = 86_400_000

/** Categories boosted in the morning (before noon) */
const MORNING_CATEGORIES = new Set([
  'inventory',
  'prep',
  'ingredients',
  'shopping',
  'delivery',
  'schedule',
])

/** Categories boosted in the evening (after 5pm) */
const EVENING_CATEGORIES = new Set([
  'finance',
  'reports',
  'analytics',
  'billing',
  'invoicing',
  'review',
])

// ---------------------------------------------------------------------------
// Window parsing
// ---------------------------------------------------------------------------

const FRESHNESS_MULTIPLIERS: Record<string, number> = {
  m: 60_000, // minutes
  h: MS_HOUR,
  d: MS_DAY,
  w: 7 * MS_DAY,
}

function parseWindowMs(window: string): number {
  const match = window.match(/^(\d+)([mhdw])$/)
  if (!match) return MS_DAY
  const value = parseInt(match[1], 10)
  return value * (FRESHNESS_MULTIPLIERS[match[2]] ?? MS_DAY)
}

// ---------------------------------------------------------------------------
// Individual modifier computations
// ---------------------------------------------------------------------------

function deadlineModifier(item: UniversalRailItem, now: Date): TemporalModifier {
  if (!item.expiresAt) return { multiplier: 1, reason: 'none' }

  const remaining = new Date(item.expiresAt).getTime() - now.getTime()

  if (remaining < 0) return { multiplier: 0.5, reason: 'deadline_proximity' }
  if (remaining <= 4 * MS_HOUR) return { multiplier: 2, reason: 'deadline_proximity' }
  if (remaining <= 24 * MS_HOUR) return { multiplier: 1.5, reason: 'deadline_proximity' }
  return { multiplier: 1, reason: 'none' }
}

function stalenessModifier(item: UniversalRailItem, now: Date): TemporalModifier {
  if (!item.lastSeenAt) return { multiplier: 1, reason: 'none' }

  const fw =
    typeof item.metadata?.freshnessWindow === 'string' ? item.metadata.freshnessWindow : '1d'
  const windowMs = parseWindowMs(fw)
  const age = now.getTime() - new Date(item.lastSeenAt).getTime()

  if (age <= windowMs) return { multiplier: 1, reason: 'none' }
  if (age <= 2 * windowMs) {
    const progress = (age - windowMs) / windowMs
    return { multiplier: Math.max(0.5, 1 - 0.5 * progress), reason: 'staleness_decay' }
  }
  if (age <= 4 * windowMs) {
    const progress = (age - 2 * windowMs) / (2 * windowMs)
    return { multiplier: Math.max(0.25, 0.5 - 0.25 * progress), reason: 'staleness_decay' }
  }
  return { multiplier: 0.25, reason: 'staleness_decay' }
}

function recurrenceModifier(item: UniversalRailItem): TemporalModifier {
  const meta = item.metadata
  const dismissCount = typeof meta?.dismissCount === 'number' ? meta.dismissCount : 0
  const reappearCount = typeof meta?.reappearCount === 'number' ? meta.reappearCount : 0
  const daySpan = typeof meta?.reappearDaySpan === 'number' ? meta.reappearDaySpan : 0

  if (dismissCount >= 1 && reappearCount >= 3 && daySpan <= 7) {
    return { multiplier: 1.2, reason: 'recurrence' }
  }
  return { multiplier: 1, reason: 'none' }
}

function timeOfDayModifier(item: UniversalRailItem, now: Date): TemporalModifier {
  const hour = now.getHours()
  const cat = item.category.toLowerCase()

  if (hour < 12 && MORNING_CATEGORIES.has(cat)) {
    return { multiplier: 1.3, reason: 'time_of_day' }
  }
  if (hour >= 17 && EVENING_CATEGORIES.has(cat)) {
    return { multiplier: 1.3, reason: 'time_of_day' }
  }
  return { multiplier: 1, reason: 'none' }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute the strongest temporal modifier for a single item.
 * Picks the modifier with the largest deviation from 1.0.
 */
export function computeTemporalModifier(
  item: UniversalRailItem,
  now: Date = new Date()
): TemporalModifier {
  const candidates: TemporalModifier[] = [
    deadlineModifier(item, now),
    stalenessModifier(item, now),
    recurrenceModifier(item),
    timeOfDayModifier(item, now),
  ]

  let strongest: TemporalModifier = { multiplier: 1, reason: 'none' }
  let maxDeviation = 0

  for (const mod of candidates) {
    const deviation = Math.abs(mod.multiplier - 1)
    if (deviation > maxDeviation) {
      maxDeviation = deviation
      strongest = mod
    }
  }

  return strongest
}

/**
 * Apply temporal scoring to a list of items.
 * Returns new item objects with adjusted scores. Originals are not mutated.
 * Only the strongest single modifier is applied per item (no stacking).
 */
export function applyTemporalScoring(
  items: UniversalRailItem[],
  now: Date = new Date()
): UniversalRailItem[] {
  return items.map((item) => {
    const mod = computeTemporalModifier(item, now)
    if (mod.reason === 'none') return item
    return { ...item, score: Math.round(item.score * mod.multiplier * 100) / 100 }
  })
}

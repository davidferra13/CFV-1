// Day Capacity Scoring & Grocery Window Detection
// Pure functions - no DB calls, no side effects, fully testable.

import type { WeekDay } from './types'

// ============================================
// CAPACITY SCORING
// ============================================

export type CapacityLabel = 'free' | 'light' | 'moderate' | 'heavy' | 'overloaded'

export interface DayCapacity {
  score: number
  label: CapacityLabel
  eventCount: number
}

export function computeDayCapacity(day: WeekDay): DayCapacity {
  let score = 0

  for (const event of day.events) {
    score += 30 // base per event
    score += (event.guestCount ?? 4) * 2 // guests add load
  }

  if (day.isPrepDayFor && day.isPrepDayFor.length > 0) score += 20
  if (day.events.length > 1) score += 30 // multi-event day penalty

  const label: CapacityLabel =
    score === 0
      ? 'free'
      : score < 30
        ? 'light'
        : score < 60
          ? 'moderate'
          : score < 90
            ? 'heavy'
            : 'overloaded'

  return { score, label, eventCount: day.events.length }
}

export const CAPACITY_COLORS: Record<CapacityLabel, string> = {
  free: 'text-stone-500',
  light: 'text-emerald-400',
  moderate: 'text-amber-400',
  heavy: 'text-orange-400',
  overloaded: 'text-red-400',
}

export const CAPACITY_BG: Record<CapacityLabel, string> = {
  free: '',
  light: '',
  moderate: '',
  heavy: '',
  overloaded: 'ring-2 ring-red-500 animate-pulse',
}

// ============================================
// GROCERY SHOPPING WINDOWS
// ============================================

export interface GroceryWindow {
  shopDate: string
  forEventId: string
  forEventDate: string
  suggestedTime: string
  reason: string
  consolidatedWith?: string[]
}

export function findGroceryWindows(
  weekDays: WeekDay[],
  eventsNeedingShopping: Array<{ eventDate: string; eventId: string }>
): GroceryWindow[] {
  const windows: GroceryWindow[] = []

  for (const event of eventsNeedingShopping) {
    const eventDayIndex = weekDays.findIndex((d) => d.date === event.eventDate)
    if (eventDayIndex < 0) continue

    // Look backwards for free/light days (shop 1-2 days before)
    for (let i = eventDayIndex - 1; i >= Math.max(0, eventDayIndex - 2); i--) {
      const day = weekDays[i]
      const capacity = computeDayCapacity(day)
      if (capacity.label === 'free' || capacity.label === 'light') {
        windows.push({
          shopDate: day.date,
          forEventId: event.eventId,
          forEventDate: event.eventDate,
          suggestedTime: '9:00 AM - 12:00 PM',
          reason: `${capacity.label} day, ${eventDayIndex - i}d before event`,
        })
        break
      }
    }
  }

  // Consolidation: if multiple events can share a shopping trip on the same day
  const byDate = new Map<string, GroceryWindow[]>()
  for (const w of windows) {
    const arr = byDate.get(w.shopDate) ?? []
    arr.push(w)
    byDate.set(w.shopDate, arr)
  }
  for (const [, wins] of byDate) {
    if (wins.length > 1) {
      wins[0].consolidatedWith = wins.slice(1).map((w) => w.forEventId)
      wins[0].reason += ` (buy for ${wins.length} events in one trip)`
    }
  }

  return windows
}

// ============================================
// REST DAY ENFORCEMENT
// ============================================

export interface RestDayWarning {
  severity: 'warning' | 'critical'
  message: string
  suggestedRestDay: string | null
}

export function checkRestDays(weekDays: WeekDay[]): RestDayWarning | null {
  const consecutiveWork = longestConsecutiveRun(
    weekDays,
    (d) => d.events.length > 0 || (d.isPrepDayFor != null && d.isPrepDayFor.length > 0)
  )

  if (consecutiveWork >= 6) {
    const freeDay = weekDays.find(
      (d) => d.events.length === 0 && !(d.isPrepDayFor && d.isPrepDayFor.length > 0)
    )
    return {
      severity: 'critical',
      message: `${consecutiveWork} consecutive working days. Block a rest day.`,
      suggestedRestDay: freeDay?.date ?? null,
    }
  }

  if (consecutiveWork >= 5) {
    const freeDay = weekDays.find(
      (d) => d.events.length === 0 && !(d.isPrepDayFor && d.isPrepDayFor.length > 0)
    )
    return {
      severity: 'warning',
      message: 'No rest day this week. Consider blocking one.',
      suggestedRestDay: freeDay?.date ?? null,
    }
  }

  return null
}

function longestConsecutiveRun<T>(items: T[], predicate: (item: T) => boolean): number {
  let max = 0
  let current = 0
  for (const item of items) {
    if (predicate(item)) {
      current++
      max = Math.max(max, current)
    } else {
      current = 0
    }
  }
  return max
}

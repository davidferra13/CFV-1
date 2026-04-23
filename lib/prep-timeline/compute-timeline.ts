// Pure function: compute reverse prep timeline from recipes + event service time.
// No database calls, no side effects. Takes data in, returns structured timeline.

import {
  startOfDay,
  differenceInCalendarDays,
  addDays,
  isBefore,
  isToday,
  isSameDay,
  format,
} from 'date-fns'
import { resolvePeakWindow, hasExplicitPeakWindow, hasCategoryDefaults } from './peak-defaults'
import type { StorageMethod, HoldClass, PrepTier } from './peak-defaults'

// --- Types ---

export type PrepSymbol =
  | 'freezable'
  | 'day_of'
  | 'fresh'
  | 'safety_warning'
  | 'allergen'
  | 'serve_immediately'
  | 'hold_warm'

export interface PrepItem {
  recipeId: string
  recipeName: string
  componentName: string
  dishName: string
  courseName: string
  peakHoursMin: number
  peakHoursMax: number
  safetyHoursMax: number
  effectiveCeiling: number // min(peakHoursMax, safetyHoursMax)
  storageMethod: StorageMethod
  freezable: boolean
  frozenExtendsHours: number | null
  prepTimeMinutes: number
  activeMinutes: number
  passiveMinutes: number
  holdClass: HoldClass
  prepTier: PrepTier
  usingDefaults: boolean
  symbols: PrepSymbol[]
  allergenFlags: string[]
}

export interface PrepDay {
  date: Date
  label: string
  daysBeforeService: number
  isToday: boolean
  isPast: boolean
  isServiceDay: boolean
  deadlineType: 'grocery' | 'prep' | null
  items: PrepItem[]
  totalPrepMinutes: number
  activeMinutes: number
  passiveMinutes: number
}

export interface PrepTimeline {
  days: PrepDay[]
  groceryDeadline: Date | null
  prepDeadline: Date | null
  serviceDate: Date
  untimedItems: PrepItem[] // recipes with no peak windows and no category defaults
}

// --- Input type (what comes from the DB query) ---

export interface TimelineRecipeInput {
  recipeId: string
  recipeName: string
  componentName: string
  dishName: string
  courseName: string
  category: string | null
  peakHoursMin: number | null
  peakHoursMax: number | null
  safetyHoursMax: number | null
  storageMethod: string | null
  freezable: boolean | null
  frozenExtendsHours: number | null
  prepTimeMinutes: number
  activeMinutes: number | null
  passiveMinutes: number | null
  holdClass: string | null
  prepTier: string | null
  allergenFlags: string[]
  // Fallback from components table
  makeAheadWindowHours: number | null
}

// --- Core computation ---

export function computePrepTimeline(
  items: TimelineRecipeInput[],
  serviceDateTime: Date
): PrepTimeline {
  const serviceDay = startOfDay(serviceDateTime)
  const now = new Date()
  const today = startOfDay(now)

  const prepItems: PrepItem[] = items.map((item) => {
    // Resolve peak window: recipe fields > component fallback > category defaults
    let resolved = resolvePeakWindow({
      peak_hours_min: item.peakHoursMin,
      peak_hours_max: item.peakHoursMax,
      safety_hours_max: item.safetyHoursMax,
      storage_method: item.storageMethod,
      freezable: item.freezable,
      category: item.category,
    })

    // Fallback to components.make_ahead_window_hours if no recipe-level or category data
    if (
      item.peakHoursMin == null &&
      item.peakHoursMax == null &&
      item.makeAheadWindowHours != null
    ) {
      resolved = {
        ...resolved,
        peakHoursMax: item.makeAheadWindowHours,
        peakHoursMin: 0,
      }
    }

    const effectiveCeiling = Math.min(resolved.peakHoursMax, resolved.safetyHoursMax)
    const usingDefaults = !hasExplicitPeakWindow({
      peak_hours_min: item.peakHoursMin,
      peak_hours_max: item.peakHoursMax,
    })

    // Compute symbols
    const symbols: PrepSymbol[] = []
    if (resolved.freezable) symbols.push('freezable')
    if (effectiveCeiling < 4) symbols.push('day_of')
    else if (effectiveCeiling < 8) symbols.push('fresh')
    if (resolved.peakHoursMax > resolved.safetyHoursMax) symbols.push('safety_warning')
    if (item.allergenFlags.length > 0) symbols.push('allergen')

    // Hold class symbols
    const itemHoldClass = (item.holdClass as HoldClass) ?? resolved.holdClass
    const itemPrepTier = (item.prepTier as PrepTier) ?? resolved.prepTier
    if (itemHoldClass === 'serve_immediately') symbols.push('serve_immediately')
    else if (itemHoldClass === 'hold_warm') symbols.push('hold_warm')

    return {
      recipeId: item.recipeId,
      recipeName: item.recipeName,
      componentName: item.componentName,
      dishName: item.dishName,
      courseName: item.courseName,
      peakHoursMin: resolved.peakHoursMin,
      peakHoursMax: resolved.peakHoursMax,
      safetyHoursMax: resolved.safetyHoursMax,
      effectiveCeiling: effectiveCeiling,
      storageMethod: resolved.storageMethod,
      freezable: resolved.freezable,
      frozenExtendsHours: item.frozenExtendsHours ?? null,
      prepTimeMinutes: item.prepTimeMinutes,
      activeMinutes: item.activeMinutes ?? item.prepTimeMinutes,
      passiveMinutes: item.passiveMinutes ?? 0,
      holdClass: itemHoldClass,
      prepTier: itemPrepTier,
      usingDefaults,
      symbols,
      allergenFlags: item.allergenFlags,
    }
  })

  // Separate items with explicit/category windows from those using generic fallback.
  // Truly "untimed" = no recipe peak fields, no component make-ahead, AND no category-specific defaults.
  // Items with a known category (sauce, protein, etc.) use meaningful defaults and ARE timed.
  const timedItems: PrepItem[] = []
  const untimedItems: PrepItem[] = []

  for (let idx = 0; idx < prepItems.length; idx++) {
    const item = prepItems[idx]
    const input = items[idx]
    const hasExplicit = !item.usingDefaults
    const hasMakeAhead = input.makeAheadWindowHours != null
    const hasCategoryMatch = hasCategoryDefaults(input.category)

    if (hasExplicit || hasMakeAhead || hasCategoryMatch) {
      timedItems.push(item)
    } else {
      untimedItems.push(item)
    }
  }

  // Place each timed item on its optimal prep day
  // Optimal day = middle of the peak window, converted to calendar days before service
  const dayMap = new Map<number, PrepItem[]>() // key = days before service

  for (const item of timedItems) {
    // Convert hours to days before service
    // The item should be prepped between (service - effectiveCeiling) and (service - peakHoursMin)
    const earliestDaysBefore = Math.floor(item.effectiveCeiling / 24)
    const latestDaysBefore = Math.floor(item.peakHoursMin / 24)

    // Pick the optimal day: prefer 1 day before if within range, otherwise middle of window
    let optimalDay: number
    if (earliestDaysBefore === latestDaysBefore) {
      optimalDay = earliestDaysBefore
    } else if (latestDaysBefore <= 1 && earliestDaysBefore >= 1) {
      // If 1 day before is in range, use it (prep day before = safest habit)
      optimalDay = 1
    } else {
      // Middle of the window
      optimalDay = Math.floor((earliestDaysBefore + latestDaysBefore) / 2)
    }

    const existing = dayMap.get(optimalDay) ?? []
    existing.push(item)
    dayMap.set(optimalDay, existing)
  }

  // Build day cards
  const allDayOffsets = Array.from(dayMap.keys()).sort((a, b) => b - a) // descending (farthest first)

  // Ensure service day (0) is always included if there are any items
  if (timedItems.length > 0 && !dayMap.has(0)) {
    dayMap.set(0, [])
    if (!allDayOffsets.includes(0)) allDayOffsets.push(0)
    allDayOffsets.sort((a, b) => b - a)
  }

  const days: PrepDay[] = allDayOffsets.map((offset) => {
    const date = addDays(serviceDay, -offset)
    const dayItems = dayMap.get(offset) ?? []

    const TIER_ORDER: Record<PrepTier, number> = {
      base: 0,
      secondary: 1,
      tertiary: 2,
      finishing: 3,
    }

    return {
      date,
      label: getDayLabel(offset),
      daysBeforeService: offset,
      isToday: isToday(date),
      isPast: isBefore(date, today) && !isToday(date),
      isServiceDay: offset === 0,
      deadlineType: null, // set below
      items: dayItems.sort((a, b) => {
        // Primary: prep tier (base first)
        const tierDiff = TIER_ORDER[a.prepTier] - TIER_ORDER[b.prepTier]
        if (tierDiff !== 0) return tierDiff
        // Secondary: longest active time first
        return b.activeMinutes - a.activeMinutes
      }),
      totalPrepMinutes: dayItems.reduce((sum, i) => sum + i.prepTimeMinutes, 0),
      activeMinutes: dayItems.reduce((sum, i) => sum + i.activeMinutes, 0),
      passiveMinutes: dayItems.reduce((sum, i) => sum + i.passiveMinutes, 0),
    }
  })

  // Determine grocery and prep deadlines
  const earliestPrepDay = days.length > 0 ? days[0] : null
  let groceryDeadline: Date | null = null
  let prepDeadline: Date | null = null

  if (earliestPrepDay && !earliestPrepDay.isServiceDay) {
    // Grocery deadline = 1 day before earliest prep day
    groceryDeadline = addDays(earliestPrepDay.date, -1)
  }

  // Prep deadline = last day that has items with tight windows (peak_hours_min > 0)
  // meaning things that can't be done day-of
  const daysWithTightItems = days.filter(
    (d) => !d.isServiceDay && d.items.some((i) => i.peakHoursMin > 0)
  )
  if (daysWithTightItems.length > 0) {
    prepDeadline = daysWithTightItems[daysWithTightItems.length - 1].date
  }

  // Mark deadline types on days
  for (const day of days) {
    if (groceryDeadline && isSameDay(day.date, groceryDeadline)) {
      day.deadlineType = 'grocery'
    } else if (prepDeadline && isSameDay(day.date, prepDeadline)) {
      day.deadlineType = 'prep'
    }
  }

  // Insert grocery deadline as its own card if it doesn't overlap with a prep day
  if (groceryDeadline && !days.some((d) => isSameDay(d.date, groceryDeadline!))) {
    days.unshift({
      date: groceryDeadline,
      label: getDayLabel(differenceInCalendarDays(serviceDay, groceryDeadline)),
      daysBeforeService: differenceInCalendarDays(serviceDay, groceryDeadline),
      isToday: isToday(groceryDeadline),
      isPast: isBefore(groceryDeadline, today) && !isToday(groceryDeadline),
      isServiceDay: false,
      deadlineType: 'grocery',
      items: [],
      totalPrepMinutes: 0,
      activeMinutes: 0,
      passiveMinutes: 0,
    })
    days.sort((a, b) => b.daysBeforeService - a.daysBeforeService)
  }

  return {
    days,
    groceryDeadline,
    prepDeadline,
    serviceDate: serviceDateTime,
    untimedItems,
  }
}

function getDayLabel(daysBeforeService: number): string {
  if (daysBeforeService === 0) return 'Day of'
  if (daysBeforeService === 1) return '1 day before'
  return `${daysBeforeService} days before`
}

// --- Utility: format timeline for display ---

export function formatPrepTime(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export function formatHoursAsReadable(hours: number): string {
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  if (remainingHours === 0) return `${days}d`
  return `${days}d ${remainingHours}h`
}

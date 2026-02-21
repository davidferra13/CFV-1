/**
 * Holiday date computation utilities for ChefFlow.
 * Computes upcoming holiday dates, lead windows, and priority sorting.
 */

import { HOLIDAYS, type Holiday } from './constants'

export interface UpcomingHoliday {
  holiday: Holiday
  /** The actual date of this holiday for the current year (or next year if passed) */
  date: Date
  /** Days until this holiday */
  daysUntil: number
  /** Whether the outreach window is currently open */
  inOutreachWindow: boolean
  /** Whether this holiday is so close that outreach is urgent */
  isUrgent: boolean
}

/**
 * Compute the date of a holiday for a given year.
 * Returns null if the holiday has no date function and no fixed month/day.
 */
export function getHolidayDate(holiday: Holiday, year: number): Date | null {
  if (holiday.type === 'floating' && holiday.getDate) {
    return holiday.getDate(year)
  }
  if (holiday.type === 'fixed' && holiday.month && holiday.day) {
    return new Date(year, holiday.month - 1, holiday.day)
  }
  return null
}

/**
 * Returns the next occurrence of a holiday from a reference date.
 * If the holiday has already passed this year, returns next year's date.
 */
export function getNextOccurrence(holiday: Holiday, from: Date = new Date()): Date | null {
  const thisYear = from.getFullYear()
  const thisYearDate = getHolidayDate(holiday, thisYear)

  if (!thisYearDate) return null

  // If not yet passed (or is today), use this year's date
  const today = new Date(from)
  today.setHours(0, 0, 0, 0)
  const holidayDay = new Date(thisYearDate)
  holidayDay.setHours(0, 0, 0, 0)

  if (holidayDay >= today) return thisYearDate

  // Passed — get next year's
  return getHolidayDate(holiday, thisYear + 1)
}

/**
 * Get all upcoming holidays within a lookahead window (default: 90 days).
 * Sorted by soonest first.
 */
export function getUpcomingHolidays(
  options: {
    from?: Date
    lookaheadDays?: number
    minRelevance?: 'high' | 'medium' | 'low'
  } = {}
): UpcomingHoliday[] {
  const from = options.from ?? new Date()
  const lookahead = options.lookaheadDays ?? 90
  const minRelevance = options.minRelevance ?? 'low'

  const relevanceRank: Record<string, number> = { high: 3, medium: 2, low: 1 }
  const minRank = relevanceRank[minRelevance]

  const cutoff = new Date(from)
  cutoff.setDate(cutoff.getDate() + lookahead)

  const results: UpcomingHoliday[] = []

  for (const holiday of HOLIDAYS) {
    if (relevanceRank[holiday.chefRelevance] < minRank) continue

    const date = getNextOccurrence(holiday, from)
    if (!date) continue

    if (date > cutoff) continue

    const today = new Date(from)
    today.setHours(0, 0, 0, 0)
    const holidayDay = new Date(date)
    holidayDay.setHours(0, 0, 0, 0)

    const daysUntil = Math.round((holidayDay.getTime() - today.getTime()) / 86_400_000)
    const inOutreachWindow = daysUntil <= holiday.outreachLeadDays
    const isUrgent = daysUntil <= 7

    results.push({ holiday, date, daysUntil, inOutreachWindow, isUrgent })
  }

  return results.sort((a, b) => a.daysUntil - b.daysUntil)
}

/**
 * Get holidays that are in their active outreach window right now.
 * These are the ones the chef should be reaching out to clients about.
 */
export function getHolidaysInOutreachWindow(from: Date = new Date()): UpcomingHoliday[] {
  return getUpcomingHolidays({ from, lookaheadDays: 60 }).filter((h) => h.inOutreachWindow)
}

/**
 * Given an event date, find the nearest holiday within ± N days.
 * Used for lead score boosting and surge pricing suggestions.
 */
export function findNearestHoliday(eventDate: Date, windowDays = 14): UpcomingHoliday | null {
  const year = eventDate.getFullYear()

  let closest: UpcomingHoliday | null = null
  let closestDiff = Infinity

  for (const holiday of HOLIDAYS) {
    // Check this year and prev year (event might be just after Jan 1)
    for (const y of [year - 1, year, year + 1]) {
      const date = getHolidayDate(holiday, y)
      if (!date) continue

      const diffMs = Math.abs(date.getTime() - eventDate.getTime())
      const diffDays = diffMs / 86_400_000

      if (diffDays <= windowDays && diffDays < closestDiff) {
        closestDiff = diffDays
        const daysUntil = Math.round((date.getTime() - eventDate.getTime()) / 86_400_000)
        closest = {
          holiday,
          date,
          daysUntil,
          inOutreachWindow: false,
          isUrgent: false,
        }
      }
    }
  }

  return closest
}

/**
 * Format a holiday date for display (e.g. "Feb 14" or "in 3 days").
 */
export function formatHolidayDate(date: Date, daysUntil: number): string {
  if (daysUntil === 0) return 'Today'
  if (daysUntil === 1) return 'Tomorrow'
  if (daysUntil <= 7) return `in ${daysUntil} days`
  if (daysUntil <= 14) return `in ${daysUntil} days`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Determine a lead score boost (0–20 points) for an inquiry based on proximity
 * to a high-relevance holiday.
 */
export function holidayLeadScoreBoost(eventDate: Date): number {
  const nearest = findNearestHoliday(eventDate, 21)
  if (!nearest) return 0

  const { holiday, daysUntil } = nearest
  const absDiff = Math.abs(daysUntil)

  // Base boost by relevance
  const base = holiday.chefRelevance === 'high' ? 20 : holiday.chefRelevance === 'medium' ? 10 : 5

  // Scale down as distance increases
  if (absDiff <= 3) return base
  if (absDiff <= 7) return Math.round(base * 0.75)
  if (absDiff <= 14) return Math.round(base * 0.5)
  return Math.round(base * 0.25)
}

// Holiday Cache - Nager.Date API integration for accurate floating holiday detection
//
// The pricing engine uses hardcoded holiday arrays as the PRIMARY source (works offline,
// instant, deterministic). This cache SUPPLEMENTS those arrays by fetching real holiday
// dates from the Nager.Date API, which is especially useful for floating holidays
// (Easter, Thanksgiving, Mother's Day, etc.) that change dates every year.
//
// Pattern: Formula > AI - hardcoded logic is primary, API is supplemental.
// If the API is down or returns nothing, the hardcoded logic handles everything.

import { getPublicHolidays, type PublicHoliday } from '@/lib/holidays/nager-date'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CachedHoliday {
  date: string // YYYY-MM-DD
  name: string // English name (e.g., "Thanksgiving Day")
  fixed: boolean // Same date every year?
}

interface YearCache {
  holidays: Map<string, CachedHoliday> // key = YYYY-MM-DD
  fetchedAt: number // Date.now() when fetched
}

// ─── In-Memory Cache ─────────────────────────────────────────────────────────

// Cache per year - most pricing lookups are for the current year or next year
const cache = new Map<number, YearCache>()

// Cache TTL: 24 hours (holidays don't change mid-year)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

// ─── Name Mapping ────────────────────────────────────────────────────────────
// Nager.Date uses slightly different names than our hardcoded arrays.
// This map normalizes API names → our internal names so lookups match.

const NAGER_TO_INTERNAL_NAME: Record<string, string> = {
  'Thanksgiving Day': 'Thanksgiving',
  'Independence Day': 'Fourth of July',
  "New Year's Day": "New Year's Day",
  'Christmas Day': 'Christmas Day',
  'Memorial Day': 'Memorial Day',
  'Labour Day': 'Labor Day',
  'Labor Day': 'Labor Day',
  // Easter variants
  'Easter Sunday': 'Easter',
  'Easter Monday': 'Easter',
  'Good Friday': 'Easter', // maps to Easter for proximity detection
}

/**
 * Warm the cache for a given year by fetching holidays from Nager.Date.
 * Safe to call multiple times - returns immediately if cache is fresh.
 * Non-blocking: if the API fails, the cache stays empty and hardcoded logic takes over.
 */
export async function warmHolidayCache(year: number, countryCode = 'US'): Promise<void> {
  const existing = cache.get(year)
  if (existing && Date.now() - existing.fetchedAt < CACHE_TTL_MS) {
    return // Cache is still fresh
  }

  try {
    const holidays = await getPublicHolidays(year, countryCode)
    if (holidays.length === 0) return // API returned nothing - don't overwrite valid cache

    const holidayMap = new Map<string, CachedHoliday>()
    for (const h of holidays) {
      holidayMap.set(h.date, {
        date: h.date,
        name: NAGER_TO_INTERNAL_NAME[h.name] ?? h.name,
        fixed: h.fixed,
      })
    }

    cache.set(year, {
      holidays: holidayMap,
      fetchedAt: Date.now(),
    })
  } catch {
    // API failure - hardcoded logic takes over. No-op.
  }
}

/**
 * Look up a date in the Nager.Date cache.
 * Returns the cached holiday info if found, or null if not cached / not a holiday.
 *
 * This is a SYNCHRONOUS lookup - the cache must be warmed first via warmHolidayCache().
 * If the cache hasn't been warmed, this returns null and the hardcoded logic handles it.
 */
export function getCachedHoliday(dateStr: string): CachedHoliday | null {
  // dateStr is YYYY-MM-DD
  const year = parseInt(dateStr.slice(0, 4), 10)
  if (isNaN(year)) return null

  const yearData = cache.get(year)
  if (!yearData) return null

  return yearData.holidays.get(dateStr) ?? null
}

/**
 * Check if a date is a holiday according to the Nager.Date cache.
 * Returns true only if the cache has been warmed AND the date is a known holiday.
 * Returns false if cache is empty (API down, not warmed yet) - NOT "not a holiday."
 *
 * Callers should treat `null` as "unknown" (fall through to hardcoded logic)
 * and `CachedHoliday` as a confirmed match.
 */
export function getCachedHolidayName(dateStr: string): string | null {
  const cached = getCachedHoliday(dateStr)
  return cached?.name ?? null
}

/**
 * Check if the cache has been warmed for a given year.
 * Useful for callers that want to know if Nager.Date data is available
 * before deciding whether to trust it over hardcoded logic.
 */
export function isCacheWarm(year: number): boolean {
  const existing = cache.get(year)
  if (!existing) return false
  return Date.now() - existing.fetchedAt < CACHE_TTL_MS
}

/**
 * Get all cached holidays for a year as an array.
 * Useful for debugging or when you need to scan for proximity.
 */
export function getCachedHolidaysForYear(year: number): CachedHoliday[] {
  const yearData = cache.get(year)
  if (!yearData) return []
  return Array.from(yearData.holidays.values())
}

/**
 * Find the nearest cached holiday on or after a given date.
 * Returns null if cache is not warm or no upcoming holiday found.
 */
export function findNearestCachedHoliday(
  dateStr: string,
  maxDaysAhead: number
): { holiday: CachedHoliday; daysAway: number } | null {
  const year = parseInt(dateStr.slice(0, 4), 10)
  if (isNaN(year)) return null

  const yearData = cache.get(year)
  if (!yearData) return null

  const baseDate = new Date(dateStr + 'T12:00:00')
  if (isNaN(baseDate.getTime())) return null

  for (let offset = 0; offset <= maxDaysAhead; offset++) {
    const checkDate = new Date(baseDate)
    checkDate.setDate(checkDate.getDate() + offset)

    const y = checkDate.getFullYear()
    const m = String(checkDate.getMonth() + 1).padStart(2, '0')
    const d = String(checkDate.getDate()).padStart(2, '0')
    const checkStr = `${y}-${m}-${d}`

    const cached = yearData.holidays.get(checkStr)
    if (cached) {
      return { holiday: cached, daysAway: offset }
    }
  }

  return null
}

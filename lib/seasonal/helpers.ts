// Seasonal Palette — Pure Helper Functions
// Date-based season resolution and micro-window alerts.
// No server/client coupling — can be imported anywhere.

import type { SeasonalPalette, MicroWindow } from './types'

/**
 * Determine which palette is active for a given date.
 * Priority: explicit is_active flag, then date-range match.
 * Handles cross-year boundaries (e.g., Winter: 12-01 to 02-28).
 */
export function getCurrentSeason(
  palettes: SeasonalPalette[],
  date: Date = new Date()
): SeasonalPalette | null {
  const explicit = palettes.find((p) => p.is_active)
  if (explicit) return explicit

  const monthDay = formatMonthDay(date)
  return palettes.find((p) => isDateInRange(monthDay, p.start_month_day, p.end_month_day)) ?? null
}

/**
 * Get micro-windows that are active (currently within date range).
 */
export function getActiveMicroWindows(
  palette: SeasonalPalette,
  date: Date = new Date()
): MicroWindow[] {
  const monthDay = formatMonthDay(date)
  return palette.micro_windows.filter((w) => isDateInRange(monthDay, w.start_date, w.end_date))
}

/**
 * Get micro-windows ending within N days (urgency alerts).
 */
export function getEndingMicroWindows(
  palette: SeasonalPalette,
  withinDays: number = 7,
  date: Date = new Date()
): MicroWindow[] {
  const year = date.getFullYear()
  return palette.micro_windows.filter((w) => {
    let endDate = parseMonthDay(w.end_date, year)
    // If the end date is before the current date but the window crosses year boundary,
    // use next year's end date
    if (endDate < date && w.start_date > w.end_date) {
      endDate = parseMonthDay(w.end_date, year + 1)
    }
    const diffMs = endDate.getTime() - date.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    return diffDays >= 0 && diffDays <= withinDays
  })
}

/**
 * Get micro-windows active on a specific calendar date (for schedule sidebar).
 */
export function getMicroWindowsForDate(palette: SeasonalPalette, targetDate: Date): MicroWindow[] {
  const monthDay = formatMonthDay(targetDate)
  return palette.micro_windows.filter((w) => isDateInRange(monthDay, w.start_date, w.end_date))
}

// --- Internal helpers ---

export function formatMonthDay(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${m}-${d}`
}

function parseMonthDay(monthDay: string, year: number): Date {
  const [m, d] = monthDay.split('-').map(Number)
  return new Date(year, m - 1, d)
}

/**
 * Check if a MM-DD string falls within a range.
 * Cross-year aware: if start > end (e.g., "12-01" to "02-28"),
 * matches current >= start OR current <= end.
 */
export function isDateInRange(current: string, start: string, end: string): boolean {
  if (start > end) {
    return current >= start || current <= end
  }
  return current >= start && current <= end
}

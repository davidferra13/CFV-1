// Centralized formatting utilities for dates, times, and currency.
// All functions accept explicit locale/timezone/currency so they work
// in both server components (no React context) and client components
// (pass values from useAppContext).

// ─── Defaults ───────────────────────────────────────────────────────
const DEFAULT_LOCALE = 'en-US'
const DEFAULT_TZ = 'America/New_York'
const DEFAULT_CURRENCY = 'USD'

type FormatOpts = {
  locale?: string
  timezone?: string
}

type CurrencyOpts = {
  locale?: string
  currency?: string
}

// ─── Date / Time ────────────────────────────────────────────────────

/** "Apr 2, 2026" */
export function formatDate(date: string | Date, opts: FormatOpts = {}): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(opts.locale ?? DEFAULT_LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: opts.timezone ?? DEFAULT_TZ,
  }).format(d)
}

/** "April 2, 2026" */
export function formatDateLong(date: string | Date, opts: FormatOpts = {}): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(opts.locale ?? DEFAULT_LOCALE, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: opts.timezone ?? DEFAULT_TZ,
  }).format(d)
}

/** "04/02/2026" */
export function formatDateNumeric(date: string | Date, opts: FormatOpts = {}): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(opts.locale ?? DEFAULT_LOCALE, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: opts.timezone ?? DEFAULT_TZ,
  }).format(d)
}

/** "2:30 PM" */
export function formatTime(date: string | Date, opts: FormatOpts = {}): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(opts.locale ?? DEFAULT_LOCALE, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: opts.timezone ?? DEFAULT_TZ,
  }).format(d)
}

/** "Apr 2, 2026, 2:30 PM" */
export function formatDateTime(date: string | Date, opts: FormatOpts = {}): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(opts.locale ?? DEFAULT_LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: opts.timezone ?? DEFAULT_TZ,
  }).format(d)
}

/** "Apr 2, 2026, 2:30 PM EDT" */
export function formatDateTimeFull(date: string | Date, opts: FormatOpts = {}): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(opts.locale ?? DEFAULT_LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    timeZone: opts.timezone ?? DEFAULT_TZ,
  }).format(d)
}

/** "Wednesday" */
export function formatWeekday(
  date: string | Date,
  opts: FormatOpts & { style?: 'long' | 'short' | 'narrow' } = {}
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(opts.locale ?? DEFAULT_LOCALE, {
    weekday: opts.style ?? 'long',
    timeZone: opts.timezone ?? DEFAULT_TZ,
  }).format(d)
}

// ─── Relative Time ──────────────────────────────────────────────────

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['week', 7 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
]

/** "3 days ago", "in 2 hours", "just now" */
export function formatRelativeTime(date: string | Date, opts: { locale?: string } = {}): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = d.getTime() - Date.now()
  const absDiff = Math.abs(diff)

  // Less than 1 minute
  if (absDiff < 60 * 1000) return 'just now'

  const rtf = new Intl.RelativeTimeFormat(opts.locale ?? DEFAULT_LOCALE, {
    numeric: 'auto',
  })

  for (const [unit, threshold] of RELATIVE_UNITS) {
    if (absDiff >= threshold) {
      const value = Math.round(diff / threshold)
      return rtf.format(value, unit)
    }
  }

  return 'just now'
}

// ─── Currency ───────────────────────────────────────────────────────

/** Format cents to currency string: 1500 -> "$15.00" */
export function formatCurrency(cents: number, opts: CurrencyOpts = {}): string {
  const dollars = cents / 100
  return new Intl.NumberFormat(opts.locale ?? DEFAULT_LOCALE, {
    style: 'currency',
    currency: opts.currency ?? DEFAULT_CURRENCY,
  }).format(dollars)
}

/** Parse currency string back to cents: "$15.00" -> 1500 */
export function parseCurrencyToCents(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, '')
  const dollars = parseFloat(cleaned)
  return Math.round(dollars * 100)
}

/** Format cents to plain decimal for form inputs: 1500 -> "15.00" */
export function formatCentsToDisplay(cents: number): string {
  return (cents / 100).toFixed(2)
}

// ─── Convenience: current time in a timezone ────────────────────────

/** Get the current date/time formatted for a specific timezone */
export function nowFormatted(opts: FormatOpts = {}): string {
  return formatDateTime(new Date(), opts)
}

/**
 * Returns today's date as YYYY-MM-DD using LOCAL time parts.
 * Use this instead of `new Date().toISOString().split('T')[0]` which returns
 * UTC date and causes off-by-one errors after 7pm ET (UTC is already "tomorrow").
 */
export function todayLocalDateString(d: Date = new Date()): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

/**
 * Converts a Date object (or ISO string) to a YYYY-MM month key using LOCAL time parts.
 * Use this instead of `value.slice(0, 7)` on postgres.js results: postgres.js 3.x
 * returns TIMESTAMPTZ and DATE columns as JavaScript Date objects, not strings, so
 * calling `.slice()` on them throws TypeError at runtime.
 */
export function dateToMonthString(val: Date | string): string {
  const d = val instanceof Date ? val : new Date(val)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Converts a Date object (or ISO string) to a YYYY-MM-DD date key.
 * Use this instead of `value.slice(0, 10)` on postgres.js results: postgres.js 3.x
 * returns TIMESTAMPTZ and DATE columns as JavaScript Date objects, not strings.
 */
export function dateToDateString(val: Date | string): string {
  const d = val instanceof Date ? val : new Date(val)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Get the current weekday name in a timezone */
export function todayWeekday(
  opts: FormatOpts & { style?: 'long' | 'short' | 'narrow' } = {}
): string {
  return formatWeekday(new Date(), opts)
}

/**
 * Calendar days from today until a date string (YYYY-MM-DD).
 * Positive = future, negative = past, 0 = today.
 */
export function daysUntilDate(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

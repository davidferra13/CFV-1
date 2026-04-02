'use client'

import { useCallback } from 'react'
import { useAppContext } from '@/lib/context/app-context'
import {
  formatDate,
  formatDateLong,
  formatDateNumeric,
  formatTime,
  formatDateTime,
  formatDateTimeFull,
  formatWeekday,
  formatRelativeTime,
  formatCurrency,
} from '@/lib/utils/format'

/**
 * Returns formatting functions pre-bound to the current app context
 * (timezone, locale, currency). Use this in client components so you
 * don't have to pass opts every time.
 *
 * Usage:
 *   const fmt = useFormat()
 *   fmt.date(event.created_at)       // "Apr 2, 2026"
 *   fmt.time(event.start_time)       // "2:30 PM"
 *   fmt.dateTime(event.created_at)   // "Apr 2, 2026, 2:30 PM"
 *   fmt.relative(event.updated_at)   // "3 days ago"
 *   fmt.currency(1500)               // "$15.00"
 */
export function useFormat() {
  const { timezone, locale, currency } = useAppContext()

  return {
    date: useCallback(
      (d: string | Date) => formatDate(d, { locale, timezone }),
      [locale, timezone]
    ),
    dateLong: useCallback(
      (d: string | Date) => formatDateLong(d, { locale, timezone }),
      [locale, timezone]
    ),
    dateNumeric: useCallback(
      (d: string | Date) => formatDateNumeric(d, { locale, timezone }),
      [locale, timezone]
    ),
    time: useCallback(
      (d: string | Date) => formatTime(d, { locale, timezone }),
      [locale, timezone]
    ),
    dateTime: useCallback(
      (d: string | Date) => formatDateTime(d, { locale, timezone }),
      [locale, timezone]
    ),
    dateTimeFull: useCallback(
      (d: string | Date) => formatDateTimeFull(d, { locale, timezone }),
      [locale, timezone]
    ),
    weekday: useCallback(
      (d: string | Date, style?: 'long' | 'short' | 'narrow') =>
        formatWeekday(d, { locale, timezone, style }),
      [locale, timezone]
    ),
    relative: useCallback((d: string | Date) => formatRelativeTime(d, { locale }), [locale]),
    currency: useCallback(
      (cents: number) => formatCurrency(cents, { locale, currency }),
      [locale, currency]
    ),
    /** Raw context values for edge cases */
    timezone,
    locale,
    currencyCode: currency,
  }
}

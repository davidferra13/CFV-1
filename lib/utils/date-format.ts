// Locale-aware date formatting using date-fns
// Central utility for displaying dates in the user's preferred language

import { format as dateFnsFormat } from 'date-fns'
import { enUS, es, fr, pt, de, it, ja } from 'date-fns/locale'

const LOCALE_MAP: Record<string, Locale> = {
  en: enUS,
  'en-US': enUS,
  es: es,
  'es-MX': es,
  'es-ES': es,
  fr: fr,
  'fr-FR': fr,
  pt: pt,
  'pt-BR': pt,
  de: de,
  'de-DE': de,
  it: it,
  'it-IT': it,
  ja: ja,
  'ja-JP': ja,
}

/**
 * Format a date with locale awareness.
 * Uses date-fns under the hood with locale-specific day/month names.
 *
 * @param date - Date to format (Date, string, or number)
 * @param pattern - date-fns format pattern (e.g. 'MMM d, yyyy', 'EEEE, MMMM d')
 * @param locale - Locale code (e.g. 'en', 'es', 'fr', 'en-US', 'es-MX')
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string | number,
  pattern: string = 'MMM d, yyyy',
  locale: string = 'en'
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  const dateFnsLocale = LOCALE_MAP[locale] ?? LOCALE_MAP[locale.split('-')[0]] ?? enUS

  return dateFnsFormat(dateObj, pattern, { locale: dateFnsLocale })
}

/**
 * Common date format patterns for reuse across the app.
 */
export const DATE_PATTERNS = {
  /** Jan 15, 2026 */
  short: 'MMM d, yyyy',
  /** January 15, 2026 */
  long: 'MMMM d, yyyy',
  /** Monday, January 15, 2026 */
  full: 'EEEE, MMMM d, yyyy',
  /** 01/15/2026 */
  numeric: 'MM/dd/yyyy',
  /** Jan 15 */
  monthDay: 'MMM d',
  /** 3:30 PM */
  time: 'h:mm a',
  /** Jan 15, 2026 3:30 PM */
  dateTime: 'MMM d, yyyy h:mm a',
} as const

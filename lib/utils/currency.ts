// Currency formatting utilities
// Can be used in both server and client components

/**
 * Format cents to currency string (for display).
 * Locale parameter controls number/symbol formatting (e.g. 'de-DE' for 1.234,56 EUR).
 * Defaults to 'en-US' for backwards compatibility with all 226+ existing callers.
 */
export function formatCurrency(cents: number, currency = 'USD', locale = 'en-US'): string {
  const dollars = cents / 100
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(dollars)
}

/**
 * Parse currency string to cents
 */
export function parseCurrencyToCents(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, '')
  const dollars = parseFloat(cleaned)
  return Math.round(dollars * 100)
}

/**
 * Format cents to a plain dollar string (for form inputs)
 */
export function formatCentsToDisplay(cents: number): string {
  return (cents / 100).toFixed(2)
}

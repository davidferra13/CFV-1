// Currency formatting utilities
// Can be used in both server and client components

/**
 * Format cents to currency string (for display)
 */
export function formatCurrency(cents: number, currency = 'USD'): string {
  const dollars = cents / 100
  return new Intl.NumberFormat('en-US', {
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

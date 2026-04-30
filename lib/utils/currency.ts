import {
  formatCurrency as formatCurrencyWithOptions,
  formatWholeCurrency,
  parseCurrencyToCents,
  formatCentsToDisplay,
  type CurrencyOpts,
} from './format'

export type { CurrencyOpts }

/**
 * Format cents to currency string (for display).
 * Keeps the legacy currency-code interface while delegating to the shared formatter module.
 */
export function formatCurrency(cents: number, currency: string | CurrencyOpts = 'USD'): string {
  return formatCurrencyWithOptions(cents, typeof currency === 'string' ? { currency } : currency)
}

export { formatWholeCurrency, parseCurrencyToCents, formatCentsToDisplay }

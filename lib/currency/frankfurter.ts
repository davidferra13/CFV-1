// Frankfurter - free currency exchange API, no key required
// https://frankfurter.dev/
// ECB rates, updated daily, unlimited requests

export interface ExchangeRates {
  base: string
  date: string
  rates: Record<string, number>
}

export interface ConvertedAmount {
  from: string
  to: string
  rate: number
  originalAmount: number
  convertedAmount: number
  date: string
}

/** Popular currencies for private chef clients */
export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
] as const

/**
 * Get latest exchange rates from a base currency.
 * Note: Frankfurter uses ECB data, so EUR is always available.
 * USD works as base too.
 */
export async function getExchangeRates(base = 'USD'): Promise<ExchangeRates | null> {
  try {
    const res = await fetch(
      `https://api.frankfurter.dev/v1/latest?base=${base}`,
      { next: { revalidate: 3600 } } // cache 1h - rates update daily
    )
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Convert an amount from one currency to another.
 * Amounts are in major units (dollars, not cents).
 */
export async function convertCurrency(
  amount: number,
  from: string,
  to: string
): Promise<ConvertedAmount | null> {
  if (from === to) {
    return {
      from,
      to,
      rate: 1,
      originalAmount: amount,
      convertedAmount: amount,
      date: new Date().toISOString().slice(0, 10),
    }
  }

  try {
    const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=${from}&symbols=${to}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const data = await res.json()
    const rate = data.rates[to]
    if (!rate) return null

    return {
      from,
      to,
      rate,
      originalAmount: amount,
      convertedAmount: Math.round(amount * rate * 100) / 100,
      date: data.date,
    }
  } catch {
    return null
  }
}

/**
 * Format an amount with the correct currency symbol.
 */
export function formatCurrency(amount: number, currencyCode: string): string {
  const currency = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode)
  const symbol = currency?.symbol ?? currencyCode

  if (currencyCode === 'JPY') {
    return `${symbol}${Math.round(amount).toLocaleString()}`
  }
  return `${symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

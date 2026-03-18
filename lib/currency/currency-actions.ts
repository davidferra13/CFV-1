'use server'

// Server actions for currency conversion
// Wraps Frankfurter API for use in client components

import { convertCurrency, formatCurrency as formatFrankfurter } from '@/lib/currency/frankfurter'

export type CurrencyConversion = {
  from: string
  to: string
  originalAmount: number
  convertedAmount: number
  rate: number
  formattedOriginal: string
  formattedConverted: string
  date: string
}

/**
 * Convert an amount from one currency to another.
 * Returns a formatted result suitable for display.
 * Amounts are in major units (dollars, not cents).
 * Non-blocking - returns null on failure.
 */
export async function convertQuoteAmount(
  amountCents: number,
  fromCurrency: string,
  toCurrency: string
): Promise<CurrencyConversion | null> {
  try {
    if (!amountCents || amountCents <= 0) return null
    if (!fromCurrency || !toCurrency) return null
    if (fromCurrency === toCurrency) return null

    const amountDollars = amountCents / 100
    const result = await convertCurrency(
      amountDollars,
      fromCurrency.toUpperCase(),
      toCurrency.toUpperCase()
    )
    if (!result) return null

    return {
      from: result.from,
      to: result.to,
      originalAmount: result.originalAmount,
      convertedAmount: result.convertedAmount,
      rate: result.rate,
      formattedOriginal: formatFrankfurter(result.originalAmount, result.from),
      formattedConverted: formatFrankfurter(result.convertedAmount, result.to),
      date: result.date,
    }
  } catch (err) {
    console.error('[non-blocking] Currency conversion failed:', err)
    return null
  }
}

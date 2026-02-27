'use client'

// Shows a secondary currency amount below a USD price.
// e.g., "$2,500.00 USD (~£1,980.00 GBP)"
// Non-blocking — silently hides if conversion fails.

import { useState } from 'react'
import { convertQuoteAmount } from '@/lib/currency/currency-actions'
import { SUPPORTED_CURRENCIES } from '@/lib/currency/frankfurter'

type Props = {
  /** Amount in cents (USD) */
  amountCents: number
  /** Pre-selected target currency code, if known */
  defaultCurrency?: string
}

export function CurrencyConversionHint({ amountCents, defaultCurrency }: Props) {
  const [targetCurrency, setTargetCurrency] = useState(defaultCurrency || '')
  const [convertedText, setConvertedText] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleConvert = async (currency: string) => {
    setTargetCurrency(currency)
    if (!currency || currency === 'USD' || !amountCents || amountCents <= 0) {
      setConvertedText(null)
      return
    }

    setLoading(true)
    try {
      const result = await convertQuoteAmount(amountCents, 'USD', currency)
      if (result) {
        setConvertedText(`~${result.formattedConverted} ${result.to}`)
      } else {
        setConvertedText(null)
      }
    } catch {
      setConvertedText(null)
    } finally {
      setLoading(false)
    }
  }

  // Filter out USD since we're converting FROM USD
  const otherCurrencies = SUPPORTED_CURRENCIES.filter((c) => c.code !== 'USD')

  return (
    <div className="flex items-center gap-2 mt-1.5">
      <select
        value={targetCurrency}
        onChange={(e) => handleConvert(e.target.value)}
        className="text-xs border border-stone-700 rounded px-1.5 py-0.5 bg-stone-900 text-stone-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
        title="Show amount in another currency"
      >
        <option value="">Client currency...</option>
        {otherCurrencies.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} ({c.symbol})
          </option>
        ))}
      </select>
      {loading && <span className="text-xs text-stone-500">Converting...</span>}
      {convertedText && !loading && (
        <span className="text-xs text-stone-400 font-medium">{convertedText}</span>
      )}
    </div>
  )
}

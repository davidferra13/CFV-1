'use client'

// Shows enriched country details for a client.
// Fetches currency, timezone, languages from REST Countries API.
// Non-blocking - gracefully hides if lookup fails.

import { useState } from 'react'
import { getCountryDetails, type CountryDetails } from '@/lib/geo/geo-actions'

type Props = {
  /** 2-letter country code if already known (e.g., from address) */
  initialCountryCode?: string | null
}

export function ClientCountryPanel({ initialCountryCode }: Props) {
  const [countryCode, setCountryCode] = useState(initialCountryCode || '')
  const [details, setDetails] = useState<CountryDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [looked, setLooked] = useState(false)

  const handleLookup = async (code: string) => {
    const trimmed = code.trim().toUpperCase()
    setCountryCode(trimmed)
    if (trimmed.length !== 2) {
      setDetails(null)
      setLooked(false)
      return
    }

    setLoading(true)
    setLooked(true)
    try {
      const result = await getCountryDetails(trimmed)
      setDetails(result)
    } catch {
      setDetails(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-stone-700 overflow-hidden">
      <div className="px-4 py-3 bg-stone-800 border-b border-stone-700">
        <h3 className="font-medium text-stone-200 text-sm">Country Details</h3>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={countryCode}
            onChange={(e) => handleLookup(e.target.value)}
            placeholder="US, GB, FR..."
            maxLength={2}
            className="w-20 text-sm text-center uppercase border border-stone-600 rounded px-2 py-1 bg-stone-900 text-stone-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <span className="text-xs text-stone-500">Enter 2-letter country code</span>
        </div>

        {loading && <p className="text-xs text-stone-500">Looking up...</p>}

        {details && !loading && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <span className="text-stone-500">Country</span>
            <span className="text-stone-200">
              {details.flag} {details.name}
            </span>

            {details.currencies.length > 0 && (
              <>
                <span className="text-stone-500">Currency</span>
                <span className="text-stone-200">
                  {details.currencies.map((c) => `${c.symbol} ${c.code}`).join(', ')}
                </span>
              </>
            )}

            {details.timezone.length > 0 && (
              <>
                <span className="text-stone-500">Timezone</span>
                <span className="text-stone-200">{details.timezone.slice(0, 2).join(', ')}</span>
              </>
            )}

            {details.languages.length > 0 && (
              <>
                <span className="text-stone-500">Languages</span>
                <span className="text-stone-200">{details.languages.slice(0, 3).join(', ')}</span>
              </>
            )}

            {details.callingCodes.length > 0 && (
              <>
                <span className="text-stone-500">Phone Code</span>
                <span className="text-stone-200">{details.callingCodes[0]}</span>
              </>
            )}

            {details.capital && (
              <>
                <span className="text-stone-500">Capital</span>
                <span className="text-stone-200">{details.capital}</span>
              </>
            )}
          </div>
        )}

        {looked && !details && !loading && (
          <p className="text-xs text-stone-500">No country found for that code.</p>
        )}
      </div>
    </div>
  )
}

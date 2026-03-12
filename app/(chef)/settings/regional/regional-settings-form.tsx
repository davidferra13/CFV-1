'use client'

import { useState, useTransition } from 'react'
import { updatePreferredCurrency, updatePreferredLocale } from '@/lib/settings/regional-actions'
import { SUPPORTED_CURRENCIES } from '@/lib/currency/frankfurter'
import { formatCurrency } from '@/lib/utils/currency'

const SUPPORTED_LANGUAGES = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'es-MX', label: 'Espanol (Mexico)' },
  { code: 'es-ES', label: 'Espanol (Spain)' },
  { code: 'fr-FR', label: 'Francais' },
  { code: 'pt-BR', label: 'Portugues (Brazil)' },
  { code: 'de-DE', label: 'Deutsch' },
  { code: 'it-IT', label: 'Italiano' },
  { code: 'ja-JP', label: 'Japanese' },
]

type Props = {
  initialCurrency: string
  initialLocale: string
}

export function RegionalSettingsForm({ initialCurrency, initialLocale }: Props) {
  const [currency, setCurrency] = useState(initialCurrency)
  const [locale, setLocale] = useState(initialLocale)
  const [isPending, startTransition] = useTransition()
  const [savedCurrency, setSavedCurrency] = useState(initialCurrency)
  const [savedLocale, setSavedLocale] = useState(initialLocale)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency)
    setError(null)
    setSuccess(null)

    const previousCurrency = savedCurrency
    setSavedCurrency(newCurrency)

    startTransition(async () => {
      try {
        await updatePreferredCurrency(newCurrency)
        setSuccess('Currency updated')
        setTimeout(() => setSuccess(null), 3000)
      } catch (err) {
        setSavedCurrency(previousCurrency)
        setCurrency(previousCurrency)
        setError('Failed to update currency')
      }
    })
  }

  const handleLocaleChange = (newLocale: string) => {
    setLocale(newLocale)
    setError(null)
    setSuccess(null)

    const previousLocale = savedLocale
    setSavedLocale(newLocale)

    startTransition(async () => {
      try {
        await updatePreferredLocale(newLocale)
        setSuccess('Language updated')
        setTimeout(() => setSuccess(null), 3000)
      } catch (err) {
        setSavedLocale(previousLocale)
        setLocale(previousLocale)
        setError('Failed to update language')
      }
    })
  }

  // Preview: show how 15000 cents looks in the selected currency + locale
  const previewAmount = 15000
  const previewFormatted = formatCurrency(previewAmount, currency, locale)

  return (
    <div className="space-y-8">
      {/* Currency */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Currency</h2>
        <p className="mt-1 text-sm text-gray-500">
          Choose the currency for your quotes, invoices, and payment links. Stripe will charge
          clients in this currency.
        </p>

        <div className="mt-4">
          <select
            value={currency}
            onChange={(e) => handleCurrencyChange(e.target.value)}
            disabled={isPending}
            className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code} - {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-medium uppercase text-gray-500">Preview</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{previewFormatted}</p>
        </div>
      </div>

      {/* Language */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Language</h2>
        <p className="mt-1 text-sm text-gray-500">
          Choose your preferred language for the ChefFlow interface. This also affects how dates and
          numbers are formatted.
        </p>

        <div className="mt-4">
          <select
            value={locale}
            onChange={(e) => handleLocaleChange(e.target.value)}
            disabled={isPending}
            className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}
    </div>
  )
}

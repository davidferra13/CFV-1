'use client'

// Tip Form - interactive client-facing tip selection.
// Shows suggested amounts as buttons (like Uber), plus a custom amount input.

import { useState, useTransition } from 'react'
import { Heart, Check } from '@/components/ui/icons'
import { formatCurrency } from '@/lib/utils/currency'
import { recordTip, type TipMethod } from '@/lib/finance/tip-actions'

const TIP_METHODS: { value: TipMethod; label: string }[] = [
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'other', label: 'Other' },
]

interface Props {
  requestId: string
  suggestedAmountsCents: number[]
  suggestedPercentages: number[]
  eventTotalCents: number | null
  chefName: string
}

export function TipForm({
  requestId,
  suggestedAmountsCents,
  suggestedPercentages,
  eventTotalCents,
  chefName,
}: Props) {
  const [selectedCents, setSelectedCents] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [method, setMethod] = useState<TipMethod>('card')
  const [notes, setNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [finalAmount, setFinalAmount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Build suggestion buttons: use percentage-based if we have event total, otherwise flat amounts
  const suggestions: { label: string; cents: number }[] = []

  if (eventTotalCents && eventTotalCents > 0) {
    // Percentage-based suggestions
    for (const pct of suggestedPercentages) {
      if (pct === 0) continue // 0 = custom option
      const cents = Math.round((eventTotalCents * pct) / 100)
      suggestions.push({ label: `${pct}% (${formatCurrency(cents)})`, cents })
    }
  } else {
    // Flat amount suggestions
    for (const cents of suggestedAmountsCents) {
      if (cents === 0) continue // 0 = custom option
      suggestions.push({ label: formatCurrency(cents), cents })
    }
  }

  function handleSelectAmount(cents: number) {
    setSelectedCents(cents)
    setIsCustom(false)
    setCustomAmount('')
    setError(null)
  }

  function handleCustom() {
    setIsCustom(true)
    setSelectedCents(null)
    setError(null)
  }

  function getAmountCents(): number | null {
    if (isCustom) {
      const dollars = parseFloat(customAmount)
      if (isNaN(dollars) || dollars <= 0) return null
      return Math.round(dollars * 100)
    }
    return selectedCents
  }

  function handleSubmit() {
    const amountCents = getAmountCents()
    if (!amountCents) {
      setError('Please select or enter a tip amount')
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        const result = await recordTip(requestId, amountCents, method, notes || undefined)
        if (result.success) {
          setFinalAmount(amountCents)
          setSubmitted(true)
        } else {
          setError(result.error || 'Failed to submit tip')
        }
      } catch (err: any) {
        setError(err?.message || 'Something went wrong')
      }
    })
  }

  // Thank you state
  if (submitted) {
    return (
      <div className="bg-stone-900 rounded-2xl border border-stone-700 p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-900/40 mb-4">
          <Check className="h-8 w-8 text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-stone-100 mb-2">Thank you!</h2>
        <p className="text-stone-400 mb-1">
          Your {formatCurrency(finalAmount)} tip has been sent to {chefName}.
        </p>
        <p className="text-stone-500 text-sm">They really appreciate your generosity.</p>
      </div>
    )
  }

  return (
    <div className="bg-stone-900 rounded-2xl border border-stone-700 p-6 space-y-6">
      {/* Suggested amounts */}
      <div>
        <p className="text-sm text-stone-400 mb-3">Select a tip amount</p>
        <div className="grid grid-cols-3 gap-2">
          {suggestions.map((s) => (
            <button
              key={s.cents}
              onClick={() => handleSelectAmount(s.cents)}
              className={`py-3 px-2 rounded-xl text-sm font-semibold transition-all border ${
                selectedCents === s.cents && !isCustom
                  ? 'bg-brand-600 border-brand-500 text-white shadow-lg shadow-brand-600/20'
                  : 'bg-stone-800 border-stone-700 text-stone-200 hover:border-stone-500'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom amount */}
      <div>
        <button
          onClick={handleCustom}
          className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all border ${
            isCustom
              ? 'bg-brand-600/10 border-brand-500 text-brand-400'
              : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-500'
          }`}
        >
          Custom Amount
        </button>

        {isCustom && (
          <div className="mt-3 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-lg">
              $
            </span>
            <input
              type="number"
              min="1"
              step="0.01"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value)
                setError(null)
              }}
              placeholder="0.00"
              autoFocus
              className="w-full pl-8 pr-4 py-3 text-lg font-semibold bg-stone-800 border border-stone-600 rounded-xl text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>
        )}
      </div>

      {/* Payment method */}
      <div>
        <p className="text-sm text-stone-400 mb-2">Payment method</p>
        <div className="flex gap-2">
          {TIP_METHODS.map((m) => (
            <button
              key={m.value}
              onClick={() => setMethod(m.value)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all border ${
                method === m.value
                  ? 'bg-stone-700 border-stone-500 text-stone-100'
                  : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Optional note */}
      <div>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add a note (optional)"
          className="w-full px-4 py-2.5 text-sm bg-stone-800 border border-stone-700 rounded-xl text-stone-200 placeholder:text-stone-500 focus:outline-none focus:border-stone-500"
        />
      </div>

      {/* Error */}
      {error && <p className="text-sm text-red-400 text-center">{error}</p>}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={isPending || (!selectedCents && !isCustom)}
        className="w-full py-3.5 rounded-xl text-base font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Heart className="h-5 w-5" />
        {isPending ? 'Submitting...' : 'Add Tip'}
      </button>
    </div>
  )
}

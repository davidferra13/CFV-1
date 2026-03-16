'use client'

import { useEffect, useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { getSmartQuoteSuggestion } from '@/lib/intelligence/smart-quote-suggestions'
import type { QuotePricingSuggestion } from '@/lib/intelligence/smart-quote-suggestions'

interface SmartPricingHintProps {
  guestCount: number
  occasion?: string | null
  serviceStyle?: string | null
  onSuggestedPrice?: (totalCents: number) => void
}

export function SmartPricingHint({
  guestCount,
  occasion,
  serviceStyle,
  onSuggestedPrice,
}: SmartPricingHintProps) {
  const [suggestion, setSuggestion] = useState<QuotePricingSuggestion | null>(null)
  const [isPending, startTransition] = useTransition()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!guestCount || guestCount <= 0) {
      setSuggestion(null)
      return
    }

    // Debounce - wait 500ms after last change
    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const result = await getSmartQuoteSuggestion({
            guestCount,
            occasion,
            serviceStyle,
          })
          setSuggestion(result)
        } catch {
          setSuggestion(null)
        }
      })
    }, 500)

    return () => clearTimeout(timer)
  }, [guestCount, occasion, serviceStyle])

  if (dismissed || !suggestion || isPending) return null

  const confidenceColor =
    suggestion.confidence === 'high'
      ? 'text-green-400'
      : suggestion.confidence === 'medium'
        ? 'text-amber-400'
        : 'text-stone-400'

  const confidenceLabel =
    suggestion.confidence === 'high'
      ? 'High confidence'
      : suggestion.confidence === 'medium'
        ? 'Medium confidence'
        : 'Estimate'

  return (
    <Card className="border-brand-800/40 bg-brand-950/20">
      <CardContent className="py-3 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-brand-400">Smart Pricing</span>
              <span className={`text-xs ${confidenceColor}`}>{confidenceLabel}</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-lg font-bold text-stone-100">
                ${Math.round(suggestion.suggestedTotalCents / 100).toLocaleString()}
              </span>
              <span className="text-sm text-stone-400">
                ${Math.round(suggestion.suggestedPerGuestCents / 100)}/guest
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1">{suggestion.reasoning}</p>
            {suggestion.acceptanceRateAtSuggested !== null && (
              <p className="text-xs text-stone-500 mt-0.5">
                ~{suggestion.acceptanceRateAtSuggested}% acceptance rate at this price
              </p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-stone-600">
                Range: ${Math.round(suggestion.historicalRange.minCents / 100)}-$
                {Math.round(suggestion.historicalRange.maxCents / 100)}/guest
              </span>
              {suggestion.breakdown.basedOnOccasion && (
                <span className="text-xs bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded">
                  occasion match
                </span>
              )}
              {suggestion.breakdown.basedOnSeason && (
                <span className="text-xs bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded">
                  seasonal
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            {onSuggestedPrice && (
              <button
                type="button"
                onClick={() => onSuggestedPrice(suggestion.suggestedTotalCents)}
                className="text-xs px-3 py-1.5 bg-brand-600 text-white rounded hover:bg-brand-700 transition-colors font-medium"
              >
                Use
              </button>
            )}
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="text-xs px-3 py-1 text-stone-500 hover:text-stone-300 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

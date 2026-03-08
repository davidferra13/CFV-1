'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import type { PricingSuggestion } from '@/lib/analytics/pricing-suggestions'

interface PricingSuggestionPanelProps {
  suggestion: PricingSuggestion | null
  /** GOLDMINE benchmark fallback - shown when chef has no pricing history */
  benchmarkHint?: string | null
}

export function PricingSuggestionPanel({ suggestion, benchmarkHint }: PricingSuggestionPanelProps) {
  const [open, setOpen] = useState(false)

  if (!suggestion && !benchmarkHint) return null

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-stone-800"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-stone-100">Similar Quote Benchmarks</span>
          {suggestion?.status === 'ok' && suggestion.similarQuoteCount > 0 && (
            <span className="text-xs text-stone-500">
              {suggestion.similarQuoteCount} comparable quotes
            </span>
          )}
        </div>
        <span className="text-sm text-stone-400">{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-stone-800 px-5 pb-5 pt-4">
          {suggestion?.status === 'error' ? (
            <div className="rounded-lg border border-red-800/20 bg-red-950/30 px-3 py-2">
              <p className="text-sm text-red-300">
                Warning:{' '}
                {suggestion.errorMessage || 'Could not load pricing data. Please try again.'}
              </p>
            </div>
          ) : suggestion?.status === 'insufficient_data' || !suggestion ? (
            benchmarkHint ? (
              <div className="space-y-2">
                <p className="text-sm text-stone-300">{benchmarkHint}</p>
                <p className="text-xs italic text-stone-400">
                  Based on historical booking data. Your own pricing history will replace this after
                  3+ accepted quotes.
                </p>
              </div>
            ) : (
              <p className="text-sm italic text-stone-400">
                Need 3+ accepted quotes at this guest count range to show benchmarks.
              </p>
            )
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-stone-800 px-1 py-2 text-center">
                  <p className="mb-0.5 text-xs text-stone-500">Low</p>
                  <p className="text-sm font-bold text-stone-300">
                    {formatCurrency(suggestion.minCents)}
                  </p>
                </div>
                <div className="rounded-lg bg-brand-950 px-1 py-2 text-center ring-1 ring-brand-700">
                  <p className="mb-0.5 text-xs font-medium text-brand-600">Median</p>
                  <p className="text-sm font-bold text-brand-400">
                    {formatCurrency(suggestion.medianCents)}
                  </p>
                </div>
                <div className="rounded-lg bg-stone-800 px-1 py-2 text-center">
                  <p className="mb-0.5 text-xs text-stone-500">High</p>
                  <p className="text-sm font-bold text-stone-300">
                    {formatCurrency(suggestion.maxCents)}
                  </p>
                </div>
              </div>

              {suggestion.avgFoodCostPercent !== null && (
                <p className="text-xs text-stone-500">
                  Avg food cost for similar events:{' '}
                  <span className="font-medium text-stone-300">
                    {suggestion.avgFoodCostPercent}%
                  </span>
                </p>
              )}

              <p className="text-xs text-stone-400">
                Based on {suggestion.similarQuoteCount} accepted quotes |{' '}
                {suggestion.matchCriteria.pricingModel.replace('_', ' ')},{' '}
                {suggestion.matchCriteria.guestRangeMin}-{suggestion.matchCriteria.guestRangeMax}{' '}
                guests
              </p>

              <p className="text-xs italic text-stone-400">
                Suggestion only - final pricing is your decision.
              </p>
            </>
          )}
        </div>
      )}
    </Card>
  )
}

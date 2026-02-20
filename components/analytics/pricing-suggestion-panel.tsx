'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import type { PricingSuggestion } from '@/lib/analytics/pricing-suggestions'

interface PricingSuggestionPanelProps {
  suggestion: PricingSuggestion | null
}

export function PricingSuggestionPanel({ suggestion }: PricingSuggestionPanelProps) {
  const [open, setOpen] = useState(false)

  if (!suggestion) return null

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-stone-900">Similar Quote Benchmarks</span>
          {suggestion.status === 'ok' && (
            <span className="text-xs text-stone-500">
              {suggestion.similarQuoteCount} comparable quotes
            </span>
          )}
        </div>
        <span className="text-stone-400 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-stone-100 pt-4 space-y-3">
          {suggestion.status === 'insufficient_data' ? (
            <p className="text-sm text-stone-400 italic">
              Need 3+ accepted quotes at this guest count range to show benchmarks.
            </p>
          ) : (
            <>
              {/* Price tiles */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center bg-stone-50 rounded-lg py-2 px-1">
                  <p className="text-xs text-stone-500 mb-0.5">Low</p>
                  <p className="text-sm font-bold text-stone-700">{formatCurrency(suggestion.minCents)}</p>
                </div>
                <div className="text-center bg-brand-50 rounded-lg py-2 px-1 ring-1 ring-brand-200">
                  <p className="text-xs text-brand-600 font-medium mb-0.5">Median</p>
                  <p className="text-sm font-bold text-brand-700">{formatCurrency(suggestion.medianCents)}</p>
                </div>
                <div className="text-center bg-stone-50 rounded-lg py-2 px-1">
                  <p className="text-xs text-stone-500 mb-0.5">High</p>
                  <p className="text-sm font-bold text-stone-700">{formatCurrency(suggestion.maxCents)}</p>
                </div>
              </div>

              {/* Avg food cost */}
              {suggestion.avgFoodCostPercent !== null && (
                <p className="text-xs text-stone-500">
                  Avg food cost for similar events: <span className="font-medium text-stone-700">{suggestion.avgFoodCostPercent}%</span>
                </p>
              )}

              {/* Context */}
              <p className="text-xs text-stone-400">
                Based on {suggestion.similarQuoteCount} accepted quotes
                &nbsp;&mdash;&nbsp;
                {suggestion.matchCriteria.pricingModel.replace('_', ' ')},&nbsp;
                {suggestion.matchCriteria.guestRangeMin}–{suggestion.matchCriteria.guestRangeMax} guests
              </p>

              <p className="text-xs text-stone-400 italic">
                Suggestion only — final pricing is your decision.
              </p>
            </>
          )}
        </div>
      )}
    </Card>
  )
}

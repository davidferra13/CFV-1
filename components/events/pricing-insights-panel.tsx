'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getPricingInsights, type PricingInsightsInput } from '@/lib/pricing/insights-actions'
import type { PricingIntelligenceResult } from '@/lib/formulas/pricing-intelligence'

type PricingInsightsPanelProps = {
  occasion: string | null
  guestCount: number | null
  eventDate: string | null
  serviceStyle: string | null
  dietaryRestrictions: string[] | null
  quotedPriceCents: number | null
}

function formatDollars(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const marketPositionConfig = {
  below_average: { label: 'Below Average', variant: 'error' as const },
  at_average: { label: 'At Average', variant: 'default' as const },
  above_average: { label: 'Above Average', variant: 'success' as const },
}

const confidenceConfig = {
  high: { label: 'High Confidence', variant: 'success' as const },
  medium: { label: 'Medium Confidence', variant: 'warning' as const },
  low: { label: 'Low Confidence', variant: 'default' as const },
}

export function PricingInsightsPanel(props: PricingInsightsPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<PricingIntelligenceResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchInsights = useCallback(() => {
    setError(null)
    const previousResult = result

    startTransition(async () => {
      try {
        const input: PricingInsightsInput = {
          occasion: props.occasion,
          guestCount: props.guestCount,
          eventDate: props.eventDate,
          serviceStyle: props.serviceStyle,
          dietaryRestrictions: props.dietaryRestrictions,
          quotedPriceCents: props.quotedPriceCents,
        }

        const response = await getPricingInsights(input)

        if (response.success) {
          setResult(response.data)
          setError(null)
        } else {
          setResult(previousResult)
          setError(response.error)
        }
      } catch (err) {
        setResult(previousResult)
        setError(err instanceof Error ? err.message : 'Failed to load pricing insights.')
      }
    })
  }, [
    props.occasion,
    props.guestCount,
    props.eventDate,
    props.serviceStyle,
    props.dietaryRestrictions,
    props.quotedPriceCents,
    result,
  ])

  // Fetch insights when the panel is opened
  useEffect(() => {
    if (isOpen && !result && !error) {
      fetchInsights()
    }
  }, [isOpen, result, error, fetchInsights])

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800/50 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-stone-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`h-4 w-4 text-stone-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-sm font-medium text-stone-200">Pricing Insights</span>
        </div>
        {result && !isOpen && (
          <span className="text-xs text-stone-500">
            {formatDollars(result.suggestedMinCents)} - {formatDollars(result.suggestedMaxCents)}
          </span>
        )}
      </button>

      {/* Content */}
      {isOpen && (
        <div className="px-4 pb-4 space-y-3 border-t border-stone-700">
          {/* Loading */}
          {isPending && !result && (
            <div className="pt-3 text-sm text-stone-400 animate-pulse">
              Analyzing your pricing history...
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="pt-3">
              <div className="rounded-md bg-red-950/50 border border-red-800 px-3 py-2">
                <p className="text-sm text-red-400">{error}</p>
              </div>
              <Button
                variant="ghost"
                className="mt-2 text-xs"
                onClick={fetchInsights}
                loading={isPending}
              >
                Try again
              </Button>
            </div>
          )}

          {/* Results */}
          {result && !error && (
            <div className="pt-3 space-y-3">
              {/* Suggested range */}
              {result.suggestedMinCents > 0 && result.suggestedMaxCents > 0 ? (
                <div>
                  <p className="text-xs text-stone-500 mb-1">Suggested Range</p>
                  <p className="text-lg font-semibold text-stone-200">
                    {formatDollars(result.suggestedMinCents)} -{' '}
                    {formatDollars(result.suggestedMaxCents)}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-stone-500 mb-1">Suggested Range</p>
                  <p className="text-sm text-stone-400">Not enough data yet</p>
                </div>
              )}

              {/* Per-head rate */}
              {result.suggestedPerHeadCents > 0 && (
                <div>
                  <p className="text-xs text-stone-500 mb-1">Per-Head Rate</p>
                  <p className="text-sm font-medium text-stone-300">
                    {formatDollars(result.suggestedPerHeadCents)}/guest
                  </p>
                </div>
              )}

              {/* Badges row */}
              <div className="flex flex-wrap gap-2">
                <Badge variant={marketPositionConfig[result.marketPosition].variant}>
                  {marketPositionConfig[result.marketPosition].label}
                </Badge>
                <Badge variant={confidenceConfig[result.confidence].variant}>
                  {confidenceConfig[result.confidence].label}
                </Badge>
              </div>

              {/* Underbidding warning */}
              {result.underbiddingWarning && (
                <div className="rounded-md bg-red-950/50 border border-red-800 px-3 py-2">
                  <p className="text-sm text-red-400">{result.underbiddingWarning}</p>
                </div>
              )}

              {/* Rationale */}
              <p className="text-xs text-stone-400 leading-relaxed">{result.rationale}</p>

              {/* Comparable events note */}
              <p className="text-xs text-stone-500">
                Based on {result.comparableEvents} comparable event
                {result.comparableEvents !== 1 ? 's' : ''}
              </p>

              {/* Refresh button */}
              <Button
                variant="ghost"
                className="text-xs"
                onClick={fetchInsights}
                loading={isPending}
              >
                {isPending ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

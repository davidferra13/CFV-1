'use client'

// Quote Cost Guard Banner
// Shown on the quote detail page when a quote is in draft status.
// Surfaces cost confidence issues before the chef sends the quote.
// Part of the Zero Hallucination rule: never show success without confirmation.

import { useEffect, useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { evaluateQuoteCostGuard, type QuoteCostGuardResult } from '@/lib/costing/quote-cost-guard'
import { CONFIDENCE_COLORS, CONFIDENCE_LABELS } from '@/lib/costing/recipe-cost-provenance'

type Props = {
  quoteId: string
  eventId: string
  status: string
}

export function QuoteCostGuardBanner({ quoteId, eventId, status }: Props) {
  const [result, setResult] = useState<QuoteCostGuardResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status !== 'draft') {
      setLoading(false)
      return
    }

    let cancelled = false
    evaluateQuoteCostGuard(quoteId)
      .then((r) => {
        if (!cancelled) setResult(r)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [quoteId, eventId, status])

  // Only show for draft quotes
  if (status !== 'draft' || loading || !result) return null

  // Don't show if high confidence and no warnings
  if (result.confidenceLevel === 'high' && result.warnings.length === 0) return null

  const colors = CONFIDENCE_COLORS[result.confidenceLevel]
  const label = CONFIDENCE_LABELS[result.confidenceLevel]

  const criticalWarnings = result.warnings.filter((w) => w.level === 'critical')
  const otherWarnings = result.warnings.filter((w) => w.level !== 'critical')

  const variant =
    result.confidenceLevel === 'insufficient' || result.confidenceLevel === 'low'
      ? 'error'
      : result.confidenceLevel === 'moderate'
        ? 'warning'
        : 'default'

  return (
    <Alert variant={variant as any} title={`Cost confidence: ${label}`}>
      <div className="space-y-2">
        <div className="flex items-center gap-3 text-sm">
          <span
            className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text} ${colors.border}`}
          >
            {result.coveragePct}% priced ({result.pricedIngredients}/{result.totalIngredients})
          </span>
          {result.staleCount > 0 && (
            <span className="text-amber-400 text-xs">{result.staleCount} stale</span>
          )}
          {result.noPriceCount > 0 && (
            <span className="text-red-400 text-xs">{result.noPriceCount} unpriced</span>
          )}
        </div>

        {criticalWarnings.length > 0 && (
          <div className="space-y-1">
            {criticalWarnings.map((w, i) => (
              <p key={i} className="text-sm text-red-400">
                {w.message}
              </p>
            ))}
          </div>
        )}

        {otherWarnings.length > 0 && (
          <details className="mt-1">
            <summary className="text-xs text-stone-400 cursor-pointer hover:text-stone-300">
              {otherWarnings.length} additional note{otherWarnings.length !== 1 ? 's' : ''}
            </summary>
            <div className="mt-1 space-y-1">
              {otherWarnings.map((w, i) => (
                <p key={i} className="text-xs text-stone-400">
                  {w.message}
                </p>
              ))}
            </div>
          </details>
        )}

        {!result.sendable && (
          <p className="text-xs font-medium text-red-400 mt-2">
            This quote has no cost basis. Review menu and ingredient pricing before sending.
          </p>
        )}
      </div>
    </Alert>
  )
}

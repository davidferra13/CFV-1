'use client'

// QuoteEventContext - Shows event profitability projection inline in the quote form.
// Only renders when creating/editing a quote linked to an event.

import { useEffect, useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getEventIntelligenceContext } from '@/lib/intelligence/event-context'

interface QuoteEventContextProps {
  eventId: string
  guestCount: number
  occasion?: string | null
  quotedPriceCents?: number | null
  eventDate?: string | null
}

export function QuoteEventContext({
  eventId,
  guestCount,
  occasion,
  quotedPriceCents,
  eventDate,
}: QuoteEventContextProps) {
  const [isPending, startTransition] = useTransition()
  const [context, setContext] = useState<Awaited<
    ReturnType<typeof getEventIntelligenceContext>
  > | null>(null)

  useEffect(() => {
    if (!eventId || guestCount < 1) return

    startTransition(async () => {
      try {
        const data = await getEventIntelligenceContext({
          eventId,
          guestCount,
          occasion: occasion || null,
          quotedPriceCents: quotedPriceCents || null,
          status: 'draft',
          eventDate: eventDate || null,
        })
        setContext(data)
      } catch {
        // Non-critical, fail silently
      }
    })
  }, [eventId, guestCount, occasion, quotedPriceCents, eventDate])

  if (!context) return null

  const hasContent =
    context.profitabilityProjection || context.priceComparison || context.insights.length > 0

  if (!hasContent) return null

  return (
    <Card className="overflow-hidden border-brand-800/30 bg-brand-950/10">
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider">
            Similar Event Intelligence
          </span>
          {isPending && <span className="text-xxs text-stone-500">Loading...</span>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Profitability */}
          {context.profitabilityProjection && (
            <div className="rounded-lg border border-stone-700/40 bg-stone-900 p-3">
              <p className="text-xs text-stone-500 mb-1">Expected Margin</p>
              <p
                className={`text-xl font-bold ${
                  context.profitabilityProjection.expectedMarginPercent >= 40
                    ? 'text-emerald-400'
                    : context.profitabilityProjection.expectedMarginPercent >= 20
                      ? 'text-amber-400'
                      : 'text-red-400'
                }`}
              >
                {context.profitabilityProjection.expectedMarginPercent}%
              </p>
              <p className="text-xxs text-stone-500 mt-0.5">
                Range: {context.profitabilityProjection.worstMarginPercent}% -{' '}
                {context.profitabilityProjection.bestMarginPercent}%
              </p>
              <Badge
                variant={
                  context.profitabilityProjection.confidence === 'high'
                    ? 'success'
                    : context.profitabilityProjection.confidence === 'medium'
                      ? 'warning'
                      : 'default'
                }
              >
                {context.profitabilityProjection.similarEventsCount} similar events
              </Badge>
            </div>
          )}

          {/* Price comparison */}
          {context.priceComparison && (
            <div className="rounded-lg border border-stone-700/40 bg-stone-900 p-3">
              <p className="text-xs text-stone-500 mb-1">vs. Average</p>
              <p
                className={`text-xl font-bold ${
                  context.priceComparison.percentAboveAverage > 0
                    ? 'text-emerald-400'
                    : context.priceComparison.percentAboveAverage < -10
                      ? 'text-amber-400'
                      : 'text-stone-200'
                }`}
              >
                {context.priceComparison.percentAboveAverage > 0 ? '+' : ''}
                {context.priceComparison.percentAboveAverage}%
              </p>
              <p className="text-xxs text-stone-500 mt-0.5">
                ${(context.priceComparison.perGuestCents / 100).toFixed(0)}/guest (avg $
                {(context.priceComparison.averagePerGuestCents / 100).toFixed(0)})
              </p>
            </div>
          )}
        </div>

        {/* Insights */}
        {context.insights.length > 0 && (
          <div className="mt-3 space-y-1">
            {context.insights.slice(0, 3).map((insight, i) => (
              <p key={i} className="text-xxs text-stone-400">
                {insight}
              </p>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

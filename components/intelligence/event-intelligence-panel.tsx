import { Card, CardContent } from '@/components/ui/card'
import {
  getEventIntelligenceContext,
  type EventIntelligenceContext,
} from '@/lib/intelligence/event-context'

interface EventIntelligencePanelProps {
  eventId: string
  guestCount: number | null
  occasion: string | null
  quotedPriceCents: number | null
  status: string
  eventDate: string | null
}

export async function EventIntelligencePanel(props: EventIntelligencePanelProps) {
  const context = await getEventIntelligenceContext(props).catch(() => null)

  if (!context) return null

  const hasContent =
    context.profitabilityProjection ||
    context.priceComparison ||
    context.postEventActions.length > 0 ||
    context.insights.length > 0

  if (!hasContent) return null

  return (
    <Card className="border-brand-800/30 bg-brand-950/10">
      <CardContent className="py-4 px-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider">
            Event Intelligence
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Profitability Projection */}
          {context.profitabilityProjection && (
            <div className="rounded-lg border border-stone-700/40 bg-stone-900 p-3">
              <p className="text-xs text-stone-500 mb-1">Expected Margin</p>
              <p
                className={`text-2xl font-bold ${
                  context.profitabilityProjection.expectedMarginPercent >= 40
                    ? 'text-emerald-400'
                    : context.profitabilityProjection.expectedMarginPercent >= 20
                      ? 'text-amber-400'
                      : 'text-red-400'
                }`}
              >
                {context.profitabilityProjection.expectedMarginPercent}%
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                Range: {context.profitabilityProjection.worstMarginPercent}% -{' '}
                {context.profitabilityProjection.bestMarginPercent}%
              </p>
              <p className="text-xs text-stone-500 mt-1">
                Based on {context.profitabilityProjection.similarEventsCount} similar events
              </p>
            </div>
          )}

          {/* Price Comparison */}
          {context.priceComparison && (
            <div className="rounded-lg border border-stone-700/40 bg-stone-900 p-3">
              <p className="text-xs text-stone-500 mb-1">Price vs Average</p>
              <p
                className={`text-2xl font-bold ${
                  context.priceComparison.isAboveAverage ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {context.priceComparison.percentFromAvg > 0 ? '+' : ''}
                {context.priceComparison.percentFromAvg}%
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                ${Math.round(context.priceComparison.perGuestCents / 100)}/guest (avg: $
                {Math.round(context.priceComparison.avgPerGuestCents / 100)}/guest)
              </p>
            </div>
          )}

          {/* Insights or placeholder */}
          {context.insights.length > 0 && (
            <div className="rounded-lg border border-stone-700/40 bg-stone-900 p-3">
              <p className="text-xs text-stone-500 mb-1">Insights</p>
              <div className="space-y-1.5">
                {context.insights.map((insight, i) => (
                  <p key={i} className="text-xs text-stone-300">
                    {insight}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Post-Event Actions */}
        {context.postEventActions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-stone-800">
            <p className="text-xs font-medium text-stone-400 mb-2">Suggested Next Steps</p>
            <div className="space-y-1">
              {context.postEventActions.map((action, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs text-brand-400 mt-0.5">*</span>
                  <p className="text-xs text-stone-300">{action}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

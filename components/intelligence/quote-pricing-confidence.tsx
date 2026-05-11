/**
 * Quote Pricing Confidence Widget
 *
 * Async server component that renders the full pricing confidence panel
 * on the quote detail page: gauge, market bar, similar events, recommendation.
 */

import { getPricingConfidenceReport } from '@/lib/intelligence/pricing-confidence-actions'
import { PricingConfidenceGauge } from './pricing-confidence-gauge'
import { MarketPositionBar } from './market-position-bar'
import { SimilarEventsList } from './similar-events-list'
import { PricingRecommendation } from './pricing-recommendation'

interface QuotePricingConfidenceProps {
  quoteId: string
}

export async function QuotePricingConfidence({ quoteId }: QuotePricingConfidenceProps) {
  const report = await getPricingConfidenceReport(quoteId)

  if (!report) return null

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-stone-100">Pricing Confidence</h3>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            report.level === 'very_high' ? 'bg-emerald-500/20 text-emerald-400' :
            report.level === 'high' ? 'bg-emerald-500/10 text-emerald-400' :
            report.level === 'moderate' ? 'bg-amber-500/10 text-amber-400' :
            'bg-red-500/10 text-red-400'
          }`}
        >
          {report.score}/100
        </span>
      </div>

      {/* Gauge */}
      <PricingConfidenceGauge report={report} />

      {/* Market Position */}
      <MarketPositionBar report={report} />

      {/* Similar Events */}
      <SimilarEventsList
        events={report.similarEvents}
        currentPerGuestCents={report.perGuestCents}
      />

      {/* Recommendation */}
      <PricingRecommendation report={report} />
    </div>
  )
}

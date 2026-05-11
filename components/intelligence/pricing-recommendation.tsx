/**
 * Pricing Recommendation
 *
 * Text recommendation based on pricing confidence analysis.
 * Shows factors and overall advice.
 */

import type { PricingConfidenceReport } from '@/lib/intelligence/pricing-confidence'
import { formatCurrency } from '@/lib/utils/currency'

interface PricingRecommendationProps {
  report: PricingConfidenceReport
}

export function PricingRecommendation({ report }: PricingRecommendationProps) {
  return (
    <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 p-4">
      <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">
        Analysis
      </h4>

      {/* Recommendation text */}
      <p className="text-sm text-stone-200 mb-3">{report.recommendation}</p>

      {/* Factors */}
      {report.factors.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {report.factors.map((factor, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-brand-500" />
              <p className="text-xs text-stone-400">{factor}</p>
            </div>
          ))}
        </div>
      )}

      {/* Key metrics row */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-800">
        {report.foodCostPct !== null && (
          <div>
            <p className="text-xs text-stone-500">Food Cost</p>
            <p
              className={`text-sm font-semibold ${
                report.foodCostPct <= 30
                  ? 'text-emerald-400'
                  : report.foodCostPct <= 45
                    ? 'text-amber-400'
                    : 'text-red-400'
              }`}
            >
              {report.foodCostPct}%
            </p>
          </div>
        )}
        {report.estimatedMarginCents !== null && (
          <div>
            <p className="text-xs text-stone-500">Est. Margin</p>
            <p
              className={`text-sm font-semibold ${
                report.estimatedMarginCents > 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {formatCurrency(report.estimatedMarginCents)}
            </p>
          </div>
        )}
        <div>
          <p className="text-xs text-stone-500">Data Points</p>
          <p className="text-sm font-semibold text-stone-200">{report.dataPointCount}</p>
        </div>
        <div>
          <p className="text-xs text-stone-500">Per Guest</p>
          <p className="text-sm font-semibold text-stone-200">
            {formatCurrency(report.perGuestCents)}
          </p>
        </div>
      </div>
    </div>
  )
}

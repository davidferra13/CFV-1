'use client'

import type { VendorScorecard } from '@/lib/vendors/scorecard-actions'

const GRADE_COLORS: Record<string, string> = {
  A: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  B: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  C: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  D: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  F: 'text-red-400 bg-red-400/10 border-red-400/30',
}

const BAR_COLORS: Record<string, string> = {
  A: 'bg-emerald-500',
  B: 'bg-blue-500',
  C: 'bg-amber-500',
  D: 'bg-orange-500',
  F: 'bg-red-500',
}

function ScoreBar({
  label,
  score,
  max,
  detail,
}: {
  label: string
  score: number
  max: number
  detail: string
}) {
  const pct = max > 0 ? (score / max) * 100 : 0
  const color =
    pct >= 75
      ? 'bg-emerald-500'
      : pct >= 50
        ? 'bg-amber-500'
        : pct >= 25
          ? 'bg-orange-500'
          : 'bg-red-500'

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-stone-400">{label}</span>
        <span className="text-stone-500">{detail}</span>
      </div>
      <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function VendorScorecardCard({ scorecard }: { scorecard: VendorScorecard }) {
  const { overallScore, grade, metrics } = scorecard
  const gradeColor = GRADE_COLORS[grade] || GRADE_COLORS.F
  const barColor = BAR_COLORS[grade] || BAR_COLORS.F

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900/50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-stone-300">Vendor Scorecard</h3>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-2xl font-bold text-stone-200">{overallScore}</div>
            <div className="text-[10px] text-stone-500 uppercase tracking-wide">/ 100</div>
          </div>
          <div
            className={`w-10 h-10 rounded-lg border flex items-center justify-center text-xl font-bold ${gradeColor}`}
          >
            {grade}
          </div>
        </div>
      </div>

      {/* Overall bar */}
      <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${overallScore}%` }}
        />
      </div>

      {/* Metric breakdown */}
      <div className="space-y-2.5 pt-1">
        <ScoreBar
          label="Order History"
          score={metrics.orderHistory.score}
          max={25}
          detail={`${metrics.orderHistory.invoiceCount} invoices, $${(metrics.orderHistory.totalSpendCents / 100).toLocaleString()}`}
        />
        <ScoreBar
          label="Price Stability"
          score={metrics.priceStability.score}
          max={20}
          detail={
            metrics.priceStability.avgVariancePct > 0
              ? `${metrics.priceStability.avgVariancePct}% avg variance`
              : 'No price data'
          }
        />
        <ScoreBar
          label="Quality Rating"
          score={metrics.qualityRating.score}
          max={20}
          detail={
            metrics.qualityRating.manualRating
              ? `${metrics.qualityRating.manualRating}/5 stars`
              : 'Not rated'
          }
        />
        <ScoreBar
          label="Catalog Depth"
          score={metrics.catalogDepth.score}
          max={15}
          detail={`${metrics.catalogDepth.itemCount} items tracked`}
        />
        <ScoreBar
          label="Event Reliability"
          score={metrics.eventReliability.score}
          max={10}
          detail={`${metrics.eventReliability.eventCount} events`}
        />
        <ScoreBar
          label="Data Completeness"
          score={metrics.dataCompleteness.score}
          max={10}
          detail={`${metrics.dataCompleteness.filledFields}/${metrics.dataCompleteness.totalFields} fields`}
        />
      </div>
    </div>
  )
}

import { getQuoteIntelligence } from '@/lib/intelligence/quote-confidence'
import { formatCurrency } from '@/lib/utils/currency'

export async function QuoteIntelligenceBar() {
  const intel = await getQuoteIntelligence().catch(() => null)

  if (!intel) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Acceptance Rate */}
      <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
        <p className="text-xs text-stone-500">Acceptance Rate</p>
        <p
          className={`text-lg font-bold ${
            intel.overallAcceptanceRate >= 60
              ? 'text-emerald-400'
              : intel.overallAcceptanceRate >= 40
                ? 'text-amber-400'
                : 'text-red-400'
          }`}
        >
          {intel.overallAcceptanceRate}%
        </p>
        <p className="text-xs text-stone-500">trend: {intel.recentTrend}</p>
      </div>

      {/* Sweet Spot */}
      {intel.sweetSpot && (
        <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
          <p className="text-xs text-stone-500">Sweet Spot</p>
          <p className="text-lg font-bold text-stone-100">
            {formatCurrency(intel.sweetSpot.minCents)} – {formatCurrency(intel.sweetSpot.maxCents)}
          </p>
          <p className="text-xs text-stone-500">{intel.sweetSpot.acceptanceRate}% accepted</p>
        </div>
      )}

      {/* Avg Decision Time */}
      <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
        <p className="text-xs text-stone-500">Avg Decision Time</p>
        <p className="text-lg font-bold text-stone-100">{intel.avgTimeToDecisionDays}d</p>
        <p className="text-xs text-stone-500">
          {intel.expiredCount > 0 ? `${intel.expiredCount} expired` : 'none expired'}
        </p>
      </div>

      {/* Price Gap */}
      <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
        <p className="text-xs text-stone-500">Accepted vs Rejected</p>
        <p className="text-lg font-bold text-emerald-400">
          {formatCurrency(intel.acceptedAvgCents)}
        </p>
        <p className="text-xs text-stone-500">
          rejected avg: {formatCurrency(intel.rejectedAvgCents)}
        </p>
      </div>
    </div>
  )
}

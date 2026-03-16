import { getEventsFinancialSummary } from '@/lib/intelligence/events-financial-summary'
import { formatCurrency } from '@/lib/utils/currency'

export async function EventsFinancialBar() {
  const summary = await getEventsFinancialSummary().catch(() => null)

  if (!summary) return null

  const growthColor =
    summary.ytdGrowthPercent != null && summary.ytdGrowthPercent > 0
      ? 'text-emerald-400'
      : summary.ytdGrowthPercent != null && summary.ytdGrowthPercent < 0
        ? 'text-red-400'
        : 'text-stone-100'

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Upcoming Revenue */}
      <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
        <p className="text-xs text-stone-500">Upcoming (30d)</p>
        <p className="text-lg font-bold text-stone-100">
          {formatCurrency(summary.upcomingRevenueCents)}
        </p>
        <p className="text-xs text-stone-500">
          {summary.upcomingEventCount} event{summary.upcomingEventCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* This Month */}
      <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
        <p className="text-xs text-stone-500">This Month</p>
        <p className="text-lg font-bold text-stone-100">
          {formatCurrency(summary.monthRevenueCents)}
        </p>
        {summary.monthAvgMarginPercent != null && (
          <p
            className={`text-xs ${
              summary.monthAvgMarginPercent >= 40
                ? 'text-emerald-400'
                : summary.monthAvgMarginPercent >= 20
                  ? 'text-amber-400'
                  : 'text-red-400'
            }`}
          >
            {summary.monthAvgMarginPercent}% avg margin
          </p>
        )}
      </div>

      {/* YTD Revenue */}
      <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
        <p className="text-xs text-stone-500">Year to Date</p>
        <p className="text-lg font-bold text-stone-100">
          {formatCurrency(summary.ytdRevenueCents)}
        </p>
        {summary.ytdGrowthPercent != null && (
          <p className={`text-xs ${growthColor}`}>
            {summary.ytdGrowthPercent > 0 ? '+' : ''}
            {summary.ytdGrowthPercent}% vs last year
          </p>
        )}
      </div>

      {/* Pace */}
      <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
        <p className="text-xs text-stone-500">Avg Events/Month</p>
        <p className="text-lg font-bold text-stone-100">
          {summary.avgPerMonth != null ? summary.avgPerMonth : '-'}
        </p>
        <p className="text-xs text-stone-500">{summary.eventsNext30Days} booked next 30d</p>
      </div>
    </div>
  )
}

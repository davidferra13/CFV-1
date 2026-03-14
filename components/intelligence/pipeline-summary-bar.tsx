import { getPipelineSummary } from '@/lib/intelligence/pipeline-summary'
import { formatCurrency } from '@/lib/utils/currency'

export async function PipelineSummaryBar() {
  const summary = await getPipelineSummary().catch(() => null)

  if (!summary) return null

  const trendIcon = summary.weekTrend === 'up' ? '↑' : summary.weekTrend === 'down' ? '↓' : '→'
  const trendColor =
    summary.weekTrend === 'up'
      ? 'text-emerald-400'
      : summary.weekTrend === 'down'
        ? 'text-red-400'
        : 'text-stone-400'

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Pipeline Value */}
      <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
        <p className="text-xs text-stone-500">Pipeline Value</p>
        <p className="text-lg font-bold text-stone-100">
          {formatCurrency(summary.estimatedPipelineValueCents)}
        </p>
        {summary.expectedConversionValueCents > 0 && (
          <p className="text-xs text-stone-500">
            ~{formatCurrency(summary.expectedConversionValueCents)} expected
          </p>
        )}
      </div>

      {/* Conversion Rate */}
      <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
        <p className="text-xs text-stone-500">Conversion Rate</p>
        <p
          className={`text-lg font-bold ${
            summary.historicalConversionRate >= 40
              ? 'text-emerald-400'
              : summary.historicalConversionRate >= 20
                ? 'text-amber-400'
                : 'text-stone-100'
          }`}
        >
          {summary.historicalConversionRate > 0 ? `${summary.historicalConversionRate}%` : '—'}
        </p>
        {summary.avgDaysToConvert && (
          <p className="text-xs text-stone-500">~{summary.avgDaysToConvert}d avg to convert</p>
        )}
      </div>

      {/* Open Inquiries */}
      <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
        <p className="text-xs text-stone-500">Open Inquiries</p>
        <p className="text-lg font-bold text-stone-100">{summary.totalOpenInquiries}</p>
        {summary.urgentCount > 0 && (
          <p className="text-xs text-red-400">{summary.urgentCount} need response</p>
        )}
      </div>

      {/* Week Trend */}
      <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
        <p className="text-xs text-stone-500">This Week</p>
        <p className={`text-lg font-bold ${trendColor}`}>
          {summary.weekInquiryCount} {trendIcon}
        </p>
        <p className="text-xs text-stone-500">vs {summary.priorWeekInquiryCount} last week</p>
      </div>
    </div>
  )
}

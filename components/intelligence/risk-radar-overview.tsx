'use client'

// Risk Radar Overview - summary counts per risk level + revenue at risk

import type { ClientRiskSummary } from '@/lib/intelligence/client-risk'

interface RiskRadarOverviewProps {
  summary: ClientRiskSummary
}

function formatDollars(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function RiskRadarOverview({ summary }: RiskRadarOverviewProps) {
  const buckets = [
    {
      label: 'Critical',
      count: summary.criticalCount,
      bg: 'bg-red-950/40',
      border: 'border-red-800/50',
      text: 'text-red-400',
      dot: 'bg-red-500',
    },
    {
      label: 'High',
      count: summary.highCount,
      bg: 'bg-orange-950/40',
      border: 'border-orange-800/50',
      text: 'text-orange-400',
      dot: 'bg-orange-500',
    },
    {
      label: 'Medium',
      count: summary.mediumCount,
      bg: 'bg-amber-950/40',
      border: 'border-amber-800/50',
      text: 'text-amber-400',
      dot: 'bg-amber-500',
    },
    {
      label: 'Low',
      count: summary.lowCount,
      bg: 'bg-emerald-950/40',
      border: 'border-emerald-800/50',
      text: 'text-emerald-400',
      dot: 'bg-emerald-500',
    },
  ]

  const totalAtRisk = summary.criticalCount + summary.highCount
  const allClear = totalAtRisk === 0 && summary.mediumCount === 0

  return (
    <div className="space-y-4">
      {/* Risk level buckets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {buckets.map((b) => (
          <div
            key={b.label}
            className={`rounded-lg border ${b.border} ${b.bg} px-4 py-3 text-center`}
          >
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span className={`h-2 w-2 rounded-full ${b.dot}`} />
              <span className={`text-xs font-medium ${b.text}`}>{b.label}</span>
            </div>
            <p className={`text-2xl font-bold ${b.text}`}>{b.count}</p>
          </div>
        ))}
      </div>

      {/* Revenue at risk */}
      {summary.totalRevenueAtRiskCents > 0 && (
        <div className="rounded-lg border border-stone-700 bg-stone-800/50 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-stone-400">Revenue at risk (critical + high clients)</span>
          <span className="text-lg font-bold text-red-400">
            {formatDollars(summary.totalRevenueAtRiskCents)}
          </span>
        </div>
      )}

      {/* Top recommendation */}
      {summary.topRecommendation && !allClear && (
        <div className="rounded-lg border border-brand-800/40 bg-brand-950/20 px-4 py-3">
          <p className="text-xs text-stone-500 mb-1">Top recommendation</p>
          <p className="text-sm text-stone-200">{summary.topRecommendation}</p>
        </div>
      )}

      {/* All clear */}
      {allClear && (
        <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 px-4 py-3 text-center">
          <p className="text-sm text-emerald-300">All clients are healthy. No immediate risk detected.</p>
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  getSourcingStats,
  getSourcingScorecard,
  getSourceBreakdown,
  getMonthlyTrend,
  type SourcingStats,
  type Scorecard,
} from '@/lib/sustainability/sourcing-actions'
import {
  SOURCE_TYPE_LABELS,
  SOURCE_TYPE_COLORS,
  type SourceType,
} from '@/lib/sustainability/sourcing-constants'

const GRADE_COLORS: Record<string, string> = {
  A: 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800',
  B: 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800',
  C: 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-800',
  D: 'text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-900/20 dark:border-orange-800',
  F: 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800',
}

export function SourcingDashboard() {
  const [stats, setStats] = useState<SourcingStats | null>(null)
  const [scorecard, setScorecard] = useState<Scorecard | null>(null)
  const [breakdown, setBreakdown] = useState<
    { source_type: SourceType; count: number; weight: number; percent: number }[]
  >([])
  const [trend, setTrend] = useState<
    { month: string; localPercent: number; organicPercent: number; entryCount: number }[]
  >([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      try {
        const [s, sc, b, t] = await Promise.all([
          getSourcingStats(),
          getSourcingScorecard(),
          getSourceBreakdown(),
          getMonthlyTrend(),
        ])
        setStats(s)
        setScorecard(sc)
        setBreakdown(b)
        setTrend(t)
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load sourcing data')
      }
    })
  }, [])

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
        Could not load sourcing data: {loadError}
      </div>
    )
  }

  if (isPending || !stats || !scorecard) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
        ))}
      </div>
    )
  }

  if (stats.totalEntries === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-800">
        <div className="text-4xl">🌱</div>
        <h3 className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Start Tracking Your Sourcing
        </h3>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Log where your ingredients come from to see your quality sourcing scorecard.
        </p>
      </div>
    )
  }

  // Build conic-gradient for donut chart
  const conicStops: string[] = []
  let cumulativePercent = 0
  for (const item of breakdown) {
    const color = SOURCE_TYPE_COLORS[item.source_type] || '#94a3b8'
    const start = cumulativePercent
    cumulativePercent += item.percent
    conicStops.push(`${color} ${start}% ${cumulativePercent}%`)
  }
  const conicGradient = `conic-gradient(${conicStops.join(', ')})`

  // Monthly trend max for bar scaling
  const maxTrendPercent = Math.max(
    ...trend.map((t) => Math.max(t.localPercent, t.organicPercent)),
    1
  )

  return (
    <div className="space-y-6">
      {/* Scorecard + Stats Row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {/* Scorecard Grade */}
        <div
          className={`flex flex-col items-center justify-center rounded-lg border-2 p-6 ${GRADE_COLORS[scorecard.grade]}`}
        >
          <div className="text-6xl font-black">{scorecard.grade}</div>
          <div className="mt-1 text-xs font-medium uppercase tracking-wide">Sourcing Grade</div>
          <p className="mt-2 text-center text-xs opacity-80">{scorecard.details}</p>
        </div>

        {/* Local % */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Local Sourced</div>
          <div className="mt-1 text-3xl font-bold text-green-600 dark:text-green-400">
            {stats.localPercent}%
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${Math.min(stats.localPercent, 100)}%` }}
            />
          </div>
        </div>

        {/* Organic % */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Organic</div>
          <div className="mt-1 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.organicPercent}%
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${Math.min(stats.organicPercent, 100)}%` }}
            />
          </div>
        </div>

        {/* Avg Food Miles */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Avg Food Miles</div>
          <div className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            {stats.avgFoodMiles}
          </div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">miles per ingredient</div>
        </div>
      </div>

      {/* CO2 + Weight Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            CO2 Savings Estimate
          </div>
          <div className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.co2SavedLbs} lbs
          </div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            vs. all conventional sourcing
          </div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Total Weight Tracked
          </div>
          <div className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {stats.totalWeightLbs} lbs
          </div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Entries</div>
          <div className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {stats.totalEntries}
          </div>
        </div>
      </div>

      {/* Source Breakdown Donut + Legend */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Source Breakdown
          </h3>
          <div className="flex items-center gap-6">
            {/* CSS Donut Chart */}
            <div
              className="relative h-36 w-36 flex-shrink-0 rounded-full"
              style={{ background: conicGradient }}
            >
              <div className="absolute inset-4 rounded-full bg-white dark:bg-zinc-800" />
            </div>
            {/* Legend */}
            <div className="space-y-1.5">
              {breakdown.map((item) => (
                <div key={item.source_type} className="flex items-center gap-2 text-xs">
                  <span
                    className="inline-block h-3 w-3 rounded-sm"
                    style={{ backgroundColor: SOURCE_TYPE_COLORS[item.source_type] || '#94a3b8' }}
                  />
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {SOURCE_TYPE_LABELS[item.source_type]} ({item.percent}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Monthly Trend (12 months)
          </h3>
          {trend.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              Not enough data for trend analysis yet.
            </div>
          ) : (
            <div className="flex items-end gap-1" style={{ height: '120px' }}>
              {trend.map((month) => (
                <div key={month.month} className="flex flex-1 flex-col items-center gap-0.5">
                  {/* Local bar */}
                  <div
                    className="w-full rounded-t bg-green-500"
                    style={{
                      height: `${(month.localPercent / maxTrendPercent) * 80}px`,
                      minHeight: month.localPercent > 0 ? '2px' : '0px',
                    }}
                    title={`Local: ${month.localPercent}%`}
                  />
                  {/* Organic bar */}
                  <div
                    className="w-full rounded-t bg-emerald-400"
                    style={{
                      height: `${(month.organicPercent / maxTrendPercent) * 80}px`,
                      minHeight: month.organicPercent > 0 ? '2px' : '0px',
                    }}
                    title={`Organic: ${month.organicPercent}%`}
                  />
                  <div className="mt-1 text-center text-2xs text-zinc-400">
                    {month.month.substring(5)}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-green-500" /> Local %
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-emerald-400" /> Organic %
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

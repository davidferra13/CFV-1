// Freshness Report Card - dashboard card showing overall data freshness health
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { FreshnessReport, FreshnessStatus } from '@/lib/data-quality/freshness'
import { FreshnessBadge } from './freshness-badge'

interface FreshnessReportCardProps {
  report: FreshnessReport
}

function ScoreRing({ score }: { score: number }) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  let color = 'text-emerald-400'
  if (score < 50) color = 'text-red-400'
  else if (score < 75) color = 'text-amber-400'

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="88" height="88" className="-rotate-90">
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          className="text-stone-700"
        />
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={color}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <span className={`absolute text-xl font-bold ${color}`}>{score}%</span>
    </div>
  )
}

function CategoryBar({
  label,
  buckets,
}: {
  label: string
  buckets: { fresh: number; aging: number; stale: number; expired: number; total: number }
}) {
  if (buckets.total === 0) {
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-stone-400">{label}</span>
          <span className="text-stone-500">No data</span>
        </div>
        <div className="h-2 rounded-full bg-stone-700" />
      </div>
    )
  }

  const pct = (n: number) => (n / buckets.total) * 100

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-stone-400">{label}</span>
        <span className="text-stone-500">{buckets.total} items</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-stone-700">
        {buckets.fresh > 0 && (
          <div
            className="bg-emerald-500 transition-all duration-300"
            style={{ width: `${pct(buckets.fresh)}%` }}
          />
        )}
        {buckets.aging > 0 && (
          <div
            className="bg-amber-500 transition-all duration-300"
            style={{ width: `${pct(buckets.aging)}%` }}
          />
        )}
        {buckets.stale > 0 && (
          <div
            className="bg-red-400 transition-all duration-300"
            style={{ width: `${pct(buckets.stale)}%` }}
          />
        )}
        {buckets.expired > 0 && (
          <div
            className="bg-red-600 transition-all duration-300"
            style={{ width: `${pct(buckets.expired)}%` }}
          />
        )}
      </div>
    </div>
  )
}

export function FreshnessReportCard({ report }: FreshnessReportCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h3">Data Last Updated</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-6">
          <ScoreRing score={report.overallScore} />
          <div className="space-y-1">
            <p className="text-sm text-stone-300">Overall Freshness Score</p>
            <p className="text-xs text-stone-500">
              Percentage of prices, clients, and recipes that are current
            </p>
            <div className="flex gap-3 mt-2 text-xs">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Fresh
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Aging
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-400" /> Stale
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-600" /> Expired
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <CategoryBar label="Prices" buckets={report.prices} />
          <CategoryBar label="Clients" buckets={report.clients} />
          <CategoryBar label="Recipes" buckets={report.recipes} />
        </div>

        {report.staleItems.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-stone-700">
            <p className="text-xs text-stone-400 font-medium">Needs attention</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {report.staleItems.slice(0, 10).map((item) => (
                <div
                  key={`${item.entity}-${item.id}`}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-stone-300 truncate max-w-[200px]">{item.name}</span>
                  <FreshnessBadge status={item.status} ageDays={item.ageDays} />
                </div>
              ))}
              {report.staleItems.length > 10 && (
                <p className="text-xs text-stone-500 text-center pt-1">
                  +{report.staleItems.length - 10} more items need updating
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

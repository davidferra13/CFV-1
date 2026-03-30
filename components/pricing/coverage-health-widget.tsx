'use client'

import { useEffect, useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getCoverageHealth, type CoverageHealthReport } from '@/lib/openclaw/coverage-health'

function pctColor(pct: number): string {
  if (pct >= 80) return 'text-green-400'
  if (pct >= 50) return 'text-yellow-400'
  return 'text-red-400'
}

function StatBox({
  label,
  value,
  suffix,
}: {
  label: string
  value: number | string
  suffix?: string
}) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-stone-100">
        {value}
        {suffix && <span className="text-sm text-stone-400">{suffix}</span>}
      </div>
      <div className="text-xs text-stone-400">{label}</div>
    </div>
  )
}

export function CoverageHealthWidget() {
  const [report, setReport] = useState<CoverageHealthReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await getCoverageHealth()
        setReport(data)
      } catch (err) {
        setError('Could not load coverage data')
      }
    })
  }, [])

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-stone-500">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (pending || !report) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-32 rounded bg-stone-800" />
            <div className="flex gap-6">
              <div className="h-12 w-20 rounded bg-stone-800" />
              <div className="h-12 w-20 rounded bg-stone-800" />
              <div className="h-12 w-20 rounded bg-stone-800" />
              <div className="h-12 w-20 rounded bg-stone-800" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (report.overall.totalIngredients === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <h3 className="mb-2 text-sm font-medium text-stone-300">Price Coverage</h3>
          <p className="text-sm text-stone-500">No ingredient data yet. Run OpenCLAW sync first.</p>
        </CardContent>
      </Card>
    )
  }

  const { overall, byCategory, confidenceDistribution, gaps } = report

  return (
    <Card>
      <CardContent className="py-4">
        <h3 className="mb-3 text-sm font-medium text-stone-300">Price Coverage</h3>

        {/* Stat boxes */}
        <div className="mb-4 grid grid-cols-4 gap-3">
          <StatBox label="Total Ingredients" value={overall.totalIngredients.toLocaleString()} />
          <StatBox label="Coverage" value={overall.coveragePct} suffix="%" />
          <StatBox
            label="With Images"
            value={
              overall.totalIngredients > 0
                ? Math.round((overall.withImage / overall.totalIngredients) * 100)
                : 0
            }
            suffix="%"
          />
          <StatBox
            label="Nutrition Linked"
            value={
              overall.totalIngredients > 0
                ? Math.round((overall.withNutrition / overall.totalIngredients) * 100)
                : 0
            }
            suffix="%"
          />
        </div>

        {/* Category coverage bars (top 5) */}
        {byCategory.length > 0 && (
          <div className="mb-3 space-y-1.5">
            <div className="text-xs font-medium text-stone-400">By Category</div>
            {byCategory.slice(0, 5).map((cat) => (
              <div key={cat.category} className="flex items-center gap-2 text-xs">
                <span className="w-24 truncate text-stone-300">{cat.category}</span>
                <div className="h-1.5 flex-1 rounded-full bg-stone-800">
                  <div
                    className={`h-1.5 rounded-full ${
                      cat.pct >= 80
                        ? 'bg-green-500'
                        : cat.pct >= 50
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.max(cat.pct, 2)}%` }}
                  />
                </div>
                <span className={`w-8 text-right ${pctColor(cat.pct)}`}>{cat.pct}%</span>
              </div>
            ))}
          </div>
        )}

        {/* Confidence distribution */}
        <div className="mb-3 flex gap-2">
          <Badge variant="success">High: {confidenceDistribution.high}</Badge>
          <Badge variant="warning">Med: {confidenceDistribution.medium}</Badge>
          <Badge variant="error">Low: {confidenceDistribution.low}</Badge>
          <Badge variant="default">Stale: {confidenceDistribution.stale}</Badge>
        </div>

        {/* Gaps */}
        {gaps.length > 0 && (
          <div>
            <div className="mb-1 text-xs font-medium text-stone-400">
              Missing Prices ({gaps.length})
            </div>
            <div className="text-xs text-stone-500">
              {gaps.slice(0, 5).join(', ')}
              {gaps.length > 5 && ` +${gaps.length - 5} more`}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

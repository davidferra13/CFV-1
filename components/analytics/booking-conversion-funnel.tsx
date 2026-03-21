'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowDown, TrendingUp, XCircle } from '@/components/ui/icons'
import {
  getConversionFunnel,
  type ConversionFunnelData,
  type DateRange,
} from '@/lib/analytics/conversion-tracking'

// ── Stage Colors ─────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  draft: 'bg-stone-600',
  proposed: 'bg-brand-600',
  accepted: 'bg-brand-500',
  paid: 'bg-brand-600',
  confirmed: 'bg-brand-500',
  in_progress: 'bg-emerald-600',
  completed: 'bg-emerald-500',
}

// ── Date Range Presets ───────────────────────────────────────────────────────

type Preset = 'all' | '30d' | '90d' | '6m' | '12m'

function getDateRange(preset: Preset): DateRange | undefined {
  if (preset === 'all') return undefined
  const now = new Date()
  const from = new Date()
  switch (preset) {
    case '30d':
      from.setDate(now.getDate() - 30)
      break
    case '90d':
      from.setDate(now.getDate() - 90)
      break
    case '6m':
      from.setMonth(now.getMonth() - 6)
      break
    case '12m':
      from.setFullYear(now.getFullYear() - 1)
      break
  }
  return { from: from.toISOString(), to: now.toISOString() }
}

// ── Component ────────────────────────────────────────────────────────────────

export function BookingConversionFunnel() {
  const [data, setData] = useState<ConversionFunnelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [preset, setPreset] = useState<Preset>('all')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const range = getDateRange(preset)
      const result = await getConversionFunnel(range)
      setData(result)
    } catch (err) {
      setError('Failed to load conversion funnel data')
      console.error('[BookingConversionFunnel]', err)
    } finally {
      setLoading(false)
    }
  }, [preset])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-stone-400">Loading funnel data...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <XCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-400">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.stages.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-stone-400 italic">No events found for this period.</p>
        </CardContent>
      </Card>
    )
  }

  const maxCount = Math.max(...data.stages.map((s) => s.count), 1)

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', '30d', '90d', '6m', '12m'] as Preset[]).map((p) => (
          <button
            key={p}
            onClick={() => setPreset(p)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              preset === p
                ? 'bg-brand-600 text-white'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
            }`}
          >
            {p === 'all'
              ? 'All Time'
              : p === '30d'
                ? '30 Days'
                : p === '90d'
                  ? '90 Days'
                  : p === '6m'
                    ? '6 Months'
                    : '12 Months'}
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-950 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-stone-500">Overall Conversion</p>
              <p className="text-2xl font-bold text-stone-100">
                {data.overallConversionRate !== null ? `${data.overallConversionRate}%` : 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="w-10 h-10 rounded-lg bg-brand-950 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-brand-500" />
            </div>
            <div>
              <p className="text-xs text-stone-500">Completed</p>
              <p className="text-2xl font-bold text-stone-100">
                {data.totalCompleted} of {data.totalCreated}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="w-10 h-10 rounded-lg bg-red-950 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-stone-500">Cancelled</p>
              <p className="text-2xl font-bold text-stone-100">{data.totalCancelled}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Bars */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {data.stages.map((stage, index) => {
              const widthPct = Math.max((stage.count / maxCount) * 100, 12)
              const barColor = STAGE_COLORS[stage.key] || 'bg-stone-500'
              const isLast = index === data.stages.length - 1

              return (
                <div key={stage.key}>
                  <div className="flex items-center gap-4 py-2">
                    <div className="w-28 flex-shrink-0 text-right">
                      <p className="text-sm font-medium text-stone-100">{stage.label}</p>
                    </div>
                    <div className="flex-1">
                      <div
                        className={`${barColor} h-9 rounded-lg transition-all flex items-center justify-end pr-3`}
                        style={{ width: `${widthPct}%` }}
                      >
                        <span className="text-sm font-bold text-white">
                          {stage.count.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="w-16 flex-shrink-0 text-right">
                      <p className="text-xs text-stone-500">
                        {stage.conversionFromTop !== null ? `${stage.conversionFromTop}%` : '100%'}
                      </p>
                    </div>
                  </div>

                  {!isLast && (
                    <div className="flex items-center gap-4 py-1">
                      <div className="w-28 flex-shrink-0" />
                      <div className="flex-1 flex items-center gap-2 pl-4">
                        <ArrowDown className="h-4 w-4 text-stone-600" />
                        {stage.conversionFromPrev != null && (
                          <Badge
                            variant={
                              (data.stages[index + 1]?.conversionFromPrev ?? 0) >= 70
                                ? 'success'
                                : (data.stages[index + 1]?.conversionFromPrev ?? 0) >= 40
                                  ? 'warning'
                                  : 'error'
                            }
                          >
                            {data.stages[index + 1]?.conversionFromPrev ?? 0}% pass through
                          </Badge>
                        )}
                        {stage.dropoffFromPrev != null && index > 0 && (
                          <span className="text-xs text-stone-500">
                            ({stage.dropoffFromPrev}% drop-off)
                          </span>
                        )}
                      </div>
                      <div className="w-16 flex-shrink-0" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Cancelled by Stage */}
      {data.cancelledByStage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Where Deals Are Lost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.cancelledByStage.map(({ stage, count }) => {
                const pct =
                  data.totalCancelled > 0 ? Math.round((count / data.totalCancelled) * 100) : 0
                return (
                  <div key={stage} className="flex items-center gap-3">
                    <div className="w-32 text-sm text-stone-300">{stage}</div>
                    <div className="flex-1 bg-stone-800 rounded-full h-5 overflow-hidden">
                      <div
                        className="bg-red-600 h-full rounded-full flex items-center justify-end pr-2"
                        style={{ width: `${Math.max(pct, 8)}%` }}
                      >
                        <span className="text-xs text-white font-medium">{count}</span>
                      </div>
                    </div>
                    <div className="w-12 text-right text-xs text-stone-500">{pct}%</div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

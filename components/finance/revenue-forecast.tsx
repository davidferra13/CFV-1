'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import {
  getRevenueForecast,
  type RevenueForecast,
  type MonthlyForecastEntry,
} from '@/lib/finance/revenue-forecast-actions'
import { STAGE_LABELS } from '@/lib/finance/forecast-calculator'

// -- Bar Chart (CSS-only, no chart library) --

function ForecastBarChart({ data }: { data: MonthlyForecastEntry[] }) {
  if (data.length === 0) return null

  // Find max value for scaling
  const maxValue = Math.max(
    ...data.map((d) => d.bookedRevenueCents + d.pipelineRevenueCents),
    ...data.map((d) => d.historicalAvgCents),
    1 // prevent division by zero
  )

  const monthLabels: Record<string, string> = {
    '01': 'Jan',
    '02': 'Feb',
    '03': 'Mar',
    '04': 'Apr',
    '05': 'May',
    '06': 'Jun',
    '07': 'Jul',
    '08': 'Aug',
    '09': 'Sep',
    '10': 'Oct',
    '11': 'Nov',
    '12': 'Dec',
  }

  function getLabel(month: string): string {
    const parts = month.split('-')
    return monthLabels[parts[1]] || parts[1]
  }

  return (
    <div className="space-y-2">
      {/* Legend */}
      <div className="flex gap-4 text-xs text-stone-400 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-500" />
          <span>Booked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-sm"
            style={{
              background:
                'repeating-linear-gradient(45deg, #6366f1 0px, #6366f1 2px, transparent 2px, transparent 4px)',
            }}
          />
          <span>Pipeline (weighted)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-0.5 border-t-2 border-dotted border-stone-500"
            style={{ width: 12 }}
          />
          <span>Historical Avg</span>
        </div>
      </div>

      {/* Chart */}
      <div className="flex items-end gap-2" style={{ height: 200 }}>
        {data.map((d) => {
          const bookedHeight = (d.bookedRevenueCents / maxValue) * 180
          const pipelineHeight = (d.pipelineRevenueCents / maxValue) * 180
          const historicalHeight = (d.historicalAvgCents / maxValue) * 180
          const totalValue = d.bookedRevenueCents + d.pipelineRevenueCents

          return (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-1 group relative">
              {/* Tooltip on hover */}
              <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 bg-stone-800 border border-stone-600 rounded px-2 py-1 text-xs text-stone-200 whitespace-nowrap shadow-lg">
                <p className="font-medium">{d.month}</p>
                <p>Booked: {formatCurrency(d.bookedRevenueCents)}</p>
                <p>Pipeline: {formatCurrency(d.pipelineRevenueCents)}</p>
                <p className="text-stone-400">Hist. avg: {formatCurrency(d.historicalAvgCents)}</p>
              </div>

              {/* Stacked bar */}
              <div className="w-full relative" style={{ height: 180 }}>
                {/* Historical avg dotted line */}
                {d.historicalAvgCents > 0 && (
                  <div
                    className="absolute w-full border-t-2 border-dotted border-stone-500"
                    style={{ bottom: historicalHeight }}
                  />
                )}

                {/* Pipeline (striped) */}
                {d.pipelineRevenueCents > 0 && (
                  <div
                    className="absolute bottom-0 w-full rounded-t-sm"
                    style={{
                      height: bookedHeight + pipelineHeight,
                      background:
                        'repeating-linear-gradient(45deg, #6366f1 0px, #6366f1 2px, #4f46e5 2px, #4f46e5 4px)',
                    }}
                  />
                )}

                {/* Booked (solid) */}
                {d.bookedRevenueCents > 0 && (
                  <div
                    className="absolute bottom-0 w-full bg-emerald-500 rounded-t-sm"
                    style={{ height: bookedHeight }}
                  />
                )}
              </div>

              {/* Month label */}
              <span className="text-xxs text-stone-500">{getLabel(d.month)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// -- Pipeline Breakdown --

function PipelineBreakdown({ pipelineValue }: { pipelineValue: RevenueForecast['pipelineValue'] }) {
  if (pipelineValue.byStage.length === 0) {
    return <p className="text-sm text-stone-500 italic">No events in pipeline</p>
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-stone-500">Total Pipeline</p>
          <p className="text-lg font-bold text-stone-200">
            {formatCurrency(pipelineValue.totalCents)}
          </p>
        </div>
        <div>
          <p className="text-xs text-stone-500">Weighted Value</p>
          <p className="text-lg font-bold text-brand-400">
            {formatCurrency(pipelineValue.weightedCents)}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {pipelineValue.byStage.map((stage) => (
          <div key={stage.stage} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: `hsl(${Math.round(stage.probability * 120)}, 70%, 50%)`,
                }}
              />
              <span className="text-stone-400">{stage.label}</span>
              <span className="text-xs text-stone-600">
                ({stage.count}) {Math.round(stage.probability * 100)}%
              </span>
            </div>
            <div className="text-right shrink-0 ml-2">
              <span className="font-medium text-stone-200">
                {formatCurrency(stage.weightedCents)}
              </span>
              <span className="text-xs text-stone-500 ml-1">
                / {formatCurrency(stage.totalCents)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// -- Seasonal Pattern --

function SeasonalPatternChart({ pattern }: { pattern: RevenueForecast['seasonalPattern'] }) {
  const maxVal = Math.max(...pattern.map((p) => p.avgRevenueCents), 1)
  const monthNames = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

  return (
    <div className="flex items-end gap-1" style={{ height: 80 }}>
      {pattern.map((p, i) => {
        const height = (p.avgRevenueCents / maxVal) * 60
        return (
          <div key={p.month} className="flex-1 flex flex-col items-center gap-0.5 group relative">
            <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 bg-stone-800 border border-stone-600 rounded px-1.5 py-0.5 text-xxs text-stone-200 whitespace-nowrap">
              {formatCurrency(p.avgRevenueCents)}
            </div>
            <div
              className="w-full bg-brand-500/40 rounded-t-sm"
              style={{ height: Math.max(2, height) }}
            />
            <span className="text-2xs text-stone-600">{monthNames[i]}</span>
          </div>
        )
      })}
    </div>
  )
}

// -- Main Component --

export function RevenueForecastPanel() {
  const [forecast, setForecast] = useState<RevenueForecast | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [forecastMonths, setForecastMonths] = useState(6)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getRevenueForecast(forecastMonths)
      .then((data) => {
        if (!cancelled) setForecast(data)
      })
      .catch((err) => {
        if (!cancelled) setError('Could not load forecast data')
        console.error('[RevenueForecast]', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [forecastMonths])

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-8 text-center text-stone-500">Loading forecast...</CardContent>
        </Card>
      </div>
    )
  }

  if (error || !forecast) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-red-400">
          {error || 'Could not load forecast data'}
        </CardContent>
      </Card>
    )
  }

  const confidenceLabel =
    forecast.dataMonthsAvailable >= 12
      ? 'High confidence'
      : forecast.dataMonthsAvailable >= 6
        ? 'Moderate confidence'
        : forecast.dataMonthsAvailable >= 3
          ? 'Low confidence'
          : 'Very limited data'

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-stone-500">This Month (Actual)</p>
            <p className="text-2xl font-bold text-emerald-400">
              {formatCurrency(forecast.currentMonthActual)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-stone-500">This Month (Projected)</p>
            <p className="text-2xl font-bold text-stone-200">
              {formatCurrency(forecast.currentMonthProjected)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-stone-500">Pipeline (Weighted)</p>
            <p className="text-2xl font-bold text-brand-400">
              {formatCurrency(forecast.pipelineValue.weightedCents)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Chart */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Revenue Forecast</CardTitle>
            <div className="flex items-center gap-2">
              <select
                value={forecastMonths}
                onChange={(e) => setForecastMonths(parseInt(e.target.value, 10))}
                className="text-xs bg-stone-800 border border-stone-600 rounded px-2 py-1 text-stone-300"
              >
                <option value={3}>3 months</option>
                <option value={6}>6 months</option>
                <option value={12}>12 months</option>
              </select>
              <span className="text-xxs text-stone-500 bg-stone-800 rounded px-2 py-0.5">
                {confidenceLabel} ({forecast.dataMonthsAvailable} months of data)
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ForecastBarChart data={forecast.monthlyForecast} />
        </CardContent>
      </Card>

      {/* Pipeline + Seasonal side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <PipelineBreakdown pipelineValue={forecast.pipelineValue} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seasonal Pattern</CardTitle>
          </CardHeader>
          <CardContent>
            {forecast.dataMonthsAvailable >= 3 ? (
              <SeasonalPatternChart pattern={forecast.seasonalPattern} />
            ) : (
              <p className="text-sm text-stone-500 italic">
                Need at least 3 months of data to show seasonal patterns
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quarterly Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Quarterly Outlook</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {(['q1', 'q2', 'q3', 'q4'] as const).map((q, i) => {
              const val = forecast.quarterlyForecast[q]
              return (
                <div key={q} className="text-center">
                  <p className="text-xs text-stone-500 uppercase">Q{i + 1}</p>
                  <p
                    className={`text-lg font-bold ${val > 0 ? 'text-stone-200' : 'text-stone-600'}`}
                  >
                    {formatCurrency(val)}
                  </p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

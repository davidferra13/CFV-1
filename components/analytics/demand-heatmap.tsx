'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, TrendingUp } from '@/components/ui/icons'
import type { SeasonalHeatmap } from '@/lib/analytics/demand-forecast-actions'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DemandDataPoint {
  month: number
  year: number
  predictedCount: number
  actualCount: number
  confidence: number
}

interface DemandHeatmapProps {
  data: SeasonalHeatmap
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

// ─── Component ────────────────────────────────────────────────────────────────

export function DemandHeatmap({ data: heatmapData }: DemandHeatmapProps) {
  // Map SeasonalHeatmap months -> DemandDataPoint[]
  const data: DemandDataPoint[] = heatmapData.months.map((m) => ({
    month: m.month,
    year: m.year,
    predictedCount: m.predictedInquiryCount,
    actualCount: m.actualInquiryCount ?? 0,
    confidence: m.confidence,
  }))
  // Group data by year
  const years = [...new Set(data.map((d) => d.year))].sort()
  const maxCount = Math.max(...data.map((d) => Math.max(d.predictedCount, d.actualCount)), 1)

  function getIntensityClass(count: number): string {
    const ratio = count / maxCount
    if (ratio >= 0.9) return 'bg-brand-700 text-white'
    if (ratio >= 0.75) return 'bg-brand-600 text-white'
    if (ratio >= 0.6) return 'bg-brand-500 text-white'
    if (ratio >= 0.45) return 'bg-brand-400 text-white'
    if (ratio >= 0.3) return 'bg-brand-800 text-stone-100'
    if (ratio >= 0.15) return 'bg-brand-800 text-stone-100'
    if (ratio > 0) return 'bg-brand-900 text-stone-300'
    return 'bg-stone-800 text-stone-300'
  }

  function getDataPoint(year: number, month: number): DemandDataPoint | undefined {
    return data.find((d) => d.year === year && d.month === month)
  }

  // Summary stats
  const totalPredicted = data.reduce((sum, d) => sum + d.predictedCount, 0)
  const totalActual = data.reduce((sum, d) => sum + d.actualCount, 0)
  const avgConfidence =
    data.length > 0
      ? ((data.reduce((sum, d) => sum + d.confidence, 0) / data.length) * 100).toFixed(0)
      : '0'

  return (
    <div className="space-y-6">
      {/* Summary Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Calendar className="h-5 w-5 text-brand-600 flex-shrink-0" />
            <div>
              <p className="text-2xl font-bold text-stone-100">{totalPredicted}</p>
              <p className="text-xs text-stone-500">Total Predicted</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <TrendingUp className="h-5 w-5 text-emerald-500 flex-shrink-0" />
            <div>
              <p className="text-2xl font-bold text-stone-100">{totalActual}</p>
              <p className="text-xs text-stone-500">Total Actual</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="w-5 h-5 rounded-full bg-brand-900 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-brand-600">%</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-100">{avgConfidence}%</p>
              <p className="text-xs text-stone-500">Avg Confidence</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap Grid */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Demand Heatmap</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="info">Predicted</Badge>
            <Badge variant="success">Actual</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <p className="text-sm text-stone-300 italic text-center py-8">
              No demand data available yet.
            </p>
          ) : (
            <div className="space-y-6">
              {/* Month headers */}
              <div className="grid gap-1" style={{ gridTemplateColumns: 'auto repeat(12, 1fr)' }}>
                <div className="text-xs font-medium text-stone-500 text-right pr-2" />
                {MONTH_LABELS.map((m) => (
                  <div key={m} className="text-xs font-medium text-stone-500 text-center">
                    {m}
                  </div>
                ))}
              </div>

              {/* Predicted and actual rows per year */}
              {years.map((year) => (
                <div key={year} className="space-y-1">
                  <p className="text-xs font-semibold text-stone-300 mb-1">{year}</p>

                  {/* Predicted */}
                  <div
                    className="grid gap-1"
                    style={{ gridTemplateColumns: 'auto repeat(12, 1fr)' }}
                  >
                    <div className="text-xs text-stone-300 text-right pr-2 self-center w-10">
                      Pred
                    </div>
                    {MONTH_LABELS.map((_, monthIdx) => {
                      const point = getDataPoint(year, monthIdx + 1)
                      const count = point?.predictedCount ?? 0
                      return (
                        <div
                          key={monthIdx}
                          className={`aspect-square rounded-md flex items-center justify-center text-xs font-medium transition-colors ${getIntensityClass(count)}`}
                          title={`${MONTH_LABELS[monthIdx]} ${year}: ${count} predicted (${point ? (point.confidence * 100).toFixed(0) : 0}% confidence)`}
                        >
                          {count > 0 ? count : ''}
                        </div>
                      )
                    })}
                  </div>

                  {/* Actual */}
                  <div
                    className="grid gap-1"
                    style={{ gridTemplateColumns: 'auto repeat(12, 1fr)' }}
                  >
                    <div className="text-xs text-stone-300 text-right pr-2 self-center w-10">
                      Actual
                    </div>
                    {MONTH_LABELS.map((_, monthIdx) => {
                      const point = getDataPoint(year, monthIdx + 1)
                      const count = point?.actualCount ?? 0
                      return (
                        <div
                          key={monthIdx}
                          className={`aspect-square rounded-md flex items-center justify-center text-xs font-medium transition-colors ${getIntensityClass(count)}`}
                          title={`${MONTH_LABELS[monthIdx]} ${year}: ${count} actual`}
                        >
                          {count > 0 ? count : ''}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* Color scale legend */}
              <div className="flex items-center gap-2 pt-2 border-t border-stone-800">
                <span className="text-xs text-stone-500">Low</span>
                <div className="flex gap-0.5">
                  <div className="w-6 h-4 rounded-sm bg-brand-900" />
                  <div className="w-6 h-4 rounded-sm bg-brand-800" />
                  <div className="w-6 h-4 rounded-sm bg-brand-800" />
                  <div className="w-6 h-4 rounded-sm bg-brand-400" />
                  <div className="w-6 h-4 rounded-sm bg-brand-500" />
                  <div className="w-6 h-4 rounded-sm bg-brand-600" />
                  <div className="w-6 h-4 rounded-sm bg-brand-700" />
                </div>
                <span className="text-xs text-stone-500">High</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

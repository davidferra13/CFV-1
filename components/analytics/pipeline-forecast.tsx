'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PipelineStage {
  status: string
  count: number
  totalCents: number
  weightedCents: number
}

interface PipelineForecastProps {
  pipeline: PipelineStage[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  proposed: 'Proposed',
  accepted: 'Accepted',
  paid: 'Paid',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PipelineForecast({ pipeline }: PipelineForecastProps) {
  // Total weighted forecast
  const totalWeightedCents = pipeline.reduce((sum, s) => sum + s.weightedCents, 0)
  const totalRawCents = pipeline.reduce((sum, s) => sum + s.totalCents, 0)
  const totalCount = pipeline.reduce((sum, s) => sum + s.count, 0)

  // Chart data
  const chartData = pipeline.map((stage) => ({
    name: STATUS_LABELS[stage.status] || stage.status,
    'Raw Revenue': stage.totalCents / 100,
    'Weighted Revenue': stage.weightedCents / 100,
    count: stage.count,
  }))

  const formatDollars = (v: number) => (v ? `$${v.toLocaleString()}` : '$0')

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-950 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-brand-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-stone-500">Weighted Pipeline Forecast</p>
              <p className="text-3xl font-bold text-stone-100">
                ${(totalWeightedCents / 100).toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-stone-500">Raw Pipeline</p>
              <p className="text-lg font-semibold text-stone-300">
                ${(totalRawCents / 100).toFixed(2)}
              </p>
              <p className="text-xs text-stone-300">
                {totalCount} event{totalCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Horizontal Bar Chart */}
      {pipeline.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pipeline by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, pipeline.length * 60)}>
              <ComposedChart
                data={chartData}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={formatDollars}
                  tick={{ fontSize: 11, fill: '#78716c' }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#44403c' }}
                  width={80}
                />
                <Tooltip
                  formatter={
                    ((value: number | undefined, name: string | undefined) => [
                      `${(value ?? 0).toLocaleString()}`,
                      name ?? '',
                    ]) as any
                  }
                />
                <Legend />
                <Bar dataKey="Raw Revenue" fill="#e7e5e4" radius={[0, 4, 4, 0]} barSize={20} />
                <Bar dataKey="Weighted Revenue" fill="#d47530" radius={[0, 4, 4, 0]} barSize={20} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Stage Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Stage Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {pipeline.length === 0 ? (
            <p className="text-sm text-stone-300 italic text-center py-8">
              No events in the pipeline.
            </p>
          ) : (
            <div className="space-y-2">
              {pipeline.map((stage) => {
                const weightPct =
                  stage.totalCents > 0
                    ? ((stage.weightedCents / stage.totalCents) * 100).toFixed(0)
                    : '0'

                return (
                  <div
                    key={stage.status}
                    className="flex items-center gap-3 rounded-lg border border-stone-700 p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-stone-100">
                          {STATUS_LABELS[stage.status] || stage.status}
                        </p>
                        <Badge variant="default">{stage.count}</Badge>
                      </div>
                      {/* Progress bar showing weighted vs raw */}
                      <div className="mt-2 h-2 bg-stone-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full transition-all"
                          style={{
                            width: `${totalRawCents > 0 ? (stage.weightedCents / totalRawCents) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-medium text-stone-100">
                        ${(stage.weightedCents / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-stone-500">
                        {weightPct}% of ${(stage.totalCents / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

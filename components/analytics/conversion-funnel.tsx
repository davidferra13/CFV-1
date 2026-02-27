'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowDown, TrendingUp } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FunnelStage {
  stage: string
  count: number
  conversionRate?: number
}

interface ConversionFunnelProps {
  funnel: FunnelStage[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  Inquiry: 'bg-stone-8000',
  Quote: 'bg-blue-500',
  Booking: 'bg-brand-500',
  Completed: 'bg-emerald-500',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConversionFunnel({ funnel }: ConversionFunnelProps) {
  const maxCount = Math.max(...funnel.map((s) => s.count), 1)
  const firstCount = funnel.length > 0 ? funnel[0].count : 0
  const lastCount = funnel.length > 0 ? funnel[funnel.length - 1].count : 0
  const overallConversion = firstCount > 0 ? ((lastCount / firstCount) * 100).toFixed(1) : '0.0'

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardContent className="flex items-center gap-3 py-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-950 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm text-stone-500">Overall Conversion Rate</p>
            <p className="text-3xl font-bold text-stone-100">{overallConversion}%</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-stone-500">
              {funnel.length > 0 ? funnel[0].stage : ''} to{' '}
              {funnel.length > 0 ? funnel[funnel.length - 1].stage : ''}
            </p>
            <p className="text-sm font-medium text-stone-300">
              {lastCount} of {firstCount}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          {funnel.length === 0 ? (
            <p className="text-sm text-stone-300 italic text-center py-8">
              No funnel data available yet.
            </p>
          ) : (
            <div className="space-y-0">
              {funnel.map((stage, index) => {
                const widthPct = Math.max((stage.count / maxCount) * 100, 15)
                const barColor = STAGE_COLORS[stage.stage] || 'bg-stone-400'
                const isLast = index === funnel.length - 1

                return (
                  <div key={stage.stage}>
                    {/* Stage bar */}
                    <div className="flex items-center gap-4 py-2">
                      {/* Label */}
                      <div className="w-24 flex-shrink-0 text-right">
                        <p className="text-sm font-medium text-stone-100">{stage.stage}</p>
                      </div>

                      {/* Bar */}
                      <div className="flex-1">
                        <div className="relative">
                          <div
                            className={`${barColor} h-10 rounded-lg transition-all flex items-center justify-end pr-3`}
                            style={{ width: `${widthPct}%` }}
                          >
                            <span className="text-sm font-bold text-white">
                              {stage.count.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Percentage of total */}
                      <div className="w-20 flex-shrink-0 text-right">
                        <p className="text-xs text-stone-500">
                          {firstCount > 0
                            ? `${((stage.count / firstCount) * 100).toFixed(1)}%`
                            : '0%'}
                        </p>
                      </div>
                    </div>

                    {/* Conversion rate between stages */}
                    {!isLast && (
                      <div className="flex items-center gap-4 py-1">
                        <div className="w-24 flex-shrink-0" />
                        <div className="flex-1 flex items-center gap-2 pl-4">
                          <ArrowDown className="h-4 w-4 text-stone-300" />
                          {stage.conversionRate != null ? (
                            <Badge
                              variant={
                                stage.conversionRate >= 0.5
                                  ? 'success'
                                  : stage.conversionRate >= 0.25
                                    ? 'warning'
                                    : 'error'
                              }
                            >
                              {(stage.conversionRate * 100).toFixed(1)}% conversion
                            </Badge>
                          ) : (
                            (() => {
                              const nextStage = funnel[index + 1]
                              const calcRate =
                                stage.count > 0
                                  ? ((nextStage.count / stage.count) * 100).toFixed(1)
                                  : '0.0'
                              const calcRateNum = parseFloat(calcRate)
                              return (
                                <Badge
                                  variant={
                                    calcRateNum >= 50
                                      ? 'success'
                                      : calcRateNum >= 25
                                        ? 'warning'
                                        : 'error'
                                  }
                                >
                                  {calcRate}% conversion
                                </Badge>
                              )
                            })()
                          )}
                        </div>
                        <div className="w-20 flex-shrink-0" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stage Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Stage Details</CardTitle>
        </CardHeader>
        <CardContent>
          {funnel.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-700">
                    <th className="text-left py-2 px-3 font-medium text-stone-300">Stage</th>
                    <th className="text-right py-2 px-3 font-medium text-stone-300">Count</th>
                    <th className="text-right py-2 px-3 font-medium text-stone-300">% of Total</th>
                    <th className="text-right py-2 px-3 font-medium text-stone-300">Drop-off</th>
                    <th className="text-right py-2 px-3 font-medium text-stone-300">
                      Stage Conversion
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {funnel.map((stage, index) => {
                    const pctOfTotal =
                      firstCount > 0 ? ((stage.count / firstCount) * 100).toFixed(1) : '0.0'
                    const prevCount = index > 0 ? funnel[index - 1].count : stage.count
                    const dropoff = prevCount - stage.count
                    const stageConversion =
                      prevCount > 0 ? ((stage.count / prevCount) * 100).toFixed(1) : '100.0'

                    return (
                      <tr
                        key={stage.stage}
                        className="border-b border-stone-800 hover:bg-stone-800"
                      >
                        <td className="py-2 px-3 font-medium text-stone-100">{stage.stage}</td>
                        <td className="py-2 px-3 text-right text-stone-300">
                          {stage.count.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right text-stone-300">{pctOfTotal}%</td>
                        <td className="py-2 px-3 text-right text-stone-300">
                          {index === 0 ? '--' : `-${dropoff.toLocaleString()}`}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {index === 0 ? (
                            <span className="text-stone-300">--</span>
                          ) : (
                            <span
                              className={`font-medium ${
                                parseFloat(stageConversion) >= 50
                                  ? 'text-emerald-600'
                                  : parseFloat(stageConversion) >= 25
                                    ? 'text-amber-600'
                                    : 'text-red-600'
                              }`}
                            >
                              {stageConversion}%
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

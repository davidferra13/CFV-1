'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PIPELINE_STAGE_LABELS, PIPELINE_STAGE_COLORS } from '@/lib/prospecting/constants'
import type { PipelineStage } from '@/lib/prospecting/constants'
import { BarChart3 } from 'lucide-react'

interface FunnelStage {
  stage: string
  count: number
  avgDaysInStage: number | null
}

interface ConversionFunnelPanelProps {
  stages: FunnelStage[]
  totalProspects: number
}

export function ConversionFunnelPanel({ stages, totalProspects }: ConversionFunnelPanelProps) {
  if (totalProspects === 0) return null

  const maxCount = Math.max(...stages.map((s) => s.count), 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-brand-500" />
          Pipeline Conversion Funnel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {stages.map((s) => {
            const pct = totalProspects > 0 ? Math.round((s.count / totalProspects) * 100) : 0
            const barWidth = maxCount > 0 ? Math.max((s.count / maxCount) * 100, 2) : 2
            const colors =
              PIPELINE_STAGE_COLORS[s.stage as PipelineStage] ||
              'bg-stone-800 text-stone-400 border-stone-700'
            const label = PIPELINE_STAGE_LABELS[s.stage as PipelineStage] || s.stage

            return (
              <div key={s.stage} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className={`rounded-full px-2 py-0.5 font-medium border ${colors}`}>
                    {label}
                  </span>
                  <span className="text-stone-400">
                    {s.count} ({pct}%)
                    {s.avgDaysInStage !== null && (
                      <span className="text-stone-500 ml-1">· avg {s.avgDaysInStage}d</span>
                    )}
                  </span>
                </div>
                <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full transition-all"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary stats */}
        <div className="mt-4 pt-3 border-t border-stone-800 grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-lg font-bold text-stone-100">{totalProspects}</div>
            <p className="text-xs text-stone-500">total</p>
          </div>
          <div>
            <div className="text-lg font-bold text-stone-100">
              {stages.find((s) => s.stage === 'converted')?.count ?? 0}
            </div>
            <p className="text-xs text-stone-500">converted</p>
          </div>
          <div>
            <div className="text-lg font-bold text-stone-100">
              {totalProspects > 0
                ? Math.round(
                    ((stages.find((s) => s.stage === 'converted')?.count ?? 0) / totalProspects) *
                      100
                  )
                : 0}
              %
            </div>
            <p className="text-xs text-stone-500">win rate</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

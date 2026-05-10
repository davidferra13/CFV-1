'use client'

import type { PipelineStageData, PipelineConversion, PipelineStageName } from './pipeline-types'

const stageColors: Record<PipelineStageName, string> = {
  leads: 'bg-blue-600',
  quoted: 'bg-indigo-600',
  proposals: 'bg-purple-600',
  contracts: 'bg-amber-600',
  events: 'bg-emerald-600',
}

function formatDollars(cents: number): string {
  return `$${(cents / 100).toLocaleString()}`
}

interface PipelineFunnelChartProps {
  stages: PipelineStageData[]
  conversions: PipelineConversion[]
}

export function PipelineFunnelChart({ stages, conversions }: PipelineFunnelChartProps) {
  const maxCount = Math.max(...stages.map((s) => s.count), 1)

  function scrollToStage(stage: PipelineStageName) {
    const el = document.getElementById(`pipeline-stage-${stage}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Build a lookup for conversion rates between consecutive stages
  function getConversionRate(from: string, to: string): number | null {
    const conv = conversions.find((c) => c.from === from && c.to === to)
    return conv ? conv.rate : null
  }

  return (
    <div className="space-y-1">
      {stages.map((stage, idx) => {
        const widthPercent = Math.max((stage.count / maxCount) * 100, 12)
        const isEmpty = stage.count === 0
        const nextStage = stages[idx + 1]
        const convRate = nextStage ? getConversionRate(stage.stage, nextStage.stage) : null

        return (
          <div key={stage.stage}>
            {/* Stage bar */}
            <button
              type="button"
              onClick={() => scrollToStage(stage.stage)}
              className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg"
            >
              <div
                className={`${stageColors[stage.stage]} rounded-lg px-4 py-3 transition-all duration-200 hover:brightness-110 cursor-pointer ${isEmpty ? 'opacity-40' : ''}`}
                style={{ width: `${widthPercent}%`, minWidth: '120px' }}
              >
                <div className="flex items-center justify-between text-white text-sm font-medium">
                  <span>{stage.label}</span>
                  <span className="tabular-nums">
                    {stage.count} · {formatDollars(stage.valueCents)}
                  </span>
                </div>
              </div>
            </button>

            {/* Conversion rate indicator between stages */}
            {convRate !== null && (
              <div className="flex items-center gap-2 pl-4 py-0.5">
                <span className="text-xs text-stone-500">{Math.round(convRate * 100)}% →</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

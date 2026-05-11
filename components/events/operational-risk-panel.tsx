'use client'

import { Card } from '@/components/ui/card'
import type { RiskAssessmentResult, RiskLevel } from '@/lib/costing/operational-risk'

type OperationalRiskPanelProps = {
  data: RiskAssessmentResult | null
}

const LEVEL_COLORS: Record<RiskLevel, { bar: string; badge: string; text: string }> = {
  low: {
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-950 text-emerald-400 ring-emerald-800',
    text: 'text-emerald-400',
  },
  moderate: {
    bar: 'bg-amber-500',
    badge: 'bg-amber-950 text-amber-400 ring-amber-800',
    text: 'text-amber-400',
  },
  high: {
    bar: 'bg-orange-500',
    badge: 'bg-orange-950 text-orange-400 ring-orange-800',
    text: 'text-orange-400',
  },
  critical: {
    bar: 'bg-red-500',
    badge: 'bg-red-950 text-red-400 ring-red-800',
    text: 'text-red-400',
  },
}

const DIMENSION_LABELS: Record<string, string> = {
  scale: 'Scale',
  technique: 'Technique',
  ingredient: 'Ingredient',
  timing: 'Timing',
  venue: 'Venue',
  dietary: 'Dietary',
  delegation: 'Delegation',
  client: 'Client',
}

export function OperationalRiskPanel({ data }: OperationalRiskPanelProps) {
  if (!data) return null

  const colors = LEVEL_COLORS[data.overallLevel]

  return (
    <Card className="p-4 bg-stone-900 border-stone-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-stone-100">Operational Risk</h3>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${colors.badge}`}
        >
          {data.overallScore}/100
        </span>
      </div>

      {/* Dimension Bars */}
      <div className="space-y-2 mb-4">
        {data.factors.map((factor) => {
          const barColor = LEVEL_COLORS[factor.level]
          return (
            <div key={factor.dimension} className="flex items-center gap-2">
              <span className="text-xs text-stone-400 w-20 shrink-0">
                {DIMENSION_LABELS[factor.dimension] ?? factor.dimension}
              </span>
              <div className="flex-1 h-2 bg-stone-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor.bar}`}
                  style={{ width: `${factor.score}%` }}
                />
              </div>
              <span className="text-xs text-stone-500 w-6 text-right">{factor.score}</span>
            </div>
          )
        })}
      </div>

      {/* Top Risks */}
      {data.topRisks.length > 0 && (
        <div className="border-t border-stone-700 pt-3 mb-3 space-y-2">
          {data.topRisks.map((risk) => {
            const riskColor = LEVEL_COLORS[risk.level]
            return (
              <div key={risk.dimension} className="text-xs">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`font-medium ${riskColor.text}`}>{risk.label}</span>
                </div>
                <p className="text-stone-400 leading-relaxed">{risk.reasoning}</p>
                {risk.mitigations.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-stone-500">
                    {risk.mitigations.map((m, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-stone-600 mt-0.5">&#x2022;</span>
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Confidence */}
      <p className="text-[10px] text-stone-500">
        Assessment confidence: {data.confidenceInAssessment}%
      </p>
    </Card>
  )
}

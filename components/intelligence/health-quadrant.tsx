'use client'

import { useState } from 'react'
import type { QuadrantDetail } from '@/lib/intelligence/business-health-actions'
import { ChevronDown, TrendUp, TrendDown, Minus } from '@/components/ui/icons'

const COLOR_MAP = {
  emerald: {
    bar: 'bg-emerald-500',
    bg: 'bg-emerald-950/20',
    border: 'border-emerald-800/40',
    text: 'text-emerald-400',
  },
  amber: {
    bar: 'bg-amber-500',
    bg: 'bg-amber-950/20',
    border: 'border-amber-800/40',
    text: 'text-amber-400',
  },
  red: {
    bar: 'bg-red-500',
    bg: 'bg-red-950/20',
    border: 'border-red-800/40',
    text: 'text-red-400',
  },
} as const

const IMPACT_ICONS = {
  positive: { Icon: TrendUp, color: 'text-emerald-400' },
  neutral: { Icon: Minus, color: 'text-stone-500' },
  negative: { Icon: TrendDown, color: 'text-red-400' },
}

export function HealthQuadrant({ quadrant }: { quadrant: QuadrantDetail }) {
  const [expanded, setExpanded] = useState(false)
  const colors = COLOR_MAP[quadrant.color as keyof typeof COLOR_MAP] || COLOR_MAP.amber

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full px-4 py-3.5 flex items-center gap-3 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-stone-200">{quadrant.label}</span>
            <span className={`text-lg font-bold tabular-nums ${colors.text}`}>
              {quadrant.score}
            </span>
          </div>
          <div className="mt-2 h-1.5 bg-stone-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${colors.bar} transition-all duration-500`}
              style={{ width: `${Math.max(2, quadrant.score)}%` }}
            />
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-stone-500 shrink-0 transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {expanded && quadrant.factors.length > 0 && (
        <div className="px-4 pb-3.5 space-y-2 border-t border-stone-800/50">
          {quadrant.factors.map((factor, i) => {
            const impact = IMPACT_ICONS[factor.impact]
            return (
              <div key={i} className="flex items-center justify-between gap-2 py-1.5">
                <div className="flex items-center gap-2">
                  <impact.Icon className={`h-3.5 w-3.5 ${impact.color}`} />
                  <span className="text-xs text-stone-400">{factor.label}</span>
                </div>
                <span className="text-xs text-stone-300 font-medium tabular-nums">
                  {factor.value}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

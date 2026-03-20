'use client'

import { useState } from 'react'
import type { EventRiskResult, RiskLevel } from '@/lib/formulas/event-risk-score'

// ── Style maps ───────────────────────────────────────────────────────────────

const LEVEL_STYLES: Record<RiskLevel, { bg: string; text: string; ring: string; dot: string }> = {
  low: {
    bg: 'bg-emerald-950',
    text: 'text-emerald-400',
    ring: 'ring-emerald-800',
    dot: 'bg-emerald-400',
  },
  moderate: {
    bg: 'bg-amber-950',
    text: 'text-amber-400',
    ring: 'ring-amber-800',
    dot: 'bg-amber-400',
  },
  high: {
    bg: 'bg-orange-950',
    text: 'text-orange-400',
    ring: 'ring-orange-800',
    dot: 'bg-orange-400',
  },
  critical: {
    bg: 'bg-red-950',
    text: 'text-red-400',
    ring: 'ring-red-800',
    dot: 'bg-red-400',
  },
}

const LEVEL_LABELS: Record<RiskLevel, string> = {
  low: 'Low Risk',
  moderate: 'Moderate Risk',
  high: 'High Risk',
  critical: 'Critical Risk',
}

// ── Component ────────────────────────────────────────────────────────────────

type EventRiskBadgeProps = {
  result: EventRiskResult
  /** Show expandable factor breakdown on click. Defaults to true. */
  expandable?: boolean
  /** Additional CSS classes for the badge container */
  className?: string
}

export function EventRiskBadge({ result, expandable = true, className = '' }: EventRiskBadgeProps) {
  const [expanded, setExpanded] = useState(false)
  const style = LEVEL_STYLES[result.level]
  const label = LEVEL_LABELS[result.level]

  return (
    <div className={`inline-block relative ${className}`}>
      <button
        type="button"
        onClick={expandable ? () => setExpanded(!expanded) : undefined}
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium
          ring-1 ring-inset ${style.bg} ${style.text} ${style.ring}
          ${expandable ? 'cursor-pointer hover:brightness-110 transition-all' : 'cursor-default'}
        `}
        title={`Risk score: ${result.score}/100`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        {label}
        <span className="opacity-60">{result.score}</span>
        {expandable && result.factors.length > 0 && (
          <svg
            className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {expanded && result.factors.length > 0 && (
        <div
          className={`
            absolute z-50 top-full left-0 mt-1 w-72 rounded-lg border
            border-stone-700 bg-stone-900 shadow-xl p-3
          `}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold ${style.text}`}>
              Risk Breakdown
            </span>
            <span className="text-xs text-stone-500">
              {result.score}/100
            </span>
          </div>
          <div className="space-y-1.5">
            {result.factors.map((factor) => (
              <div key={factor.name} className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-stone-300 truncate">
                      {factor.name}
                    </span>
                    <span className="text-xs text-stone-500 ml-2 shrink-0">
                      +{factor.impact}
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-500 truncate">
                    {factor.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {/* Score bar */}
          <div className="mt-3 pt-2 border-t border-stone-700">
            <div className="h-1.5 w-full bg-stone-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${style.dot.replace('bg-', 'bg-')}`}
                style={{ width: `${result.score}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

// DietaryComplexityBadge - Shows the dietary complexity score (0-100)
// with color coding and expandable breakdown on click.
// Green (low), Yellow (moderate), Orange (high), Red (critical).

import { useState } from 'react'
import type { ComplexityLevel, DietaryComplexityResult } from '@/lib/formulas/dietary-complexity'

const LEVEL_CONFIG: Record<
  ComplexityLevel,
  { label: string; badgeClass: string; barClass: string }
> = {
  low: {
    label: 'Low',
    badgeClass: 'bg-emerald-900/50 text-emerald-400 border-emerald-700',
    barClass: 'bg-emerald-500',
  },
  moderate: {
    label: 'Moderate',
    badgeClass: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
    barClass: 'bg-yellow-500',
  },
  high: {
    label: 'High',
    badgeClass: 'bg-orange-900/50 text-orange-400 border-orange-700',
    barClass: 'bg-orange-500',
  },
  critical: {
    label: 'Critical',
    badgeClass: 'bg-red-900/50 text-red-400 border-red-700',
    barClass: 'bg-red-500',
  },
}

interface DietaryComplexityBadgeProps {
  result: DietaryComplexityResult
  className?: string
  /** If true, show only the badge without click-to-expand */
  compact?: boolean
}

export function DietaryComplexityBadge({
  result,
  className = '',
  compact = false,
}: DietaryComplexityBadgeProps) {
  const [expanded, setExpanded] = useState(false)
  const config = LEVEL_CONFIG[result.level]

  // Don't render anything for score 0
  if (result.score === 0 && result.breakdown.length === 0) return null

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => !compact && setExpanded(!expanded)}
        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${config.badgeClass} ${
          compact ? 'cursor-default' : 'cursor-pointer hover:opacity-80'
        } transition-opacity`}
        title={`Dietary complexity: ${result.score}/100 (${config.label})`}
      >
        <span>{result.score}</span>
        <span className="opacity-70">{config.label}</span>
      </button>

      {expanded && !compact && (
        <div className="absolute z-50 top-full left-0 mt-1 w-64 rounded-lg border border-stone-700 bg-stone-900 shadow-xl p-3 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-stone-300">Dietary Complexity</span>
            <span className={`font-bold ${config.badgeClass.split(' ')[1]}`}>
              {result.score}/100
            </span>
          </div>

          {/* Score bar */}
          <div className="w-full h-1.5 bg-stone-800 rounded-full mb-3">
            <div
              className={`h-full rounded-full ${config.barClass} transition-all`}
              style={{ width: `${result.score}%` }}
            />
          </div>

          {/* Breakdown */}
          <div className="space-y-1.5">
            {result.breakdown.map((b) => (
              <div key={b.factor} className="flex items-center justify-between gap-2">
                <span className="text-stone-400 truncate">{b.factor}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-12 h-1 bg-stone-800 rounded-full">
                    <div
                      className={`h-full rounded-full ${config.barClass} opacity-60`}
                      style={{ width: `${b.value}%` }}
                    />
                  </div>
                  <span className="text-stone-500 w-6 text-right">{b.value}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 pt-2 border-t border-stone-800 text-[10px] text-stone-500">
            Weight-based score across {result.breakdown.length} factors
          </div>
        </div>
      )}

      {/* Click-away overlay to close expanded view */}
      {expanded && !compact && (
        <div className="fixed inset-0 z-40" onClick={() => setExpanded(false)} />
      )}
    </div>
  )
}

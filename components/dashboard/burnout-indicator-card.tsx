'use client'

// BurnoutIndicatorCard — Wellbeing Check dashboard widget
// Displays the chef's current workload health as a private, non-judgmental signal.
// Labeled "Wellbeing Check" (not "burnout") to reduce stigma.
// Only the chef ever sees this — it is never exposed to clients or staff.

import type { BurnoutLevel } from '@/lib/wellbeing/burnout-score'

interface Props {
  level: BurnoutLevel
  suggestion: string
}

const LEVEL_CONFIG: Record<
  BurnoutLevel,
  { label: string; dotClass: string; borderClass: string; bgClass: string; textClass: string }
> = {
  low: {
    label: 'Sustainable',
    dotClass: 'bg-green-500',
    borderClass: 'border-green-200',
    bgClass: 'bg-green-50/60',
    textClass: 'text-green-800',
  },
  moderate: {
    label: 'Accumulating',
    dotClass: 'bg-amber-400',
    borderClass: 'border-amber-200',
    bgClass: 'bg-amber-50/60',
    textClass: 'text-amber-800',
  },
  high: {
    label: 'High Load',
    dotClass: 'bg-red-500',
    borderClass: 'border-red-200',
    bgClass: 'bg-red-50/60',
    textClass: 'text-red-800',
  },
}

export function BurnoutIndicatorCard({ level, suggestion }: Props) {
  const config = LEVEL_CONFIG[level]

  return (
    <div className={`rounded-xl border p-4 ${config.borderClass} ${config.bgClass}`}>
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full flex-shrink-0 ${config.dotClass}`}
          aria-hidden="true"
        />
        <h3 className="text-sm font-semibold text-stone-800">Wellbeing Check</h3>
        <span
          className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${config.bgClass} ${config.textClass} border ${config.borderClass}`}
        >
          {config.label}
        </span>
      </div>

      <p className="text-sm text-stone-700 leading-snug">{suggestion}</p>

      <p className="mt-2 text-xs text-stone-400 italic">Private — only you see this</p>
    </div>
  )
}

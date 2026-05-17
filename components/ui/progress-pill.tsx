// ProgressPill - Compact inline progress indicator.
// Shows "X/Y label" with a thin bar. Use for multi-step completion tracking.
'use client'

interface ProgressPillProps {
  current: number
  total: number
  label?: string
  className?: string
}

export function ProgressPill({ current, total, label, className = '' }: ProgressPillProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  const color =
    pct === 100
      ? 'bg-emerald-500'
      : pct >= 50
        ? 'bg-brand-500'
        : pct > 0
          ? 'bg-amber-500'
          : 'bg-stone-600'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-stone-700 bg-stone-800/80 px-2.5 py-0.5 text-xs font-medium tabular-nums text-stone-300 ${className}`}
    >
      <span className="relative h-1 w-10 overflow-hidden rounded-full bg-stone-700">
        <span
          className={`absolute inset-y-0 left-0 rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span>
        {current}/{total}
      </span>
      {label && <span className="text-stone-500">{label}</span>}
    </span>
  )
}

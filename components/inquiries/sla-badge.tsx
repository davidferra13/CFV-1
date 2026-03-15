'use client'

interface SLABadgeProps {
  targetHours: number
  elapsedHours: number
  percentUsed: number
  breached: boolean
  compact?: boolean
}

export function SLABadge({
  targetHours,
  elapsedHours,
  percentUsed,
  breached,
  compact = false,
}: SLABadgeProps) {
  const formatted = elapsedHours.toFixed(1)
  const tooltip = breached
    ? `SLA breached: ${formatted}h elapsed (target: ${targetHours}h)`
    : `${formatted}h of ${targetHours}h SLA used (${Math.round(percentUsed)}%)`

  const colorClass =
    percentUsed > 100 ? 'bg-red-500' : percentUsed > 50 ? 'bg-amber-500' : 'bg-emerald-500'

  if (compact) {
    return <span className={`inline-block w-2 h-2 rounded-full ${colorClass}`} title={tooltip} />
  }

  const textColorClass =
    percentUsed > 100 ? 'text-red-400' : percentUsed > 50 ? 'text-amber-400' : 'text-emerald-400'

  return (
    <span className={`inline-flex items-center gap-1 text-xs ${textColorClass}`} title={tooltip}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${colorClass}`} />
      {formatted}h / {targetHours}h{breached ? ' SLA' : ''}
    </span>
  )
}

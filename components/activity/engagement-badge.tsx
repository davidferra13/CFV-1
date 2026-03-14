// EngagementBadge — Small intent badge for surfacing client engagement level.
// Shows HOT / WARM / COLD based on recent portal activity score.
// Renders nothing when level is 'none'.

import type { EngagementLevel } from '@/lib/activity/engagement'

const CONFIG: Record<Exclude<EngagementLevel, 'none'>, { label: string; className: string }> = {
  hot: { label: 'HOT', className: 'bg-red-900 text-red-700 border-red-200' },
  warm: { label: 'WARM', className: 'bg-amber-900 text-amber-700 border-amber-200' },
  cold: { label: 'COLD', className: 'bg-stone-800 text-stone-500 border-stone-700' },
}

interface EngagementBadgeProps {
  level: EngagementLevel
  signals?: string[]
  className?: string
}

export function EngagementBadge({ level, signals, className = '' }: EngagementBadgeProps) {
  if (level === 'none') return null

  const { label, className: badgeClass } = CONFIG[level]
  const tooltip = signals && signals.length > 0 ? signals.join(' · ') : undefined

  return (
    <span
      title={tooltip}
      className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded border ${badgeClass} ${className}`}
    >
      {label}
    </span>
  )
}

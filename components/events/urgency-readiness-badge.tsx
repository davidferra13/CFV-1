type UrgencyReadinessBadgeProps = {
  daysAway: number
  readinessScore: number
}

export function UrgencyReadinessBadge({ daysAway, readinessScore }: UrgencyReadinessBadgeProps) {
  if (daysAway <= 2 && readinessScore < 66) {
    return (
      <span
        role="status"
        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30"
      >
        Not ready
      </span>
    )
  }

  if (daysAway <= 7 && readinessScore < 33) {
    return (
      <span
        role="status"
        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-600/30 text-stone-400 border border-stone-600/40"
      >
        Needs attention
      </span>
    )
  }

  return null
}

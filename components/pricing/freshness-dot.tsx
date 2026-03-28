'use client'

interface FreshnessDotProps {
  date: string | null
  showLabel?: boolean
}

function getAge(dateStr: string | null): { color: string; label: string } {
  if (!dateStr) return { color: 'bg-stone-600', label: 'Unknown' }

  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const days = (now - then) / (1000 * 60 * 60 * 24)

  if (days < 7) return { color: 'bg-emerald-500', label: 'Fresh' }
  if (days < 30) return { color: 'bg-amber-500', label: 'Aging' }
  return { color: 'bg-red-500', label: 'Stale' }
}

export function FreshnessDot({ date, showLabel }: FreshnessDotProps) {
  const { color, label } = getAge(date)

  return (
    <span className="inline-flex items-center gap-1" title={label}>
      <span className={`w-1.5 h-1.5 rounded-full inline-block ${color}`} />
      {showLabel && <span className="text-xs text-stone-400">{label}</span>}
    </span>
  )
}

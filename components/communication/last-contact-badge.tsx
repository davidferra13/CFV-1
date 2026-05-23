import { formatDistanceToNow } from 'date-fns'

interface LastContactBadgeProps {
  lastContactAt: string | null
  daysSinceContact: number | null
  compact?: boolean
}

function getRecencyColor(days: number | null): {
  bg: string
  text: string
  ring: string
} {
  if (days === null) {
    return { bg: 'bg-stone-800', text: 'text-stone-500', ring: 'ring-stone-700' }
  }
  if (days <= 7) {
    return { bg: 'bg-emerald-950', text: 'text-emerald-500', ring: 'ring-emerald-800' }
  }
  if (days <= 30) {
    return { bg: 'bg-amber-950', text: 'text-amber-500', ring: 'ring-amber-800' }
  }
  return { bg: 'bg-red-950', text: 'text-red-500', ring: 'ring-red-800' }
}

function getRecencyLabel(lastContactAt: string | null, days: number | null): string {
  if (!lastContactAt || days === null) {
    return 'No contact'
  }
  return formatDistanceToNow(new Date(lastContactAt), { addSuffix: true })
}

export function LastContactBadge({
  lastContactAt,
  daysSinceContact,
  compact = false,
}: LastContactBadgeProps) {
  const colors = getRecencyColor(daysSinceContact)
  const label = getRecencyLabel(lastContactAt, daysSinceContact)

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${colors.bg} ${colors.text} ${colors.ring}`}
        title={lastContactAt ? `Last contact: ${new Date(lastContactAt).toLocaleString()}` : 'No contact recorded'}
      >
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${
            daysSinceContact === null
              ? 'bg-stone-500'
              : daysSinceContact <= 7
                ? 'bg-emerald-500'
                : daysSinceContact <= 30
                  ? 'bg-amber-500'
                  : 'bg-red-500'
          }`}
        />
        {label}
      </span>
    )
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm ring-1 ${colors.bg} ${colors.text} ${colors.ring}`}
      title={lastContactAt ? `Last contact: ${new Date(lastContactAt).toLocaleString()}` : 'No contact recorded'}
    >
      <span
        className={`inline-block w-2 h-2 rounded-full ${
          daysSinceContact === null
            ? 'bg-stone-500'
            : daysSinceContact <= 7
              ? 'bg-emerald-500'
              : daysSinceContact <= 30
                ? 'bg-amber-500'
                : 'bg-red-500'
        }`}
      />
      <span className="font-medium">
        {daysSinceContact !== null && daysSinceContact > 30 ? 'Going cold: ' : ''}
        {label}
      </span>
    </div>
  )
}
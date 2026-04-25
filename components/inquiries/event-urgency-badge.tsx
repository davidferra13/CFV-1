import type { EventUrgency } from '@/lib/inquiries/event-urgency'

const URGENCY_BADGE_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 border-red-300 animate-pulse',
  high: 'bg-amber-100 text-amber-800 border-amber-300',
  normal: 'bg-blue-50 text-blue-700 border-blue-200',
}

/**
 * Displays event-date urgency as a small inline badge.
 * Only renders when urgency level is critical, high, or normal.
 * Returns null for 'none' level (no date or far away).
 */
export function EventUrgencyBadge({ urgency }: { urgency: EventUrgency }) {
  if (urgency.level === 'none') return null

  const style = URGENCY_BADGE_STYLES[urgency.level] ?? ''

  return (
    <span
      className={`inline-flex items-center rounded-full border px-1.5 py-0 text-xxs font-semibold ${style}`}
      title={urgency.daysUntil !== null ? `Event is ${urgency.daysUntil} day(s) away` : undefined}
    >
      {urgency.label}
    </span>
  )
}

import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'

type ReturningClientBadgeProps = {
  previousEvents: number
  lastEventDate: string | null
  isLapsed: boolean
  lapsedMonths: number | null
  confidence: 'confirmed' | 'likely' | 'possible'
}

/**
 * Gold "Returning Client" badge for inquiry list rows.
 * Shows event count, recency, and lapsed indicator.
 * Confidence levels:
 *   - confirmed: solid gold (email/phone match)
 *   - likely: gold outline (name+address match)
 *   - possible: subtle hint
 */
export function ReturningClientBadge({
  previousEvents,
  lastEventDate,
  isLapsed,
  lapsedMonths,
  confidence,
}: ReturningClientBadgeProps) {
  if (previousEvents < 1) return null

  const lastDateLabel = lastEventDate
    ? formatDistanceToNow(new Date(lastEventDate), { addSuffix: true })
    : null

  const eventLabel = `${previousEvents} ${previousEvents === 1 ? 'event' : 'events'}`

  if (confidence === 'possible') {
    return (
      <Badge
        className="border border-stone-600/40 bg-stone-800/60 text-stone-400"
        variant="default"
      >
        Possible return ({eventLabel})
      </Badge>
    )
  }

  const isConfirmed = confidence === 'confirmed'

  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge
        className={
          isConfirmed
            ? 'border border-amber-500/50 bg-amber-950/70 text-amber-300'
            : 'border border-amber-600/30 bg-amber-950/40 text-amber-400'
        }
        variant="warning"
      >
        Returning Client
      </Badge>
      <span className="text-xs text-stone-400">
        {eventLabel}
        {lastDateLabel ? `, last ${lastDateLabel}` : ''}
      </span>
      {isLapsed && lapsedMonths != null && (
        <Badge
          className="border border-orange-600/40 bg-orange-950/50 text-orange-400"
          variant="warning"
        >
          Lapsed ({lapsedMonths}mo)
        </Badge>
      )}
    </span>
  )
}

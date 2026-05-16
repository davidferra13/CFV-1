import { Badge } from '@/components/ui/badge'

type RepeatClientBadgeProps = {
  eventCount: number
}

/**
 * Gold "Repeat Client" badge with event history count.
 * Shows on inquiry cards in chef dashboard when client has prior completed events.
 */
export function RepeatClientBadge({ eventCount }: RepeatClientBadgeProps) {
  if (eventCount < 1) return null

  return (
    <Badge className="border border-amber-600/40 bg-amber-950/60 text-amber-300" variant="warning">
      Repeat Client ({eventCount} {eventCount === 1 ? 'event' : 'events'})
    </Badge>
  )
}

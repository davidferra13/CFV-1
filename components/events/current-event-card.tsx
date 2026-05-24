import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CalendarDays, MapPin, User, ExternalLink } from 'lucide-react'
import { format, parseISO, isToday, isTomorrow, differenceInCalendarDays } from 'date-fns'
import type { ChefPortalEvent } from '@/lib/events/current-events'
import type { EventReadiness } from '@/lib/events/event-readiness'

const sourceBadgeColors: Record<string, string> = {
  chef_event: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  farmers_market: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  calendar_entry: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
}

function formatEventDate(dateStr: string): string {
  const date = parseISO(dateStr)
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  return format(date, 'EEE, MMM d')
}

/** Compute urgency tier based on how soon the event is */
function getUrgencyBorder(dateStr: string): string {
  const daysAway = differenceInCalendarDays(parseISO(dateStr), new Date())
  if (daysAway <= 0) return 'border-l-2 border-l-amber-500'
  if (daysAway === 1) return 'border-l-2 border-l-sky-500'
  if (daysAway <= 6) return 'border-l-2 border-l-stone-600'
  return ''
}

/** Readiness dot row: menu, contract, deposit */
function ReadinessDots({ readiness }: { readiness: EventReadiness }) {
  const items = [
    { label: 'Menu', done: readiness.hasMenu },
    { label: 'Contract', done: readiness.hasContract },
    { label: 'Deposit', done: readiness.hasDeposit },
  ]
  return (
    <div className="flex items-center gap-2 pt-1">
      {items.map((item) => (
        <span
          key={item.label}
          title={item.label}
          className={`h-2 w-2 rounded-full ${item.done ? 'bg-emerald-500' : 'bg-stone-700'}`}
        />
      ))}
    </div>
  )
}

export function CurrentEventCard({
  event,
  readiness,
}: {
  event: ChefPortalEvent
  readiness?: EventReadiness
}) {
  const badgeClass =
    sourceBadgeColors[event.sourceType] ?? 'bg-stone-500/20 text-stone-400 border-stone-500/30'
  const urgencyBorder = getUrgencyBorder(event.startsAt)
  const eventDate = parseISO(event.startsAt)
  const isEventToday = isToday(eventDate)

  const content = (
    <Card
      className={`bg-stone-900/60 border-stone-700/50 hover:border-stone-600/70 transition-colors ${urgencyBorder}`}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-stone-100 line-clamp-1">{event.title}</h3>
            {isEventToday && (
              <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                TODAY
              </span>
            )}
          </div>
          <Badge className={`shrink-0 text-[11px] ${badgeClass}`}>{event.sourceLabel}</Badge>
        </div>

        {event.description && (
          <p className="text-xs text-stone-400 line-clamp-2">{event.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {formatEventDate(event.startsAt)}
            {event.endsAt && ` to ${formatEventDate(event.endsAt)}`}
          </span>

          {(event.locationName || event.address) && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {event.locationName || event.address}
              {event.distanceMiles != null && (
                <span className="text-stone-600">({event.distanceMiles} mi)</span>
              )}
            </span>
          )}

          {event.organizerName && (
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" />
              {event.organizerName}
            </span>
          )}
        </div>

        {event.status && event.sourceType === 'chef_event' && (
          <div className="pt-1">
            <Badge className="text-[10px] text-stone-500 border-stone-700">
              {event.status.replace(/_/g, ' ')}
            </Badge>
          </div>
        )}

        {readiness && event.sourceType === 'chef_event' && <ReadinessDots readiness={readiness} />}
      </CardContent>
    </Card>
  )

  if (event.href) {
    const isExternal = event.href.startsWith('http')
    if (isExternal) {
      return (
        <a href={event.href} target="_blank" rel="noopener noreferrer" className="block group">
          <div className="relative">
            {content}
            <ExternalLink className="absolute top-4 right-4 h-3 w-3 text-stone-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </a>
      )
    }
    return (
      <Link href={event.href} className="block">
        {content}
      </Link>
    )
  }

  return content
}

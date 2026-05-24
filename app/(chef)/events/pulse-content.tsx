import { requireChef } from '@/lib/auth/get-user'
import { getCurrentEvents } from '@/lib/events/current-events'
import { getEventReadiness } from '@/lib/events/event-readiness'
import { detectEventConflicts } from '@/lib/events/conflict-detection'
import { getEvents } from '@/lib/events/actions'
import { getAccountLocation } from '@/lib/location/account-location'
import { CurrentEventCard } from '@/components/events/current-event-card'
import { NetworkActivitySection } from '@/components/events/network-activity-section'
import { EmptyState } from '@/components/ui/empty-state'
import { Zap } from 'lucide-react'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import Link from 'next/link'
import type { ChefPortalEvent } from '@/lib/events/current-events'
import type { EventReadiness } from '@/lib/events/event-readiness'

function WeekGlance({
  chefEvents,
  readinessMap,
  conflictCount,
}: {
  chefEvents: ChefPortalEvent[]
  readinessMap: Map<string, EventReadiness>
  conflictCount: number
}) {
  const now = new Date()
  const thisWeekEvents = chefEvents.filter((e) => {
    const days = differenceInCalendarDays(parseISO(e.startsAt), now)
    return days >= 0 && days <= 6
  })

  if (thisWeekEvents.length === 0) return null

  const nextEvent = chefEvents[0]
  const daysToNext = nextEvent ? differenceInCalendarDays(parseISO(nextEvent.startsAt), now) : null

  let nextLabel = ''
  if (nextEvent && daysToNext !== null) {
    if (daysToNext === 0) nextLabel = `Next: ${nextEvent.title} today`
    else if (daysToNext === 1) nextLabel = `Next: ${nextEvent.title} tomorrow`
    else nextLabel = `Next: ${nextEvent.title} in ${daysToNext} days`
  }

  const readyCount = thisWeekEvents.filter((e) => {
    const r = readinessMap.get(e.id)
    return r && r.readinessScore >= 99
  }).length
  const total = thisWeekEvents.length

  let readinessColor = 'text-emerald-400'
  if (readyCount < total / 2) readinessColor = 'text-red-400'
  else if (readyCount < total) readinessColor = 'text-amber-400'

  return (
    <div className="flex items-start gap-3 rounded-xl border border-stone-800 bg-stone-900/60 px-5 py-4">
      <Zap className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="text-stone-300">
          {total} event{total !== 1 ? 's' : ''} this week
        </span>
        {nextLabel && <span className="text-stone-400">{nextLabel}</span>}
        <span className={readinessColor}>
          {readyCount} of {total} ready
        </span>
        {conflictCount > 0 && (
          <Link href="/events/timeline" className="text-amber-400 hover:text-amber-300">
            {conflictCount} conflict{conflictCount !== 1 ? 's' : ''}
          </Link>
        )}
      </div>
    </div>
  )
}

export default async function PulseContent() {
  const user = await requireChef()
  const events = await getCurrentEvents()

  const chefEvents = events.filter((e) => e.sourceType === 'chef_event')
  const calendarEvents = events.filter((e) => e.sourceType === 'calendar_entry')
  const markets = events.filter((e) => e.sourceType === 'farmers_market')

  const chefEventIds = chefEvents.map((e) => e.id)
  const readinessMap =
    chefEventIds.length > 0
      ? await getEventReadiness(user.tenantId!, chefEventIds)
      : new Map<string, EventReadiness>()

  const allEvents = await getEvents()
  const conflicts = detectEventConflicts(
    allEvents.map((e: any) => ({
      id: e.id,
      occasion: e.occasion,
      event_date: e.event_date,
      serve_time: e.serve_time,
      status: e.status,
    }))
  )

  const location = await getAccountLocation()
  const hasLocation = !!(location?.lat && location?.lng)

  const displayChefEvents = chefEvents.slice(0, 8)
  const hasMoreEvents = chefEvents.length > 8

  const localOpportunities = [...markets, ...calendarEvents].slice(0, 6)

  if (!chefEvents.length && !localOpportunities.length) {
    return (
      <EmptyState
        remy="pondering"
        title="No current events"
        description="No upcoming events or local opportunities found."
        action={{ label: 'Create Event', href: '/events/new' }}
      />
    )
  }

  return (
    <div className="space-y-8">
      <WeekGlance
        chefEvents={chefEvents}
        readinessMap={readinessMap}
        conflictCount={
          conflicts.filter((c: any) => c.type === 'same_day' || c.type === 'back_to_back').length
        }
      />

      {displayChefEvents.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-stone-400 mb-3">Upcoming Events</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {displayChefEvents.map((event) => (
              <CurrentEventCard
                key={event.id}
                event={event}
                readiness={readinessMap.get(event.id)}
              />
            ))}
          </div>
          {hasMoreEvents && (
            <div className="mt-3">
              <Link href="/events/list" className="text-sm text-amber-500 hover:text-amber-400">
                View all {chefEvents.length} events
              </Link>
            </div>
          )}
        </section>
      )}

      {hasLocation ? (
        localOpportunities.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-stone-400 mb-3">Local Opportunities</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {localOpportunities.map((event) => (
                <CurrentEventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        )
      ) : (
        <section>
          <h2 className="text-sm font-medium text-stone-400 mb-3">Local Opportunities</h2>
          <p className="text-sm text-stone-500">
            Set your location in{' '}
            <Link href="/settings/profile-branding" className="text-amber-500 hover:text-amber-400">
              settings
            </Link>{' '}
            to see nearby opportunities.
          </p>
        </section>
      )}

      <NetworkActivitySection chefId={user.tenantId!} />
    </div>
  )
}

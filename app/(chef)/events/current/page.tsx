import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getCurrentEvents } from '@/lib/events/current-events'
import { getEventReadiness } from '@/lib/events/event-readiness'
import { requireChef } from '@/lib/auth/get-user'
import { CurrentEventCard } from '@/components/events/current-event-card'
import { NetworkActivitySection } from '@/components/events/network-activity-section'
import { EmptyState } from '@/components/ui/empty-state'
import { CalendarDays, Loader2, Zap } from 'lucide-react'
import { parseISO, differenceInCalendarDays, format } from 'date-fns'
import type { ChefPortalEvent } from '@/lib/events/current-events'
import type { EventReadiness } from '@/lib/events/event-readiness'

export const metadata: Metadata = { title: 'Current Events' }

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-20 text-stone-500">
      <Loader2 className="h-5 w-5 animate-spin mr-2" />
      <span className="text-sm">Loading events...</span>
    </div>
  )
}

/** Week-at-a-glance summary bar */
function WeekGlance({
  chefEvents,
  readinessMap,
}: {
  chefEvents: ChefPortalEvent[]
  readinessMap: Map<string, EventReadiness>
}) {
  const now = new Date()
  const thisWeekEvents = chefEvents.filter((e) => {
    const days = differenceInCalendarDays(parseISO(e.startsAt), now)
    return days >= 0 && days <= 6
  })

  if (thisWeekEvents.length === 0 && chefEvents.length === 0) return null

  // Next event countdown
  const nextEvent = chefEvents[0]
  let nextLabel = ''
  if (nextEvent) {
    const daysUntil = differenceInCalendarDays(parseISO(nextEvent.startsAt), now)
    if (daysUntil <= 0) {
      nextLabel = `Next: ${nextEvent.title} (today)`
    } else if (daysUntil === 1) {
      nextLabel = `Next: ${nextEvent.title} (tomorrow)`
    } else {
      const dayName = format(parseISO(nextEvent.startsAt), 'EEEE')
      nextLabel = `Next: ${dayName} ${nextEvent.title.toLowerCase()} in ${daysUntil} days`
    }
  }

  // Overall readiness percentage
  let avgReadiness = 0
  if (readinessMap.size > 0) {
    let total = 0
    readinessMap.forEach((r) => {
      total += r.readinessScore
    })
    avgReadiness = Math.round(total / readinessMap.size)
  }

  return (
    <div className="rounded-lg border border-stone-700/50 bg-stone-900/60 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="h-4 w-4 text-amber-500" />
        <h2 className="text-sm font-medium text-stone-200">Your Week at a Glance</h2>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-stone-400">
        <span>
          <span className="text-stone-100 font-semibold">{thisWeekEvents.length}</span>{' '}
          {thisWeekEvents.length === 1 ? 'event' : 'events'} this week
        </span>

        {nextLabel && <span>{nextLabel}</span>}

        {readinessMap.size > 0 && (
          <span>
            Readiness:{' '}
            <span
              className={`font-semibold ${
                avgReadiness >= 80
                  ? 'text-emerald-400'
                  : avgReadiness >= 50
                    ? 'text-amber-400'
                    : 'text-red-400'
              }`}
            >
              {avgReadiness}%
            </span>
          </span>
        )}
      </div>
    </div>
  )
}

async function CurrentEventsList() {
  let events: ChefPortalEvent[]
  let user: Awaited<ReturnType<typeof requireChef>>

  try {
    user = await requireChef()
    events = await getCurrentEvents()
  } catch {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
        Failed to load events. Please try again.
      </div>
    )
  }

  if (!events.length) {
    return (
      <EmptyState
        remy="pondering"
        title="No current events"
        description="No upcoming events, markets, or activities found. Check back soon for nearby markets and scheduled events."
        action={{ label: 'Create Event', href: '/events/new' }}
      />
    )
  }

  const chefEvents = events.filter((e) => e.sourceType === 'chef_event')
  const calendarEvents = events.filter((e) => e.sourceType === 'calendar_entry')
  const markets = events.filter((e) => e.sourceType === 'farmers_market')

  // Fetch readiness for chef events
  const chefEventIds = chefEvents.map((e) => e.id)
  const readinessMap =
    chefEventIds.length > 0
      ? await getEventReadiness(user.tenantId!, chefEventIds)
      : new Map<string, never>()

  return (
    <div className="space-y-8">
      <WeekGlance chefEvents={chefEvents} readinessMap={readinessMap} />

      {chefEvents.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-stone-400 mb-3">Upcoming Events</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {chefEvents.map((event) => (
              <CurrentEventCard
                key={event.id}
                event={event}
                readiness={readinessMap.get(event.id)}
              />
            ))}
          </div>
        </section>
      )}

      {calendarEvents.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-stone-400 mb-3">Scheduled Activities</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {calendarEvents.map((event) => (
              <CurrentEventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      <NetworkActivitySection chefId={user.tenantId!} />

      {markets.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-stone-400 mb-3">Nearby Farmers Markets</h2>
          <p className="text-xs text-stone-600 mb-3">In-season markets within your area</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {markets.map((event) => (
              <CurrentEventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default function CurrentEventsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-100 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-amber-500" />
          Current Events
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Your upcoming events, scheduled activities, and nearby farmers markets
        </p>
      </div>

      <Suspense fallback={<LoadingFallback />}>
        <CurrentEventsList />
      </Suspense>
    </div>
  )
}

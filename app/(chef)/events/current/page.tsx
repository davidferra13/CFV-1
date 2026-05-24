import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getCurrentEvents } from '@/lib/events/current-events'
import { CurrentEventCard } from '@/components/events/current-event-card'
import { EmptyState } from '@/components/ui/empty-state'
import { CalendarDays, Loader2 } from 'lucide-react'

export const metadata: Metadata = { title: 'Current Events' }

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-20 text-stone-500">
      <Loader2 className="h-5 w-5 animate-spin mr-2" />
      <span className="text-sm">Loading events...</span>
    </div>
  )
}

async function CurrentEventsList() {
  let events
  try {
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

  return (
    <div className="space-y-8">
      {chefEvents.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-stone-400 mb-3">Upcoming Events</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {chefEvents.map((event) => (
              <CurrentEventCard key={event.id} event={event} />
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

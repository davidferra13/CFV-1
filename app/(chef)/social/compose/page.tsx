import type { Metadata } from 'next'
import Link from 'next/link'
import { format, parseISO, isValid } from 'date-fns'
import { Button } from '@/components/ui/button'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { getEvents } from '@/lib/events/actions'
import { getUnpostedEvents } from '@/lib/social/event-social-actions'

export const metadata: Metadata = { title: 'Post from Event - ChefFlow' }

function formatDateLabel(value: string | null | undefined) {
  if (!value) return null
  const date = parseISO(value)
  return isValid(date) ? format(date, 'MMM d, yyyy') : null
}

export default async function SocialComposeIndexPage() {
  await requireChef()
  await requirePro('marketing')

  const [unpostedEvents, allEvents] = await Promise.all([getUnpostedEvents(), getEvents()])

  const recentEvents = [...allEvents]
    .filter((event: any) => ['completed', 'confirmed', 'paid'].includes(event.status ?? ''))
    .sort((a: any, b: any) => {
      const left = a.event_date ? Date.parse(a.event_date) : 0
      const right = b.event_date ? Date.parse(b.event_date) : 0
      return right - left
    })
    .slice(0, 12)

  const unpostedIds = new Set(unpostedEvents.map((event) => event.id))
  const recentEventsWithoutQueue = recentEvents.filter((event: any) => !unpostedIds.has(event.id))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-stone-800 bg-stone-950/60 p-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-400">
            Event Social Composer
          </p>
          <h1 className="text-3xl font-semibold text-stone-100">Choose an event to post from</h1>
          <p className="text-sm text-stone-400">
            Start with events that still need content, or open any recent service to draft another
            post, carousel, or recap.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button href="/social/planner" variant="secondary">
            Planner
          </Button>
          <Button href="/events/completed" variant="secondary">
            Completed Events
          </Button>
        </div>
      </div>

      {unpostedEvents.length > 0 ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-stone-100">Needs a post</h2>
            <p className="text-sm text-stone-500">
              Completed events with no linked social post yet.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {unpostedEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-2xl border border-stone-800 bg-stone-950/50 p-5 shadow-sm shadow-black/20"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-stone-100">
                        {event.occasion ?? 'Private event'}
                      </h3>
                      <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-medium text-amber-300">
                        {event.photo_count > 0 ? `${event.photo_count} photos` : 'No photos yet'}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-stone-400">
                      <p>{event.client_name || 'Client not attached'}</p>
                      <p>
                        {formatDateLabel(event.event_date)}
                        {event.location_city ? ` • ${event.location_city}` : ''}
                      </p>
                      <p>{event.guest_count} guests</p>
                    </div>
                  </div>
                  <Link
                    href={`/social/compose/${event.id}`}
                    className="inline-flex items-center rounded-lg border border-stone-700 px-3 py-2 text-sm font-medium text-stone-200 transition-colors hover:bg-stone-800"
                  >
                    Compose
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">
            {unpostedEvents.length > 0 ? 'Recent events' : 'Recent eligible events'}
          </h2>
          <p className="text-sm text-stone-500">
            Open any recent event to draft a new post or recap.
          </p>
        </div>

        {recentEvents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-700 bg-stone-900/60 px-6 py-12 text-center">
            <h3 className="text-lg font-semibold text-stone-100">No recent events to post from</h3>
            <p className="mt-2 text-sm text-stone-400">
              Finish a service or confirm an event and it will show up here for social drafting.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button href="/events/new">Create Event</Button>
              <Button href="/social/planner" variant="secondary">
                Open Planner
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {(recentEventsWithoutQueue.length > 0 ? recentEventsWithoutQueue : recentEvents).map(
              (event: any) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-stone-800 bg-stone-950/50 p-5 shadow-sm shadow-black/20"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-stone-100">
                          {event.occasion ?? 'Private event'}
                        </h3>
                        <span className="rounded-full bg-stone-800 px-2.5 py-1 text-[11px] font-medium text-stone-300">
                          {event.status ?? 'draft'}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-stone-400">
                        <p>{event.client?.full_name ?? 'Client not attached'}</p>
                        <p>{formatDateLabel(event.event_date)}</p>
                        <p>{event.guest_count ?? 0} guests</p>
                      </div>
                    </div>
                    <Link
                      href={`/social/compose/${event.id}`}
                      className="inline-flex items-center rounded-lg border border-stone-700 px-3 py-2 text-sm font-medium text-stone-200 transition-colors hover:bg-stone-800"
                    >
                      Compose
                    </Link>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>
    </div>
  )
}

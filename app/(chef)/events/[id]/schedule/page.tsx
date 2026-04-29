// Event Schedule Page
// Full day-of timeline, DOP status, and route plan for a single event.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEventById } from '@/lib/events/actions'
import { getEventTimeline, getEventDOPSchedule } from '@/lib/scheduling/actions'
import { getDOPManualCompletions } from '@/lib/scheduling/dop-completions'
import { TimelineView } from '@/components/scheduling/timeline-view'
import { DOPView } from '@/components/scheduling/dop-view'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarAddButtons } from '@/components/events/calendar-add-buttons'
import { AddressHandoff } from '@/components/ui/handoff-actions'
import { ServiceSimulationRollupCard } from '@/components/events/service-simulation-rollup-card'
import { ServiceSimulationReturnBanner } from '@/components/events/service-simulation-return-banner'
import { loadEventServiceSimulationPanelState } from '@/lib/service-simulation/state'
import { sanitizeReturnTo } from '@/lib/navigation/return-to'
import { format } from 'date-fns'

export default async function EventSchedulePage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: { returnTo?: string }
}) {
  await requireChef()
  const returnTo = sanitizeReturnTo(searchParams?.returnTo)

  const [event, timeline, dop, manualCompletions, simulationState] = await Promise.all([
    getEventById(params.id),
    getEventTimeline(params.id),
    getEventDOPSchedule(params.id),
    getDOPManualCompletions(params.id).catch(() => new Set<string>()),
    loadEventServiceSimulationPanelState(params.id).catch(() => null),
  ])

  if (!event) notFound()
  const locationLabel = [
    (event as any).location_address,
    (event as any).location_city,
    (event as any).location_state,
    (event as any).location_zip,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <ServiceSimulationReturnBanner returnTo={returnTo} />

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">
            Schedule: {event.occasion || 'Untitled Event'}
          </h1>
          <p className="text-stone-400 mt-1">
            {format(new Date(event.event_date), 'EEEE, MMMM d, yyyy')}
            {event.serve_time && ` - Serve at ${event.serve_time}`}
          </p>
          <p className="text-sm text-stone-500 mt-1">
            {event.client?.full_name} - {event.guest_count} guests
          </p>
          {locationLabel && (
            <div className="mt-2 text-sm text-stone-400">
              <AddressHandoff address={locationLabel} />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={returnTo ?? `/events/${event.id}`}>
            <Button variant="secondary">Event Details</Button>
          </Link>
          <Link href="/schedule">
            <Button variant="ghost">Weekly View</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <CalendarAddButtons
            eventId={event.id}
            occasion={event.occasion || 'ChefFlow Event'}
            eventDate={event.event_date}
            startTime={event.serve_time ?? undefined}
            location={locationLabel || undefined}
          />
        </CardContent>
      </Card>

      {simulationState ? (
        <ServiceSimulationRollupCard
          eventId={params.id}
          panelState={simulationState}
          compact
          returnToHref={`/events/${params.id}?tab=ops#service-simulation`}
          description="Schedule and DOP stay grounded in the same service simulation signal."
        />
      ) : null}

      {/* Timeline */}
      {timeline && (
        <Card>
          <CardHeader>
            <CardTitle>Day-of Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <TimelineView timeline={timeline} />
          </CardContent>
        </Card>
      )}

      {!timeline && (
        <Card className="p-6">
          <p className="text-sm text-stone-500">
            Timeline could not be generated. Ensure the event has a serve time and arrival time set.
          </p>
        </Card>
      )}

      {/* DOP Status */}
      {dop && (
        <Card>
          <CardHeader>
            <CardTitle>Default Operating Procedures</CardTitle>
          </CardHeader>
          <CardContent>
            <DOPView schedule={dop} eventId={params.id} manualCompletionKeys={manualCompletions} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

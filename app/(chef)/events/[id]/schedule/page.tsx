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
import { format } from 'date-fns'

export default async function EventSchedulePage({
  params
}: {
  params: { id: string }
}) {
  await requireChef()

  const [event, timeline, dop, manualCompletions] = await Promise.all([
    getEventById(params.id),
    getEventTimeline(params.id),
    getEventDOPSchedule(params.id),
    getDOPManualCompletions(params.id).catch(() => new Set<string>()),
  ])

  if (!event) notFound()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">
            Schedule: {event.occasion || 'Untitled Event'}
          </h1>
          <p className="text-stone-600 mt-1">
            {format(new Date(event.event_date), 'EEEE, MMMM d, yyyy')}
            {event.serve_time && ` - Serve at ${event.serve_time}`}
          </p>
          <p className="text-sm text-stone-500 mt-1">
            {event.client?.full_name} - {event.guest_count} guests
            {event.location_city && ` - ${event.location_city}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/events/${event.id}`}>
            <Button variant="secondary">Event Details</Button>
          </Link>
          <Link href="/schedule">
            <Button variant="ghost">Weekly View</Button>
          </Link>
        </div>
      </div>

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

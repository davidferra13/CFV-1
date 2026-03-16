// AAR Entry/Edit Page - Post-service review form
// Loads event context and existing AAR (if editing)

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEventById } from '@/lib/events/actions'
import { getAARByEventId } from '@/lib/aar/actions'
import { getChefChecklist } from '@/lib/checklist/actions'
import { AARForm } from '@/components/aar/aar-form'
import { EventStatusBadge } from '@/components/events/event-status-badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

export default async function AARPage({ params }: { params: { id: string } }) {
  const user = await requireChef()

  const [event, existingAAR, checklistItems] = await Promise.all([
    getEventById(params.id),
    getAARByEventId(params.id),
    getChefChecklist(params.id),
  ])

  if (!event) {
    notFound()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">
            {existingAAR ? 'Edit Review' : 'Event Review'}
          </h1>
          <p className="text-stone-400 mt-1">
            {existingAAR ? 'Update your post-service notes' : 'How did the dinner go?'}
          </p>
        </div>
        <Link href={`/events/${params.id}`}>
          <Button variant="ghost" size="sm">
            Back to Event
          </Button>
        </Link>
      </div>

      {/* Event Context Header (read-only) */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-stone-100">{event.occasion || 'Untitled Event'}</h2>
              <EventStatusBadge status={event.status} />
            </div>
            <p className="text-sm text-stone-400 mt-1">
              {event.client?.full_name} &middot; {format(new Date(event.event_date), 'MMM d, yyyy')}{' '}
              &middot; {event.guest_count} guests
            </p>
          </div>
        </div>
      </Card>

      {/* AAR Form */}
      <AARForm eventId={params.id} checklistItems={checklistItems} existingAAR={existingAAR} />
    </div>
  )
}

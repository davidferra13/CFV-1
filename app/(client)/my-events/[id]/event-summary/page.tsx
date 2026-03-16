// Post-Event Summary Page - menu recap, expense breakdown, timeline

import { requireClient } from '@/lib/auth/get-user'
import { getClientEventById } from '@/lib/events/client-actions'
import { PostEventSummaryClient } from '@/components/events/post-event-summary-client'
import { notFound, redirect } from 'next/navigation'

export default async function EventSummaryPage({ params }: { params: { id: string } }) {
  await requireClient()

  const event = await getClientEventById(params.id)
  if (!event) notFound()

  // Only available once event is completed
  if (event.status !== 'completed') {
    redirect(`/my-events/${params.id}`)
  }

  return (
    <div className="py-2">
      <PostEventSummaryClient
        event={{
          id: event.id,
          occasion: event.occasion,
          event_date: event.event_date,
          guest_count: event.guest_count,
          serve_time: event.serve_time ?? null,
          location_city: event.location_city ?? null,
          location_state: event.location_state ?? null,
        }}
        menus={event.menus}
        ledgerEntries={event.ledgerEntries}
        transitions={event.transitions}
        financial={event.financial}
        hasPhotos={event.hasPhotos}
      />
    </div>
  )
}

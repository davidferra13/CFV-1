// Chef Edit Event Page
// Allows editing event details (only for draft or proposed status)

import { notFound, redirect } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { getEventById } from '@/lib/events/actions'
import { getClients } from '@/lib/clients/actions'
import { getPartnersWithLocations } from '@/lib/partners/actions'
import { EventForm } from '@/components/events/event-form'
import { Alert } from '@/components/ui/alert'

export default async function EditEventPage({
  params
}: {
  params: { id: string }
}) {
  await requireChef()

  const event = await getEventById(params.id)

  if (!event) {
    notFound()
  }

  // Only allow editing if event is in draft or proposed status
  if (!['draft', 'proposed'].includes(event.status)) {
    redirect(`/events/${params.id}`)
  }

  const [clients, { partners, partnerLocations }] = await Promise.all([
    getClients(),
    getPartnersWithLocations(),
  ])

  // Map to the shape EventForm expects
  const formEvent = {
    id: event.id,
    client_id: event.client_id,
    occasion: event.occasion,
    event_date: event.event_date,
    serve_time: event.serve_time,
    guest_count: event.guest_count,
    location_address: event.location_address,
    location_city: event.location_city,
    location_state: event.location_state,
    location_zip: event.location_zip,
    special_requests: event.special_requests,
    quoted_price_cents: event.quoted_price_cents,
    deposit_amount_cents: event.deposit_amount_cents,
    referral_partner_id: (event as any).referral_partner_id ?? null,
    partner_location_id: (event as any).partner_location_id ?? null,
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Edit Event</h1>
        <p className="text-stone-600 mt-1">Update event details</p>
      </div>

      {event.status === 'proposed' && (
        <Alert variant="warning" title="Event Already Proposed">
          This event has already been proposed to the client. Changing financial terms may require
          re-proposing the event.
        </Alert>
      )}

      <EventForm clients={clients} mode="edit" event={formEvent} partners={partners} partnerLocations={partnerLocations} />
    </div>
  )
}

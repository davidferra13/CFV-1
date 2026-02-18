// Chef New Event Page
// Form to create a new event

import { requireChef } from '@/lib/auth/get-user'
import { getClients } from '@/lib/clients/actions'
import { EventForm } from '@/components/events/event-form'

export default async function NewEventPage() {
  await requireChef()

  const clients = await getClients()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Create New Event</h1>
        <p className="text-stone-600 mt-1">Fill in the details for your new event</p>
      </div>

      <EventForm clients={clients} mode="create" />
    </div>
  )
}

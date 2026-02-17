// Chef New Event Page
// Form to create a new event

import { requireChef } from '@/lib/auth/get-user'
import { getClients } from '@/lib/clients/actions'
import { getHouseholds } from '@/lib/households/actions'
import { EventForm } from '@/components/events/event-form'

export default async function NewEventPage() {
  await requireChef()

  // Fetch clients and households for dropdowns
  const [clients, households] = await Promise.all([
    getClients(),
    getHouseholds().catch(() => []),
  ])

  const householdOptions = households.map((h) => ({
    id: h.id,
    name: h.name,
    member_count: h.members.length,
  }))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Create New Event</h1>
        <p className="text-stone-600 mt-1">Fill in the details for your new event</p>
      </div>

      <EventForm clients={clients} mode="create" households={householdOptions} />
    </div>
  )
}

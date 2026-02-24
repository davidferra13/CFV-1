// Chef New Event Page
// Form to create a new event

import { requireChef } from '@/lib/auth/get-user'
import { getClients } from '@/lib/clients/actions'
import { getPartnersWithLocations } from '@/lib/partners/actions'
import { getDepositDefaults } from '@/lib/automations/settings-actions'
import { EventForm } from '@/components/events/event-form'

export default async function NewEventPage() {
  await requireChef()

  const [clients, { partners, partnerLocations }, depositDefaults] = await Promise.all([
    getClients(),
    getPartnersWithLocations(),
    getDepositDefaults(),
  ])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-6">
        <p className="text-sm text-stone-500">
          Prefer a step-by-step guide?{' '}
          <a href="/events/new/wizard" className="text-brand-600 hover:text-brand-400 font-medium">
            Try the event wizard &rarr;
          </a>
        </p>
        <p className="text-sm text-stone-500">
          Or{' '}
          <a
            href="/events/new/from-text"
            className="text-brand-600 hover:text-brand-400 font-medium"
          >
            just describe it &rarr;
          </a>
        </p>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-stone-100">Create New Event</h1>
        <p className="text-stone-400 mt-1">Fill in the details for your new event</p>
      </div>

      <EventForm
        clients={clients}
        mode="create"
        partners={partners}
        partnerLocations={partnerLocations}
        depositDefaults={depositDefaults}
      />
    </div>
  )
}

// Chef New Event Page
// Form to create a new event

import { requireChef } from '@/lib/auth/get-user'
import { getClients } from '@/lib/clients/actions'
import { getPartnersWithLocations } from '@/lib/partners/actions'
import { getDepositDefaults } from '@/lib/automations/settings-actions'
import { EventForm } from '@/components/events/event-form'
import { getCachedChefArchetype } from '@/lib/chef/layout-data-cache'
import { getArchetypeCopy } from '@/lib/archetypes/ui-copy'

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: {
    client_id?: string
    date?: string
    occasion?: string
    guest_count?: string
    quoted_price?: string
    waitlist_id?: string
  }
}) {
  const user = await requireChef()

  const [clients, { partners, partnerLocations }, depositDefaults, archetype] = await Promise.all([
    getClients(),
    getPartnersWithLocations(),
    getDepositDefaults(),
    getCachedChefArchetype(user.entityId).catch(() => null),
  ])
  const copy = getArchetypeCopy(archetype)

  const seed =
    searchParams.client_id ||
    searchParams.date ||
    searchParams.occasion ||
    searchParams.guest_count ||
    searchParams.quoted_price
      ? {
          client_id: searchParams.client_id,
          occasion: searchParams.occasion,
          event_date: searchParams.date,
          guest_count: searchParams.guest_count,
          quoted_price: searchParams.quoted_price,
        }
      : undefined

  const fromWaitlist = searchParams.waitlist_id

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-6">
        {fromWaitlist ? (
          <p className="text-sm text-stone-400">
            Creating event from waitlist entry. Fields have been pre-filled.
          </p>
        ) : (
          <p className="text-sm text-stone-500">
            Prefer a shortcut?{' '}
            <a
              href="/events/new/from-text"
              className="text-brand-500 hover:text-brand-400 font-medium"
            >
              Just describe it &rarr;
            </a>
          </p>
        )}
      </div>

      <div>
        <h1 className="text-3xl font-bold text-stone-100">
          Create {copy.newEventLabel.replace('New ', '')}
        </h1>
        <p className="text-stone-400 mt-1">Fill in the details for your new {copy.eventSingular}</p>
      </div>

      <EventForm
        tenantId={user.tenantId!}
        clients={clients}
        mode="create"
        partners={partners}
        partnerLocations={partnerLocations}
        depositDefaults={depositDefaults}
        seed={seed}
      />
    </div>
  )
}

// Guided Event Creation Wizard Page (Server Component)
// Fetches client list + smart defaults and renders the multi-step wizard client component

import { requireChef } from '@/lib/auth/get-user'
import { getClients } from '@/lib/clients/actions'
import { EventCreationWizard } from '@/components/events/event-creation-wizard'
import { getEventSmartDefaults } from '@/lib/intelligence/smart-defaults'

export default async function EventWizardPage() {
  await requireChef()

  const [clients, smartDefaults] = await Promise.all([getClients(), getEventSmartDefaults()])

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-4 py-8">
      <EventCreationWizard clients={clients} smartDefaults={smartDefaults} />
    </div>
  )
}

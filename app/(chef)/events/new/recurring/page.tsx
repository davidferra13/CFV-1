// New Recurring Event Series Page
// Form to create a recurring event series with auto-generated events.

import { requireChef } from '@/lib/auth/get-user'
import { getClients } from '@/lib/clients/actions'
import { RecurringSeriesForm } from '@/components/events/recurring-series-form'

export default async function NewRecurringSeriesPage() {
  const user = await requireChef()
  const clients = await getClients()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Create Recurring Series</h1>
        <p className="text-stone-400 mt-1">
          Set up a repeating service schedule and generate events automatically
        </p>
      </div>

      <RecurringSeriesForm tenantId={user.tenantId!} clients={clients} />
    </div>
  )
}

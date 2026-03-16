// Natural Language Event Entry Page
// Chef describes an event in plain text - AI parses it into a pre-filled draft.
// AI policy compliant: parsed draft is shown for chef review before any data is saved.

import { requireChef } from '@/lib/auth/get-user'
import { getClients } from '@/lib/clients/actions'
import { EventNLForm } from '@/components/events/event-nl-form'
import Link from 'next/link'

export default async function NewEventFromTextPage() {
  await requireChef()

  const clients = await getClients()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Quick Event Entry</h1>
        <p className="text-stone-400 mt-1">
          Describe the event in your own words | ChefFlow will parse the details for you.
        </p>
      </div>

      <p className="text-sm text-stone-500">
        Prefer a structured form?{' '}
        <Link href="/events/new" className="text-brand-500 hover:text-brand-400 font-medium">
          Use the step-by-step form &rarr;
        </Link>
      </p>

      <EventNLForm clients={clients} />
    </div>
  )
}

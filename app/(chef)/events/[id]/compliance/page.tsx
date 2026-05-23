import Link from 'next/link'
import { notFound } from 'next/navigation'

import { EventCompliancePacketCard } from '@/components/compliance/event-compliance-packet-card'
import { Button } from '@/components/ui/button'
import { requireChef } from '@/lib/auth/get-user'
import { getEventById } from '@/lib/events/actions'

export const metadata = { title: 'Event Compliance | ChefFlow' }

export default async function EventCompliancePage({ params }: { params: { id: string } }) {
  await requireChef()
  const event = await getEventById(params.id)
  if (!event) notFound()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-stone-500">Event compliance readiness</p>
          <h1 className="text-2xl font-semibold text-stone-100">
            {(event as any).occasion ?? 'Event'} packet
          </h1>
        </div>
        <Link href={`/events/${params.id}`}>
          <Button variant="ghost">Back to Event</Button>
        </Link>
      </div>

      <EventCompliancePacketCard eventId={params.id} />
    </div>
  )
}

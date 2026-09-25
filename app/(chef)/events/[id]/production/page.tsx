import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { EventProductionLoopCard } from '@/components/events/event-production-loop-card'
import { Button } from '@/components/ui/button'
import { getEventProductionLoopSnapshot } from '@/lib/events/production-loop-actions'

export const metadata: Metadata = { title: 'Production Loop | ChefFlow' }

export default async function EventProductionPage({ params }: { params: { id: string } }) {
  const snapshot = await getEventProductionLoopSnapshot(params.id).catch(() => null)
  if (!snapshot) notFound()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            {snapshot.event.occasion || 'Event'}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-stone-100">Production workspace</h1>
          <p className="mt-1 text-sm text-stone-500">
            {snapshot.event.eventDate} · {snapshot.event.guestCount} guests ·{' '}
            {snapshot.event.serviceStyle.replace(/_/g, ' ')}
          </p>
        </div>
        <Link href={`/events/${params.id}`}>
          <Button variant="ghost">Back to event</Button>
        </Link>
      </div>

      <EventProductionLoopCard snapshot={snapshot} />
    </div>
  )
}

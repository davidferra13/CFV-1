import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { requireChef } from '@/lib/auth/get-user'
import { getEventById } from '@/lib/events/actions'
import { autoSuggestEventBlocks, getEventPrepBlocks } from '@/lib/scheduling/prep-block-actions'
import { EventPrepSchedule } from '@/components/events/event-prep-schedule'
import { ServiceSimulationReturnBanner } from '@/components/events/service-simulation-return-banner'
import { Button } from '@/components/ui/button'
import { sanitizeReturnTo } from '@/lib/navigation/return-to'

export default async function EventPrepPlanPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: { returnTo?: string }
}) {
  await requireChef()
  const returnTo = sanitizeReturnTo(searchParams?.returnTo)

  const event = await getEventById(params.id)
  if (!event) notFound()

  const blocks = await getEventPrepBlocks(params.id).catch(() => [])
  const suggestions =
    blocks.length === 0
      ? (await autoSuggestEventBlocks(params.id).catch(() => ({ suggestions: [] }))).suggestions
      : null

  return (
    <div className="space-y-6">
      <ServiceSimulationReturnBanner returnTo={returnTo} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Prep Flow</h1>
          <p className="mt-1 text-sm text-stone-500">
            {event.occasion || 'Event'} - {format(new Date(event.event_date), 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={returnTo ?? `/events/${params.id}`}>
            <Button variant="ghost">Back to Event</Button>
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-stone-700 bg-stone-900/70 px-4 py-3 text-sm text-stone-400">
        Prep Flow keeps the action truthful: confirm suggested blocks, add a manual block, or close
        the next incomplete prep block without dropping back into the full event shell.
      </div>

      <EventPrepSchedule
        eventId={params.id}
        initialBlocks={blocks}
        initialSuggestions={suggestions}
      />
    </div>
  )
}

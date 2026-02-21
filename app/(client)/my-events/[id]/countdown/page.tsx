// Event Countdown — Client-facing countdown to their upcoming event
// Shows days remaining, event details, and preparation milestones

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireClient } from '@/lib/auth/get-user'
import { getEventCountdown } from '@/lib/events/countdown-actions'
import { EventCountdown } from '@/components/clients/event-countdown'

export const metadata: Metadata = { title: 'Event Countdown - ChefFlow' }

export default async function CountdownPage({
  params,
}: {
  params: { id: string }
}) {
  await requireClient()

  let countdownData: Awaited<ReturnType<typeof getEventCountdown>> | null = null
  try {
    countdownData = await getEventCountdown(params.id)
  } catch {
    countdownData = null
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-6">
        <Link
          href={`/my-events/${params.id}`}
          className="text-brand-600 hover:text-brand-700 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Event
        </Link>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">Event Countdown</h1>
        <p className="text-stone-600 mt-1">
          Everything you need to know as your event approaches.
        </p>
      </div>

      {countdownData ? (
        <EventCountdown eventName={countdownData.eventName} eventDate={countdownData.eventDate} status={countdownData.status} countdownEnabled={countdownData.countdownEnabled} />
      ) : (
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-8 text-center">
          <p className="text-stone-500 text-sm">
            Countdown information is not available for this event.
          </p>
          <Link
            href={`/my-events/${params.id}`}
            className="inline-block mt-4 text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            Return to event details
          </Link>
        </div>
      )}
    </div>
  )
}

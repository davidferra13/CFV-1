import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { getClientEventGuests, getGuestDietaryRollup } from '@/lib/events/client-guest-actions'
import { GuestsClient } from './guests-client'
import { ActivityTracker } from '@/components/activity/activity-tracker'
import { Alert } from '@/components/ui/alert'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Manage Guests' }

export default async function EventGuestsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireClient()
  const { id } = await params

  let guests
  let rollup
  try {
    ;[guests, rollup] = await Promise.all([getClientEventGuests(id), getGuestDietaryRollup(id)])
  } catch {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Alert variant="warning">Event not found or you do not have access.</Alert>
        <Link href="/my-events" className="text-sm text-brand-500 hover:text-brand-400">
          Back to My Events
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <GuestsClient eventId={id} initialGuests={guests} rollup={rollup} />
      <ActivityTracker
        eventType="page_viewed"
        metadata={{ event_id: id, guest_count: guests.length }}
      />
    </div>
  )
}

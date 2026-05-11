import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { getEventRecap } from '@/lib/events/client-recap-actions'
import { RecapClient } from './recap-client'
import { ActivityTracker } from '@/components/activity/activity-tracker'
import { Alert } from '@/components/ui/alert'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Event Recap' }

export default async function EventRecapPage({ params }: { params: Promise<{ id: string }> }) {
  await requireClient()
  const { id } = await params
  const recap = await getEventRecap(id)

  if (!recap) {
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
      <RecapClient recap={recap} />
      <ActivityTracker
        eventType="page_viewed"
        metadata={{ event_id: id, photo_count: recap.photos.length }}
      />
    </div>
  )
}

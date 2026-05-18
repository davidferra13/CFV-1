import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getServiceTimeline } from '@/lib/mobile/service-ticker-actions'
import { ServiceTickerClient } from './service-ticker-client'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return { title: 'Service Details | ChefFlow' }
}

export default async function ServiceTickerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireChef()
  const { id: eventId } = await params

  let timeline
  try {
    timeline = await getServiceTimeline(eventId)
  } catch (err) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-2">Failed to load service timeline</p>
          <p className="text-stone-500 text-sm">
            {err instanceof Error ? err.message : 'Unknown error'}
          </p>
          <a
            href={`/events/${eventId}`}
            className="inline-block mt-4 px-4 py-2 bg-stone-800 text-stone-300 rounded-lg text-sm"
          >
            Back to Event
          </a>
        </div>
      </div>
    )
  }

  return <ServiceTickerClient initialTimeline={timeline} />
}

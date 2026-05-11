import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { getChefAvailability } from '@/lib/availability/client-browse-dates-actions'
import { BrowseDatesClient } from './browse-dates-client'
import { ActivityTracker } from '@/components/activity/activity-tracker'

export const metadata: Metadata = { title: 'Browse Dates' }

export default async function BrowseDatesPage() {
  await requireClient()
  const now = new Date()
  const { dates, chefName } = await getChefAvailability(now.getMonth() + 1, now.getFullYear())

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Browse Dates</h1>
        <p className="text-stone-400 mt-1">
          See when {chefName || 'your chef'} is available for booking.
        </p>
      </div>
      <BrowseDatesClient initialDates={dates} chefName={chefName} />
      <ActivityTracker eventType="page_viewed" />
    </div>
  )
}

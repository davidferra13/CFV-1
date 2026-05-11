import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { getMyTimeline } from '@/lib/timeline/client-timeline-actions'
import { TimelineClient } from './timeline-client'
import { ActivityTracker } from '@/components/activity/activity-tracker'

export const metadata: Metadata = { title: 'My Timeline' }

export default async function MyTimelinePage() {
  await requireClient()
  const { entries, stats } = await getMyTimeline()

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Timeline</h1>
        <p className="text-stone-400 mt-1">Your complete event history at a glance.</p>
      </div>
      <TimelineClient entries={entries} stats={stats} />
      <ActivityTracker eventType="page_viewed" />
    </div>
  )
}

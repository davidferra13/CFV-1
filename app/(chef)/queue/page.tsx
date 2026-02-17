// Priority Queue — Full Page View
// Shows all actionable items with full filtering and summary stats.
// Protected by layout via requireChef()

import { requireChef } from '@/lib/auth/get-user'
import { getPriorityQueue } from '@/lib/queue/actions'
import { QueueList } from '@/components/queue/queue-list'
import { QueueSummaryBar } from '@/components/queue/queue-summary'
import { QueueEmpty } from '@/components/queue/queue-empty'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function QueuePage() {
  await requireChef()
  const queue = await getPriorityQueue()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Priority Queue</h1>
          <p className="text-stone-600 mt-1">
            Everything that needs your attention, ranked by urgency.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
      </div>

      <QueueSummaryBar summary={queue.summary} />

      {queue.summary.allCaughtUp ? (
        <QueueEmpty />
      ) : (
        <QueueList items={queue.items} />
      )}
    </div>
  )
}

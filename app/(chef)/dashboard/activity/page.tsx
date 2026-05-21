import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/icons'
import { FeedCard } from '@/components/feed/feed-card'
import { getFeedItems } from '@/lib/feed/feed-actions'
import type { FeedItem } from '@/lib/feed/aggregation'

export const metadata: Metadata = { title: 'Dashboard Signals' }

async function getActivityItems(): Promise<FeedItem[]> {
  try {
    return await Promise.race([
      getFeedItems(),
      new Promise<FeedItem[]>((resolve) => setTimeout(() => resolve([]), 8000)),
    ])
  } catch (error) {
    console.error('[DashboardActivityPage] feed failed:', error)
    return []
  }
}

export default async function DashboardActivityPage() {
  const items = await getActivityItems()

  return (
    <div className="dashboard-page min-h-screen space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-label">Dashboard</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-100">All Signals</h1>
          <p className="mt-1 max-w-2xl text-sm text-stone-500">
            Full grouped readout of the dashboard operating signals.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-stone-700 px-3 text-sm font-medium text-stone-300 transition-colors hover:border-stone-600 hover:text-stone-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
      </div>

      <FeedCard items={items} maxVisibleGroups={48} viewAllHref="/dashboard/activity" />
    </div>
  )
}

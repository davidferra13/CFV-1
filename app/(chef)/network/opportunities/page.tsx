import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getOpportunityFeed } from '@/lib/network/opportunity-actions'
import { OpportunityBoard } from './opportunity-board'

export const metadata: Metadata = { title: 'Opportunities | Chef Community' }

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  await requireChef()
  const params = await searchParams
  const statusFilter = (params.status as 'open' | 'filled') ?? undefined

  const feed = await getOpportunityFeed(
    statusFilter ? { status: statusFilter } : undefined
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Opportunity Board</h1>
          <p className="text-stone-500 mt-1 text-sm">
            Browse open positions and gigs posted by chefs in the network
          </p>
        </div>
        <Link
          href="/network?tab=feed"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-stone-300 bg-stone-900 border border-stone-700 rounded-xl hover:bg-stone-800 transition-colors"
        >
          Back to Community
        </Link>
      </div>

      <OpportunityBoard initialFeed={feed} initialStatus={statusFilter ?? 'open'} />
    </div>
  )
}

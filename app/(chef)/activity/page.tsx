// Chef Activity Log — Full Page
// "What did I do last?" + "Where should I pick up?"

import type { Metadata } from 'next'
import type { ChefActivityDomain } from '@/lib/activity/chef-types'
import { getResumeItems } from '@/lib/activity/resume'
import { getActivityCountsByDomain, getChefActivityFeed } from '@/lib/activity/chef-actions'
import { getRecentClientActivity } from '@/lib/activity/actions'
import { ActivityPageClient } from './activity-page-client'

export const metadata: Metadata = { title: 'Activity - ChefFlow' }

export default async function ActivityPage() {
  // Fetch initial state for default filters:
  // tab=my, timeRange=7, actor=all, no domain filter.
  const [resumeItems, chefActivityResult, clientActivityResult, domainCounts] = await Promise.all([
    safe('resumeItems', () => getResumeItems(), []),
    safe('chefActivity', () => getChefActivityFeed({ limit: 25, daysBack: 7 }), { items: [], nextCursor: null }),
    safe('clientActivity', () => getRecentClientActivity({ limit: 25, daysBack: 7 }), { items: [], nextCursor: null }),
    safe('domainCounts', () => getActivityCountsByDomain(7), {} as Partial<Record<ChefActivityDomain, number>>),
  ])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-stone-800">Activity Log</h1>
        <p className="text-sm text-stone-500 mt-0.5">Everything you&apos;ve been working on, all in one place.</p>
      </div>

      <ActivityPageClient
        resumeItems={resumeItems}
        initialChefActivity={chefActivityResult.items}
        initialChefCursor={chefActivityResult.nextCursor}
        initialClientActivity={clientActivityResult.items}
        initialClientCursor={clientActivityResult.nextCursor}
        domainCounts={domainCounts}
      />
    </div>
  )
}

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[ActivityPage] ${label} failed:`, err)
    return fallback
  }
}

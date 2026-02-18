// Chef Activity Log — Full Page
// "What did I do last?" + "Where should I pick up?"

import type { Metadata } from 'next'
import type { ChefActivityDomain } from '@/lib/activity/chef-types'
import { getResumeItems } from '@/lib/activity/resume'
import { getChefActivity, getActivityCountsByDomain } from '@/lib/activity/chef-actions'
import { getRecentActivity } from '@/lib/activity/actions'
import { ActivityPageClient } from './activity-page-client'

export const metadata: Metadata = { title: 'Activity - ChefFlow' }

export default async function ActivityPage() {
  // Fetch all data in parallel
  const [resumeItems, chefActivity, clientActivity, domainCounts] = await Promise.all([
    safe('resumeItems', () => getResumeItems(), []),
    safe('chefActivity', () => getChefActivity({ limit: 100, daysBack: 30 }), []),
    safe('clientActivity', () => getRecentActivity(50), []),
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
        chefActivity={chefActivity}
        clientActivity={clientActivity}
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

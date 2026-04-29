// Chef Activity Log - Full Page
// "What did I do last?" + "Where should I pick up?"
// Two modes: Summary (key actions) and Retrace (step-by-step navigation trail)

import type { Metadata } from 'next'
import type { ChefActivityDomain } from '@/lib/activity/chef-types'
import { getResumeItems } from '@/lib/activity/resume'
import { getActivityCountsByDomain, getChefActivityFeed } from '@/lib/activity/chef-actions'
import { getRecentClientActivity } from '@/lib/activity/actions'
import { getActivityLogEnabled } from '@/lib/activity/preference-actions'
import { getBreadcrumbSessions } from '@/lib/activity/breadcrumb-actions'
import { ActivityPageClient } from './activity-page-client'

export const metadata: Metadata = { title: 'Activity' }
export const dynamic = 'force-dynamic'

export default async function ActivityPage() {
  // Fetch initial state for default filters:
  // tab=my, timeRange=7, actor=all, no domain filter.
  const loadResults = await Promise.all([
    loadActivitySection('resumeItems', 'Resume suggestions', () => getResumeItems(), []),
    loadActivitySection(
      'chefActivity',
      'Chef activity',
      () => getChefActivityFeed({ limit: 25, daysBack: 7 }),
      {
        items: [],
        nextCursor: null,
      }
    ),
    loadActivitySection(
      'clientActivity',
      'Client activity',
      () => getRecentClientActivity({ limit: 25, daysBack: 7 }),
      {
        items: [],
        nextCursor: null,
      }
    ),
    loadActivitySection(
      'domainCounts',
      'Activity filters',
      () => getActivityCountsByDomain(7),
      {} as Partial<Record<ChefActivityDomain, number>>
    ),
    loadActivitySection(
      'activityLogEnabled',
      'Activity logging preference',
      () => getActivityLogEnabled(),
      true
    ),
    loadActivitySection(
      'breadcrumbs',
      'Retrace history',
      () => getBreadcrumbSessions({ limit: 200, daysBack: 7 }),
      {
        sessions: [],
        nextCursor: null,
      }
    ),
  ])
  const [
    resumeItemsLoad,
    chefActivityLoad,
    clientActivityLoad,
    domainCountsLoad,
    activityLogEnabledLoad,
    breadcrumbLoad,
  ] = loadResults
  const resumeItems = resumeItemsLoad.data
  const chefActivityResult = chefActivityLoad.data
  const clientActivityResult = clientActivityLoad.data
  const domainCounts = domainCountsLoad.data
  const activityLogEnabled = activityLogEnabledLoad.data
  const breadcrumbResult = breadcrumbLoad.data
  const failedSections = loadResults.filter((result) => result.error !== null)
  const hasLoadFailures = failedSections.length > 0
  const failedSectionLabels = failedSections.map((failure) => failure.label).join(', ')

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-stone-200">Activity Log</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          Everything you&apos;ve been working on, all in one place.
        </p>
      </div>

      {hasLoadFailures && (
        <div
          role="alert"
          className="rounded-xl border border-amber-700/70 bg-amber-950/30 p-4 text-sm text-amber-100"
        >
          <h2 className="font-semibold text-amber-50">Some activity context is unavailable</h2>
          <p className="mt-1 text-amber-100/80">
            We could not load {failedSectionLabels}. The page is showing the activity data that is
            currently available.
          </p>
        </div>
      )}

      {!hasLoadFailures &&
        resumeItems.length === 0 &&
        chefActivityResult.items.length === 0 &&
        clientActivityResult.items.length === 0 && (
          <div className="rounded-xl border border-stone-700 bg-stone-900 p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-950">
              <svg
                className="h-6 w-6 text-brand-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-stone-100">No activity yet</h2>
            <p className="mt-2 text-sm text-stone-500 max-w-md mx-auto">
              As you create events, manage clients, and work through your pipeline, your actions
              will be logged here.
            </p>
          </div>
        )}

      <ActivityPageClient
        resumeItems={resumeItems}
        initialChefActivity={chefActivityResult.items}
        initialChefCursor={chefActivityResult.nextCursor}
        initialClientActivity={clientActivityResult.items}
        initialClientCursor={clientActivityResult.nextCursor}
        domainCounts={domainCounts}
        activityLogEnabled={activityLogEnabled}
        initialBreadcrumbSessions={breadcrumbResult.sessions}
        initialBreadcrumbCursor={breadcrumbResult.nextCursor}
      />
    </div>
  )
}

type ActivityLoadResult<T> = {
  key: string
  label: string
  data: T
  error: unknown | null
}

async function loadActivitySection<T>(
  key: string,
  label: string,
  fn: () => Promise<T>,
  fallback: T
): Promise<ActivityLoadResult<T>> {
  try {
    return {
      key,
      label,
      data: await fn(),
      error: null,
    }
  } catch (err) {
    console.error(`[ActivityPage] ${key} failed:`, err)

    return {
      key,
      label,
      data: fallback,
      error: err,
    }
  }
}

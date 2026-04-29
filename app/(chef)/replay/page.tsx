import type { Metadata } from 'next'
import { ChefFlowReplayView } from '@/components/activity/chef-flow-replay'
import { getRecentClientActivity } from '@/lib/activity/actions'
import { getBreadcrumbSessions } from '@/lib/activity/breadcrumb-actions'
import { getChefActivityFeed } from '@/lib/activity/chef-actions'
import type { ChefActivityQueryResult, ResumeItem } from '@/lib/activity/chef-types'
import { getResumeItems } from '@/lib/activity/resume'
import { buildChefFlowReplay } from '@/lib/activity/replay-model'
import type { ActivityQueryResult } from '@/lib/activity/types'
import type { BreadcrumbQueryResult } from '@/lib/activity/breadcrumb-types'

export const metadata: Metadata = { title: 'Catch Up' }
export const dynamic = 'force-dynamic'

export default async function ReplayPage() {
  const results = await Promise.all([
    loadReplaySection('resume', 'resume items', () => getResumeItems(), [] as ResumeItem[]),
    loadReplaySection(
      'chefActivity',
      'chef activity',
      () => getChefActivityFeed({ limit: 100, daysBack: 7 }),
      { items: [], nextCursor: null } as ChefActivityQueryResult
    ),
    loadReplaySection(
      'clientActivity',
      'client activity',
      () => getRecentClientActivity({ limit: 100, daysBack: 7 }),
      { items: [], nextCursor: null } as ActivityQueryResult
    ),
    loadReplaySection(
      'breadcrumbs',
      'retrace sessions',
      () => getBreadcrumbSessions({ limit: 200, daysBack: 7 }),
      { sessions: [], nextCursor: null } as BreadcrumbQueryResult
    ),
  ])

  const [resumeLoad, chefActivityLoad, clientActivityLoad, breadcrumbsLoad] = results
  const replay = buildChefFlowReplay({
    resumeItems: resumeLoad.data,
    chefActivity: chefActivityLoad.data.items,
    clientActivity: clientActivityLoad.data.items,
    breadcrumbSessions: breadcrumbsLoad.data.sessions,
  })

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <ChefFlowReplayView
        replay={replay}
        failedSections={results
          .filter((result) => result.error !== null)
          .map((result) => result.label)}
      />
    </div>
  )
}

type ReplayLoadResult<T> = {
  key: string
  label: string
  data: T
  error: unknown | null
}

async function loadReplaySection<T>(
  key: string,
  label: string,
  fn: () => Promise<T>,
  fallback: T
): Promise<ReplayLoadResult<T>> {
  try {
    return {
      key,
      label,
      data: await fn(),
      error: null,
    }
  } catch (err) {
    console.error(`[ReplayPage] ${key} failed:`, err)

    return {
      key,
      label,
      data: fallback,
      error: err,
    }
  }
}

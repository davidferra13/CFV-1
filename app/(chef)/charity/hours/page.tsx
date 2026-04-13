import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ChevronDown } from '@/components/ui/icons'
import { CharityHoursClient } from '@/components/charity/charity-hours-client'
import { CharityHoursSummaryCards } from '@/components/charity/charity-hours-summary'
import { WfpFeed } from '@/components/charity/wfp-feed'
import { requireChef } from '@/lib/auth/get-user'
import {
  getCharityHours,
  getCharityHoursSummary,
  getRecentCharityOrgs,
} from '@/lib/charity/hours-actions'
import { getWfpNews } from '@/lib/charity/wfp-actions'

export const metadata: Metadata = { title: 'Volunteer Log' }

export default async function CharityHoursPage() {
  await requireChef()

  const [entries, recentOrgs, summary, wfpStories] = await Promise.all([
    getCharityHours().catch(() => []),
    getRecentCharityOrgs().catch(() => []),
    getCharityHoursSummary().catch(() => null),
    getWfpNews(6).catch(() => []),
  ])

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/charity"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Community Impact
        </Link>
        <h1 className="text-2xl font-bold text-stone-100">Volunteer Log</h1>
        <p className="mt-1 max-w-2xl text-sm text-stone-500">
          Track service hours, keep organizations linked, and decide later whether any of this shows
          up on public surfaces.
        </p>
      </div>

      {summary != null && <CharityHoursSummaryCards summary={summary} />}
      <CharityHoursClient entries={entries} recentOrgs={recentOrgs} />

      {wfpStories.length > 0 && (
        <details className="rounded-xl border border-stone-700 bg-stone-900/60">
          <summary className="cursor-pointer list-none px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-stone-200">Food relief watchlist</p>
                <p className="mt-1 text-xs text-stone-500">
                  Optional reading if you want inspiration or context beyond your own local work.
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-stone-500" />
            </div>
          </summary>
          <div className="border-t border-stone-800 px-5 pb-5 pt-4">
            <WfpFeed stories={wfpStories} />
          </div>
        </details>
      )}
    </div>
  )
}

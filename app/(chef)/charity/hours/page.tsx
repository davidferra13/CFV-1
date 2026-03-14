import Link from 'next/link'
import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { requireAdmin } from '@/lib/auth/admin'
import {
  getCharityHours,
  getRecentCharityOrgs,
  getCharityHoursSummary,
} from '@/lib/charity/hours-actions'
import { getWfpNews } from '@/lib/charity/wfp-actions'
import { CharityHoursSummaryCards } from '@/components/charity/charity-hours-summary'
import { CharityHoursClient } from '@/components/charity/charity-hours-client'
import { WfpFeed } from '@/components/charity/wfp-feed'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = { title: 'Charity Hours - ChefFlow' }

export default async function CharityHoursPage() {
  await requireChef()
  await requireAdmin()

  const [entries, recentOrgs, summary, wfpStories] = await Promise.all([
    getCharityHours().catch(() => []),
    getRecentCharityOrgs().catch(() => []),
    getCharityHoursSummary().catch(() => ({
      totalHours: 0,
      totalEntries: 0,
      uniqueOrgs: 0,
      verified501cOrgs: 0,
      hoursByOrg: [],
    })),
    getWfpNews(6).catch(() => []),
  ])

  return (
    <div className="space-y-6">
      {/* Header with back link */}
      <div>
        <Link
          href="/charity"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300 transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Charity Hub
        </Link>
        <h1 className="text-2xl font-bold text-stone-100">Charity Hours</h1>
        <p className="text-sm text-stone-500 mt-1">Track your volunteer and charity work</p>
      </div>

      {/* Summary cards */}
      <CharityHoursSummaryCards summary={summary} />

      {/* Client-side interactive section: form + search + list */}
      <CharityHoursClient entries={entries} recentOrgs={recentOrgs} />

      {/* WFP news feed */}
      <WfpFeed stories={wfpStories} />
    </div>
  )
}

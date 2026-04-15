// Year View Page
// 52-week grid showing event density and scheduling gaps at a glance.
// Chef can plan the whole year and click any week to open the week planner.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'

export const metadata: Metadata = {
  title: 'Year Planner',
}
import { getYearSummary } from '@/lib/scheduling/prep-block-actions'
import { YearViewClient } from './year-view-client'

export default async function YearViewPage({ searchParams }: { searchParams: { year?: string } }) {
  await requireChef()

  const currentYear = new Date().getFullYear()
  const year = parseInt(searchParams.year ?? String(currentYear), 10)

  let summary: Awaited<ReturnType<typeof getYearSummary>> | null = null
  try {
    summary = await getYearSummary(year)
  } catch {
    // render empty state below
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {summary ? (
        <YearViewClient summary={summary} year={year} currentYear={currentYear} />
      ) : (
        <div className="rounded-lg border border-stone-700 bg-stone-800/50 px-6 py-8 text-center">
          <p className="text-stone-400 font-medium mb-1">Could not load year summary</p>
          <p className="text-stone-500 text-sm">Check your connection and refresh.</p>
        </div>
      )}
    </div>
  )
}

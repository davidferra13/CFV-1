// Year View Page
// 52-week grid showing event density and scheduling gaps at a glance.
// Chef can plan the whole year and click any week to open the week planner.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'

export const metadata: Metadata = {
  title: 'Year Planner | ChefFlow',
}
import { getYearSummary } from '@/lib/scheduling/prep-block-actions'
import { YearViewClient } from './year-view-client'

export default async function YearViewPage({ searchParams }: { searchParams: { year?: string } }) {
  await requireChef()

  const currentYear = new Date().getFullYear()
  const year = parseInt(searchParams.year ?? String(currentYear), 10)

  const summary = await getYearSummary(year)

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <YearViewClient summary={summary} year={year} currentYear={currentYear} />
    </div>
  )
}

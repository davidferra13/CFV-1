import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { findConsolidationOpportunities, getWeeklyPrepPlan } from '@/lib/intelligence/prep-consolidation'
import { PrepConsolidationClient } from './prep-consolidation-client'

export const metadata: Metadata = { title: 'Prep Consolidation' }

function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.getFullYear(), now.getMonth(), diff)
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
}

function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + 6)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default async function PrepConsolidationPage() {
  await requireChef()

  const weekStart = getWeekStart()
  const weekEnd = getWeekEnd(weekStart)

  // Fetch both in parallel
  const [opportunities, plan] = await Promise.all([
    findConsolidationOpportunities({ start: weekStart, end: weekEnd }).catch(() => []),
    getWeeklyPrepPlan(weekStart).catch(() => ({
      days: [],
      totalPrepMinutes: 0,
      totalSavedMinutes: 0,
      eventsCovered: 0,
    })),
  ])

  return (
    <PrepConsolidationClient
      initialOpportunities={opportunities}
      initialPlan={plan}
      initialWeekStart={weekStart}
    />
  )
}

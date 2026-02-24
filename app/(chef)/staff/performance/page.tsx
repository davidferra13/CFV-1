// Staff Performance Page
// Sortable board showing on-time rates, cancellations, ratings, and total events per staff member.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getStaffPerformanceBoard } from '@/lib/staff/performance-actions'
import { PerformanceBoard } from '@/components/staff/performance-board'

export const metadata: Metadata = { title: 'Staff Performance - ChefFlow' }

export default async function StaffPerformancePage() {
  await requireChef()

  const scores = await getStaffPerformanceBoard().catch(() => [])

  const formattedScores = (scores as any[]).map((s: any) => ({
    staffMemberId: s.staffMemberId || s.id,
    staffName: s.staffName,
    onTimeRate: s.onTimeRate,
    cancellationCount: s.cancellationCount,
    avgRating: s.avgRating,
    totalEvents: s.totalEvents,
  }))

  return (
    <div className="space-y-6">
      <div>
        <Link href="/staff" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Staff Roster
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Staff Performance</h1>
        <p className="text-stone-500 mt-1">
          Review team reliability, punctuality, and ratings. Click column headers to sort.
        </p>
      </div>

      {formattedScores.length === 0 ? (
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-8 text-center">
          <p className="text-stone-500 text-sm">
            No performance data yet. Performance scores are computed from event assignments and
            clock entries. Start assigning staff to events and tracking hours to build performance
            data.
          </p>
        </div>
      ) : (
        <PerformanceBoard scores={formattedScores} />
      )}
    </div>
  )
}

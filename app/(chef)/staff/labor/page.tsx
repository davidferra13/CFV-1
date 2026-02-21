// Labor Dashboard Page
// Monthly labor cost analytics with chart, ratio targets, and event-level breakdown.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getLaborByMonth } from '@/lib/staff/labor-dashboard-actions'
import { LaborDashboard } from '@/components/staff/labor-dashboard'

export const metadata: Metadata = { title: 'Labor Dashboard - ChefFlow' }

export default async function StaffLaborPage() {
  await requireChef()

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // Fetch labor data for each month of the current year plus current month detail
  const monthPromises = Array.from({ length: currentMonth }, (_, i) => {
    const month = i + 1
    return getLaborByMonth(currentYear, month).catch(() => ({
      year: currentYear,
      month,
      events: [],
      totalLaborCents: 0,
      totalRevenueCents: 0,
      laborRevenueRatio: 0,
    }))
  })

  const monthResults = await Promise.all(monthPromises)

  // Build the labor-by-month series for the chart
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const laborByMonth = monthResults.map((r: any) => ({
    month: MONTH_NAMES[r.month - 1],
    laborCents: r.totalLaborCents ?? 0,
    revenueCents: r.totalRevenueCents ?? 0,
    ratio: r.laborRevenueRatio ?? 0,
  }))

  // Current month event-level detail
  const currentMonthData = monthResults[monthResults.length - 1] as any
  const currentMonthDetail = ((currentMonthData?.events ?? []) as any[]).map((e: any) => ({
    eventName: e.eventName || e.title || 'Event',
    laborCents: e.laborCents ?? e.totalPayCents ?? 0,
    revenueCents: e.revenueCents ?? 0,
    staffCount: e.staffCount ?? e.entries?.length ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div>
        <Link href="/staff" className="text-sm text-stone-500 hover:text-stone-700">
          &larr; Staff Roster
        </Link>
        <h1 className="text-3xl font-bold text-stone-900 mt-1">Labor Dashboard</h1>
        <p className="text-stone-500 mt-1">
          Track labor costs against revenue. Target 20-30% labor ratio for healthy margins.
        </p>
      </div>

      <LaborDashboard
        laborByMonth={laborByMonth}
        currentMonthDetail={currentMonthDetail}
      />
    </div>
  )
}

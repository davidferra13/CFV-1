import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { PayrollReport } from '@/components/staffing/PayrollReport'
import { getPayrollReportForPeriod } from '@/lib/staff/staffing-actions'
import { getLaborRevenueRatio } from '@/lib/staff/labor-dashboard-actions'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Labor Dashboard' }

function getCurrentMonthWindow() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  return {
    startDate: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
    endDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
  }
}

export default async function StaffLaborPage() {
  await requireChef()
  await requirePro('staff-management')

  const period = getCurrentMonthWindow()
  const [report, laborRatio] = await Promise.all([
    getPayrollReportForPeriod(period.startDate, period.endDate).catch(() => ({
      startDate: period.startDate,
      endDate: period.endDate,
      rows: [],
      totalHours: 0,
      totalMinutes: 0,
      totalLaborCostCents: 0,
    })),
    getLaborRevenueRatio(period.startDate, period.endDate).catch(() => null),
  ])

  return (
    <div className="space-y-6">
      <div>
        <Link href="/staff" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Staff Roster
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Labor Dashboard</h1>
        <p className="text-stone-500 mt-1">
          Payroll-period labor totals from clocked entries and staff hourly rates.
        </p>
      </div>

      {laborRatio && laborRatio.totalRevenueCents > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-stone-100">
                {laborRatio.ratioPercent.toFixed(1)}%
              </p>
              <p className="text-xs text-stone-500 mt-1">Labor-to-Revenue Ratio</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-stone-100">
                ${(laborRatio.totalLaborCostCents / 100).toFixed(0)}
              </p>
              <p className="text-xs text-stone-500 mt-1">Total Labor Cost</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-stone-100">
                ${(laborRatio.totalRevenueCents / 100).toFixed(0)}
              </p>
              <p className="text-xs text-stone-500 mt-1">Event Revenue</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-stone-100">{laborRatio.eventCount}</p>
              <p className="text-xs text-stone-500 mt-1">Events This Period</p>
            </CardContent>
          </Card>
        </div>
      )}

      <PayrollReport initialData={report} />
    </div>
  )
}

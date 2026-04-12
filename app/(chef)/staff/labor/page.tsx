import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { PayrollReport } from '@/components/staffing/PayrollReport'
import { getPayrollReportForPeriod } from '@/lib/staff/staffing-actions'

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

  const period = getCurrentMonthWindow()
  const report = await getPayrollReportForPeriod(period.startDate, period.endDate).catch(() => ({
    startDate: period.startDate,
    endDate: period.endDate,
    rows: [],
    totalHours: 0,
    totalMinutes: 0,
    totalLaborCostCents: 0,
  }))

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

      <PayrollReport initialData={report} />
    </div>
  )
}

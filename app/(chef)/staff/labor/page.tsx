import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { PayrollReport } from '@/components/staffing/PayrollReport'
import { getPayrollReportForPeriod } from '@/lib/staff/staffing-actions'
import { getStaffAvailabilityGrid } from '@/lib/staff/availability-actions'
import { formatCurrency } from '@/lib/utils/currency'

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
  const [report, availabilityRows] = await Promise.all([
    getPayrollReportForPeriod(period.startDate, period.endDate).catch(() => ({
      startDate: period.startDate,
      endDate: period.endDate,
      rows: [],
      totalHours: 0,
      totalMinutes: 0,
      totalLaborCostCents: 0,
    })),
    getStaffAvailabilityGrid(period.startDate, period.endDate).catch(() => []),
  ])

  const recordedUnavailableDays = availabilityRows.reduce((total, row) => {
    return total + Object.values(row.dates).filter((day) => day.isAvailable === false).length
  }, 0)
  const recordedAvailableDays = availabilityRows.reduce((total, row) => {
    return total + Object.values(row.dates).filter((day) => day.isAvailable === true).length
  }, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/staff" className="text-sm text-stone-500 hover:text-stone-300">
            &larr; Staff Roster
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">Labor Dashboard</h1>
          <p className="text-stone-500 mt-1">
            Payroll-period labor totals from clocked entries and staff hourly rates.
          </p>
        </div>
        <Link
          href="/staff/availability"
          className="inline-flex items-center justify-center rounded-lg border border-stone-600 px-3 py-2 text-sm font-medium text-stone-300 transition-colors hover:bg-stone-800"
        >
          Availability
        </Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
          <p className="text-xs uppercase tracking-wide text-stone-500">Clocked Hours</p>
          <p className="mt-2 text-2xl font-semibold text-stone-100">
            {report.totalHours.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </p>
        </div>
        <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
          <p className="text-xs uppercase tracking-wide text-stone-500">Labor Cost</p>
          <p className="mt-2 text-2xl font-semibold text-stone-100">
            {formatCurrency(report.totalLaborCostCents)}
          </p>
        </div>
        <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
          <p className="text-xs uppercase tracking-wide text-stone-500">Unavailable Days</p>
          <p className="mt-2 text-2xl font-semibold text-stone-100">
            {recordedUnavailableDays.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {recordedAvailableDays.toLocaleString()} available days recorded this period
          </p>
        </div>
      </section>

      <PayrollReport initialData={report} />
    </div>
  )
}

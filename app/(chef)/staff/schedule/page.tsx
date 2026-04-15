import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { StaffScheduler } from '@/components/staffing/StaffScheduler'
import { getDefaultStaffingWindow, getStaffSchedulerData } from '@/lib/staff/staffing-actions'

export const metadata: Metadata = { title: 'Staff Schedule' }

export default async function StaffSchedulePage() {
  await requireChef()
  await requirePro('staff-management')
  let window: Awaited<ReturnType<typeof getDefaultStaffingWindow>>
  try {
    window = await getDefaultStaffingWindow()
  } catch {
    notFound()
  }
  const schedulerData = await getStaffSchedulerData(window.startDate, window.endDate).catch(() => ({
    startDate: window.startDate,
    endDate: window.endDate,
    staff: [],
    events: [],
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Link href="/staff" className="text-sm text-stone-500 hover:text-stone-300">
            &larr; Staff Roster
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">Staff Schedule</h1>
          <p className="text-stone-500 mt-1">
            Assign team members to upcoming events with scheduling conflict checks and availability
            context.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/staff/availability"
            className="inline-flex items-center justify-center px-3 py-2 border border-stone-600 text-stone-300 rounded-lg hover:bg-stone-800 transition-colors font-medium text-sm"
          >
            Availability
          </Link>
          <Link
            href="/staff/labor"
            className="inline-flex items-center justify-center px-3 py-2 border border-stone-600 text-stone-300 rounded-lg hover:bg-stone-800 transition-colors font-medium text-sm"
          >
            Labor Costs
          </Link>
        </div>
      </div>
      <StaffScheduler initialData={schedulerData} />
    </div>
  )
}

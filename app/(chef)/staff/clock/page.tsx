import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { TimeTracker } from '@/components/staffing/TimeTracker'
import { getDefaultStaffingWindow, getTimeTrackerData } from '@/lib/staff/staffing-actions'

export const metadata: Metadata = { title: 'Clock In/Out' }

export default async function StaffClockPage() {
  await requireChef()
  await requirePro('staff-management')

  const window = await getDefaultStaffingWindow()
  const trackerData = await getTimeTrackerData(window.startDate, window.endDate).catch(() => ({
    startDate: window.startDate,
    endDate: window.endDate,
    staff: [],
    events: [],
    entries: [],
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/staff" className="text-sm text-stone-500 hover:text-stone-300">
            &larr; Staff Roster
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">Clock In/Out</h1>
          <p className="text-stone-500 mt-1">
            Track staff hours in real time. Clock team members in and out during events or prep
            sessions.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/staff/availability"
            className="inline-flex items-center justify-center rounded-lg border border-stone-600 px-3 py-2 text-sm font-medium text-stone-300 transition-colors hover:bg-stone-800"
          >
            Availability
          </Link>
          <Link
            href="/staff/schedule"
            className="inline-flex items-center justify-center rounded-lg border border-stone-600 px-3 py-2 text-sm font-medium text-stone-300 transition-colors hover:bg-stone-800"
          >
            Schedule
          </Link>
        </div>
      </div>

      <TimeTracker initialData={trackerData} />
    </div>
  )
}

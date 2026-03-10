import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { TimeTracker } from '@/components/staffing/TimeTracker'
import { getDefaultStaffingWindow, getTimeTrackerData } from '@/lib/staffing/actions'
import { TimeClock } from '@/components/staff/time-clock'
import { listStaffMembers } from '@/lib/staff/actions'
import { getCurrentShift, getTimeEntries } from '@/lib/staff/time-tracking-actions'
import { DailyLaborSummaryCard } from './daily-labor-summary'
import { getDailyLaborSummary } from '@/lib/staff/time-tracking-actions'

export const metadata: Metadata = { title: 'Clock In/Out - ChefFlow' }

export default async function StaffClockPage() {
  await requireChef()

  const today = new Date().toISOString().split('T')[0]

  const [window_, staffList, todayLabor] = await Promise.all([
    getDefaultStaffingWindow(),
    listStaffMembers(true).catch(() => []),
    getDailyLaborSummary(today).catch(() => ({
      date: today,
      totalHours: 0,
      totalCostCents: 0,
      staffEntries: [],
    })),
  ])

  const trackerData = await getTimeTrackerData(window_.startDate, window_.endDate).catch(() => ({
    startDate: window_.startDate,
    endDate: window_.endDate,
    staff: [],
    events: [],
    entries: [],
  }))

  // Build current shifts map
  const staffMembers = (staffList as any[]).map((s: any) => ({
    id: s.id,
    name: s.name,
    hourlyRateCents: s.hourly_rate_cents ?? 0,
  }))

  const shiftsMap = new Map<string, any>()
  await Promise.all(
    staffMembers.map(async (s) => {
      try {
        const shift = await getCurrentShift(s.id)
        shiftsMap.set(s.id, shift)
      } catch {
        shiftsMap.set(s.id, null)
      }
    })
  )

  // Get today's completed entries
  const todayEntries = await getTimeEntries({
    startDate: today,
    endDate: today,
  }).catch(() => [])

  return (
    <div className="space-y-6">
      <div>
        <Link href="/staff" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Staff Roster
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Clock In/Out</h1>
        <p className="text-stone-500 mt-1">
          Track staff hours in real time. Clock team members in and out, manage breaks, and review
          daily labor costs.
        </p>
      </div>

      {staffMembers.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <TimeClock
            staffMembers={staffMembers}
            initialShifts={shiftsMap}
            todayEntries={todayEntries}
          />
          <DailyLaborSummaryCard summary={todayLabor} />
        </div>
      ) : (
        <TimeTracker initialData={trackerData} />
      )}
    </div>
  )
}

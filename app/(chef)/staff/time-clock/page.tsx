import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { listStaffMembers } from '@/lib/staff/actions'
import { getTimesheetForDate } from '@/lib/staff/punch-clock-actions'
import { PunchClockPanel } from '@/components/staff/punch-clock-panel'

export const metadata: Metadata = { title: 'Time Clock - ChefFlow' }

export default async function TimeClockPage() {
  await requireChef()

  const today = new Date().toISOString().split('T')[0]

  const [staffList, todayEntries] = await Promise.all([
    listStaffMembers(true).catch(() => []),
    getTimesheetForDate(today).catch(() => []),
  ])

  const staffMembers = (staffList as any[]).map((s: any) => ({
    id: s.id,
    name: s.name,
    role: s.role ?? 'other',
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/staff" className="text-sm text-stone-500 hover:text-stone-300">
            &larr; Staff Roster
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">Time Clock</h1>
          <p className="text-stone-500 mt-1">
            Clock staff in and out, track shift durations, and manage today&apos;s timesheet.
          </p>
        </div>
        <Link
          href="/staff/time-clock/weekly"
          className="rounded-lg border border-stone-700 bg-stone-800 px-4 py-2 text-sm text-stone-300 hover:bg-stone-700 transition-colors"
        >
          Weekly Summary
        </Link>
      </div>

      <PunchClockPanel staffMembers={staffMembers} initialEntries={todayEntries} />
    </div>
  )
}

// Clock In/Out Page
// Staff time tracking — clock in, clock out, view active timers and recent entries.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { listStaffMembers } from '@/lib/staff/actions'
import { getClockEntries } from '@/lib/staff/clock-actions'
import { ClockPanel } from '@/components/staff/clock-panel'

export const metadata: Metadata = { title: 'Clock In/Out - ChefFlow' }

export default async function StaffClockPage() {
  await requireChef()

  const [staff, clockEntries] = await Promise.all([
    listStaffMembers(true).catch(() => []),
    getClockEntries().catch(() => []),
  ])

  const staffMembers = (staff as any[]).map((s: any) => ({
    id: s.id,
    name: s.name,
  }))

  const entries = (clockEntries as any[]).map((e: any) => ({
    id: e.id,
    staffMemberId: e.staffMemberId,
    staffName: e.staffName,
    clockInAt: e.clockInAt,
    clockOutAt: e.clockOutAt,
    totalMinutes: e.totalMinutes,
    status: e.status,
  }))

  return (
    <div className="max-w-3xl mx-auto space-y-6">
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

      {staffMembers.length === 0 ? (
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-8 text-center">
          <p className="text-stone-500 text-sm">
            No active staff members yet. Add team members from the{' '}
            <Link href="/staff" className="text-brand-600 hover:underline">
              Staff Roster
            </Link>{' '}
            to start tracking hours.
          </p>
        </div>
      ) : (
        <ClockPanel entries={entries} staffMembers={staffMembers} />
      )}
    </div>
  )
}

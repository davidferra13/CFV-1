// Staff Availability Page
// 7-day grid showing which staff members are available on which dates.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { listStaffMembers } from '@/lib/staff/actions'
import { getStaffAvailabilityGrid } from '@/lib/staff/availability-actions'
import { AvailabilityGrid } from '@/components/staff/availability-grid'

export const metadata: Metadata = { title: 'Staff Availability - ChefFlow' }

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export default async function StaffAvailabilityPage() {
  await requireChef()

  const today = new Date().toISOString().split('T')[0]
  const endDate = addDays(today, 6)

  const [staff, gridRows] = await Promise.all([
    listStaffMembers(true).catch(() => []),
    getStaffAvailabilityGrid(today, endDate).catch(() => []),
  ])

  // Transform grid rows into flat availability records for the AvailabilityGrid component
  const staffMembers = (staff as any[]).map((s: any) => ({
    id: s.id,
    name: s.name,
    role: s.role,
  }))

  const availability = (gridRows as any[]).flatMap((row: any) =>
    Object.entries(row.dates || {}).map(([date, info]: [string, any]) => ({
      staffMemberId: row.staffMemberId,
      date,
      isAvailable: info.isAvailable,
    }))
  )

  return (
    <div className="space-y-6">
      <div>
        <Link href="/staff" className="text-sm text-stone-500 hover:text-stone-700">
          &larr; Staff Roster
        </Link>
        <h1 className="text-3xl font-bold text-stone-900 mt-1">Staff Availability</h1>
        <p className="text-stone-500 mt-1">
          View and toggle staff availability for the next 7 days. Click a cell to mark available or unavailable.
        </p>
      </div>

      {staffMembers.length === 0 ? (
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-8 text-center">
          <p className="text-stone-500 text-sm">
            No active staff members yet. Add team members from the{' '}
            <Link href="/staff" className="text-brand-600 hover:underline">Staff Roster</Link>{' '}
            first.
          </p>
        </div>
      ) : (
        <AvailabilityGrid
          staffMembers={staffMembers}
          availability={availability}
          startDate={today}
          endDate={endDate}
        />
      )}
    </div>
  )
}

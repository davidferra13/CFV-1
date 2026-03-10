import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getAllAvailability, getActiveStaff } from '@/lib/scheduling/shift-actions'
import { AvailabilityEditor } from '@/components/scheduling/availability-editor'

export const metadata: Metadata = { title: 'Staff Availability - ChefFlow' }

export default async function AvailabilityPage() {
  await requireChef()

  const [availability, staffMembers] = await Promise.all([getAllAvailability(), getActiveStaff()])

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-4">
          <Link href="/scheduling" className="text-sm text-stone-500 hover:text-stone-300">
            &larr; Scheduling
          </Link>
          <Link href="/scheduling/shifts" className="text-sm text-stone-500 hover:text-stone-300">
            Shifts
          </Link>
          <Link href="/scheduling/swaps" className="text-sm text-stone-500 hover:text-stone-300">
            Swap Board
          </Link>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-stone-100">Staff Availability</h1>
        <p className="mt-1 text-stone-400">
          Set weekly availability preferences for each team member. This is used by auto-fill and
          displayed on the schedule grid.
        </p>
      </div>

      <AvailabilityEditor staffMembers={staffMembers} initialAvailability={availability} />
    </div>
  )
}

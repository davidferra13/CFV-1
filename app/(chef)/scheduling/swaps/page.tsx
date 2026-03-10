import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getOpenSwaps, getActiveStaff } from '@/lib/scheduling/shift-actions'
import { ShiftSwapBoard } from '@/components/scheduling/shift-swap-board'

export const metadata: Metadata = { title: 'Shift Swaps - ChefFlow' }

export default async function SwapsPage() {
  await requireChef()

  const [swaps, staffMembers] = await Promise.all([getOpenSwaps(), getActiveStaff()])

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
          <Link
            href="/scheduling/availability"
            className="text-sm text-stone-500 hover:text-stone-300"
          >
            Availability
          </Link>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-stone-100">Shift Swap Board</h1>
        <p className="mt-1 text-stone-400">
          Open swap requests from your team. Staff can pick up available shifts, and managers
          approve or deny swaps.
        </p>
      </div>

      <ShiftSwapBoard initialSwaps={swaps} staffMembers={staffMembers} isManager={true} />
    </div>
  )
}

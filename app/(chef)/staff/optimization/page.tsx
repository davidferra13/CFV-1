import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { requireFocusAccess } from '@/lib/billing/require-focus-access'
import { StaffOptimizationClient } from './staff-optimization-client'

export const metadata: Metadata = { title: 'Staff Optimization' }

export default async function StaffOptimizationPage() {
  await requireChef()
  await requireFocusAccess()

  // Default: current week (Monday to Sunday)
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday)
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Link href="/staff" className="text-sm text-stone-500 hover:text-stone-300">
            &larr; Staff
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">Staff Optimization</h1>
          <p className="text-stone-500 mt-1">
            Detect double bookings, find sharing opportunities, and see the full staff schedule at a glance.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/staff/schedule"
            className="inline-flex items-center justify-center px-3 py-2 border border-stone-600 text-stone-300 rounded-lg hover:bg-stone-800 transition-colors font-medium text-sm"
          >
            Schedule
          </Link>
          <Link
            href="/staff/availability"
            className="inline-flex items-center justify-center px-3 py-2 border border-stone-600 text-stone-300 rounded-lg hover:bg-stone-800 transition-colors font-medium text-sm"
          >
            Availability
          </Link>
        </div>
      </div>

      <StaffOptimizationClient
        defaultStart={fmt(monday)}
        defaultEnd={fmt(sunday)}
      />
    </div>
  )
}

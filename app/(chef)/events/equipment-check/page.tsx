import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { requireFocusAccess } from '@/lib/billing/require-focus-access'
import { EquipmentCheckClient } from './equipment-check-client'

export const metadata: Metadata = { title: 'Equipment Allocation' }

export default async function EquipmentCheckPage() {
  await requireChef()
  await requireFocusAccess()

  // Default: today + 14 days
  const now = new Date()
  const twoWeeks = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14)

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Link href="/events" className="text-sm text-stone-500 hover:text-stone-300">
            &larr; Events
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">Equipment Allocation</h1>
          <p className="text-stone-500 mt-1">
            See which equipment is needed across events, spot conflicts, and track inventory availability.
          </p>
        </div>
        <Link
          href="/operations/equipment"
          className="inline-flex items-center justify-center px-3 py-2 border border-stone-600 text-stone-300 rounded-lg hover:bg-stone-800 transition-colors font-medium text-sm"
        >
          Equipment Inventory
        </Link>
      </div>

      <EquipmentCheckClient
        defaultStart={fmt(now)}
        defaultEnd={fmt(twoWeeks)}
      />
    </div>
  )
}

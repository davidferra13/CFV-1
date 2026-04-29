// Waste Log Page
// Track waste/spoilage across all stations with reason codes and value.
// Formula: actual_food_cost = purchases - usable_inventory + waste_value

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { WasteLog } from '@/components/stations/waste-log'

export const metadata: Metadata = { title: 'Waste Log' }

export default async function WasteLogPage() {
  await requireChef()

  // Get last 7 days of waste
  const now = new Date()
  const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
  const startDate = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, '0')}-${String(weekAgo.getDate()).padStart(2, '0')}`
  const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Link href="/stations" className="text-sm text-stone-500 hover:text-stone-300">
        &larr; Back to Stations
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Waste Log</h1>
          <p className="mt-1 text-sm text-stone-500">
            Track waste and spoilage across all stations. Feeds into true food cost calculations.
          </p>
        </div>
        <Link
          href="/stations/waste/patterns"
          className="inline-flex items-center gap-2 rounded-lg bg-stone-800 border border-stone-600 px-3 py-2 text-sm text-stone-300 hover:bg-stone-700 transition-colors"
        >
          View Patterns
        </Link>
      </div>

      <WasteLog startDate={startDate} endDate={endDate} showSummary />
    </div>
  )
}

// Waste Log Page
// Track waste/spoilage across all stations with reason codes and value.
// Formula: actual_food_cost = purchases - usable_inventory + waste_value

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getWasteLog, getWasteSummary } from '@/lib/stations/waste-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Waste Log' }

const REASON_LABELS: Record<string, string> = {
  expired: 'Expired',
  damaged: 'Damaged',
  overproduced: 'Overproduced',
  dropped: 'Dropped',
  other: 'Other',
}

const REASON_COLORS: Record<string, 'error' | 'warning' | 'default'> = {
  expired: 'error',
  damaged: 'error',
  overproduced: 'warning',
  dropped: 'warning',
  other: 'default',
}

export default async function WasteLogPage() {
  const user = await requireChef()

  // Get last 7 days of waste
  const now = new Date()
  const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
  const startDate = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, '0')}-${String(weekAgo.getDate()).padStart(2, '0')}`
  const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const [wasteEntries, summary]: [any, any] = await Promise.all([
    getWasteLog(startDate, endDate),
    getWasteSummary(startDate, endDate),
  ])

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

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-stone-500">Total Waste (7 days)</p>
            <p className="text-3xl font-bold text-stone-100">{summary.totalEntries ?? 0} items</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-stone-500">Waste Value (7 days)</p>
            <p className="text-3xl font-bold text-stone-100">
              ${((summary.totalValueCents ?? 0) / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-stone-500">Top Reason</p>
            <p className="text-3xl font-bold text-stone-100">
              {summary.topReason ? (REASON_LABELS[summary.topReason] ?? summary.topReason) : '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Waste Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Recent Waste Entries
            <span className="ml-2 text-sm font-normal text-stone-500">
              ({startDate} to {endDate})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {wasteEntries.length === 0 ? (
            <p className="text-sm text-stone-500">No waste logged in the last 7 days.</p>
          ) : (
            <div className="space-y-2">
              {wasteEntries.map((entry: any) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between text-sm border-b border-stone-800 pb-2"
                >
                  <div>
                    <span className="text-stone-200">
                      {entry.quantity} {entry.unit}
                    </span>
                    <Badge variant={REASON_COLORS[entry.reason] ?? 'default'} className="ml-2">
                      {REASON_LABELS[entry.reason] ?? entry.reason}
                    </Badge>
                    <span className="text-stone-500 ml-2">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                    {entry.notes && <span className="text-stone-400 ml-2">{entry.notes}</span>}
                  </div>
                  {entry.estimated_value_cents > 0 && (
                    <span className="text-stone-400">
                      ${(entry.estimated_value_cents / 100).toFixed(2)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

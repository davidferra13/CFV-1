'use client'

import type { LocationStats } from '@/lib/locations/location-actions'

interface LocationComparisonProps {
  stats: LocationStats[]
}

export function LocationComparison({ stats }: LocationComparisonProps) {
  if (stats.length === 0) {
    return (
      <div className="bg-stone-800 border border-stone-700 rounded-lg p-8 text-center">
        <p className="text-stone-500">
          No locations with data to compare. Add locations in Settings first.
        </p>
      </div>
    )
  }

  const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`

  // Find totals for context
  const totalStaff = stats.reduce((sum, s) => sum + s.staffCount, 0)
  const totalInventory = stats.reduce((sum, s) => sum + s.inventoryValueCents, 0)
  const totalSales = stats.reduce((sum, s) => sum + s.recentSalesCount, 0)

  return (
    <div className="space-y-6">
      {/* Totals row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-stone-800 border border-stone-700 rounded-lg p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide">Total Staff</p>
          <p className="text-2xl font-bold text-stone-100 mt-1">{totalStaff}</p>
        </div>
        <div className="bg-stone-800 border border-stone-700 rounded-lg p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide">Total Inventory Value</p>
          <p className="text-2xl font-bold text-stone-100 mt-1">{formatCents(totalInventory)}</p>
        </div>
        <div className="bg-stone-800 border border-stone-700 rounded-lg p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide">Total Sales (30d)</p>
          <p className="text-2xl font-bold text-stone-100 mt-1">{totalSales}</p>
        </div>
      </div>

      {/* Comparison table */}
      <div className="bg-stone-800 border border-stone-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-700">
              <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                Location
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                Staff
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                Inventory Value
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                Sales (30d)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-700">
            {stats.map((s) => (
              <tr key={s.locationId} className="hover:bg-stone-700/50 transition-colors">
                <td className="px-4 py-3 text-stone-200 font-medium">{s.locationName}</td>
                <td className="px-4 py-3 text-stone-300 text-right">{s.staffCount}</td>
                <td className="px-4 py-3 text-stone-300 text-right">
                  {formatCents(s.inventoryValueCents)}
                </td>
                <td className="px-4 py-3 text-stone-300 text-right">{s.recentSalesCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Per-location bar visualization */}
      {stats.length > 1 && (
        <div className="bg-stone-800 border border-stone-700 rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-medium text-stone-300">Distribution</h3>

          {/* Staff distribution */}
          {totalStaff > 0 && (
            <div>
              <p className="text-xs text-stone-500 mb-1">Staff</p>
              <div className="flex h-6 rounded overflow-hidden">
                {stats.map((s, i) => {
                  const pct = (s.staffCount / totalStaff) * 100
                  if (pct === 0) return null
                  const colors = [
                    'bg-blue-600',
                    'bg-green-600',
                    'bg-orange-600',
                    'bg-purple-600',
                    'bg-pink-600',
                  ]
                  return (
                    <div
                      key={s.locationId}
                      className={`${colors[i % colors.length]} flex items-center justify-center text-[10px] text-white font-medium`}
                      style={{ width: `${pct}%` }}
                      title={`${s.locationName}: ${s.staffCount}`}
                    >
                      {pct > 10 ? s.locationName : ''}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Inventory distribution */}
          {totalInventory > 0 && (
            <div>
              <p className="text-xs text-stone-500 mb-1">Inventory Value</p>
              <div className="flex h-6 rounded overflow-hidden">
                {stats.map((s, i) => {
                  const pct = (s.inventoryValueCents / totalInventory) * 100
                  if (pct === 0) return null
                  const colors = [
                    'bg-blue-600',
                    'bg-green-600',
                    'bg-orange-600',
                    'bg-purple-600',
                    'bg-pink-600',
                  ]
                  return (
                    <div
                      key={s.locationId}
                      className={`${colors[i % colors.length]} flex items-center justify-center text-[10px] text-white font-medium`}
                      style={{ width: `${pct}%` }}
                      title={`${s.locationName}: ${formatCents(s.inventoryValueCents)}`}
                    >
                      {pct > 10 ? s.locationName : ''}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-3">
            {stats.map((s, i) => {
              const colors = [
                'bg-blue-600',
                'bg-green-600',
                'bg-orange-600',
                'bg-purple-600',
                'bg-pink-600',
              ]
              return (
                <div
                  key={s.locationId}
                  className="flex items-center gap-1.5 text-xs text-stone-400"
                >
                  <div className={`w-3 h-3 rounded ${colors[i % colors.length]}`} />
                  {s.locationName}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

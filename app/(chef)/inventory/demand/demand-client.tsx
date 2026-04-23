'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function formatCents(cents: number | null) {
  if (cents == null) return '-'
  return `$${(cents / 100).toFixed(2)}`
}

type Props = { initialForecast: any[] }

export function DemandClient({ initialForecast }: Props) {
  const shortages = initialForecast.filter((f) => (f.deficit ?? 0) > 0)
  const sufficient = initialForecast.filter((f) => (f.deficit ?? 0) <= 0)

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-stone-100">{initialForecast.length}</p>
          <p className="text-xs text-stone-500">Ingredients Needed</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{shortages.length}</p>
          <p className="text-xs text-stone-500">Shortages</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{sufficient.length}</p>
          <p className="text-xs text-stone-500">In Stock</p>
        </Card>
      </div>

      {initialForecast.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-stone-500 text-sm">
            No upcoming demand. Confirmed events with menus and recipes will appear here
            automatically.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-700 text-stone-400">
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Ingredient</th>
                  <th className="text-right px-4 py-3 font-medium">Needed</th>
                  <th className="text-right px-4 py-3 font-medium">On Hand</th>
                  <th className="text-right px-4 py-3 font-medium">Deficit</th>
                  <th className="text-left px-4 py-3 font-medium">Unit</th>
                  <th className="text-right px-4 py-3 font-medium">Est. Cost</th>
                  <th className="text-right px-4 py-3 font-medium">Events</th>
                  <th className="text-left px-4 py-3 font-medium">First Event</th>
                </tr>
              </thead>
              <tbody>
                {initialForecast.map((item: any, idx: number) => {
                  const deficit = item.deficit ?? 0
                  return (
                    <tr
                      key={`${item.ingredientId ?? 'ingredient'}:${item.unit ?? 'unit'}:${idx}`}
                      className="border-b border-stone-800 hover:bg-stone-800/50"
                    >
                      <td className="px-4 py-3">
                        {deficit > 0 ? (
                          <Badge variant="error">Shortage</Badge>
                        ) : (
                          <Badge variant="success">OK</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-stone-100 font-medium">
                        {item.ingredientName}
                      </td>
                      <td className="px-4 py-3 text-right text-stone-300">
                        {Number(item.totalNeeded ?? 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-stone-300">
                        {Number(item.currentStock ?? 0).toFixed(2)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono ${deficit > 0 ? 'text-red-400' : 'text-green-400'}`}
                      >
                        {deficit > 0 ? `-${deficit.toFixed(2)}` : '0.00'}
                      </td>
                      <td className="px-4 py-3 text-stone-400">{item.unit}</td>
                      <td className="px-4 py-3 text-right text-stone-300">
                        {formatCents(item.estimatedCostCents)}
                      </td>
                      <td className="px-4 py-3 text-right text-stone-300">
                        {item.eventCount ?? 0}
                      </td>
                      <td className="px-4 py-3 text-stone-300 whitespace-nowrap">
                        {item.firstEventDate
                          ? new Date(item.firstEventDate).toLocaleDateString()
                          : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

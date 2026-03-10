// Stocktake History
// Past stocktakes table with variance trends.

'use client'

import { useRouter } from 'next/navigation'
import type { Stocktake, VarianceTrendPoint } from '@/lib/inventory/stocktake-actions'

function formatCents(cents: number): string {
  return `$${(Math.abs(cents) / 100).toFixed(2)}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

type Props = {
  stocktakes: Stocktake[]
  trend: VarianceTrendPoint[]
}

export function StocktakeHistory({ stocktakes, trend }: Props) {
  const router = useRouter()

  return (
    <div className="space-y-6">
      {/* Variance trend summary */}
      {trend.length >= 2 && (
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-4">
          <h3 className="text-sm font-medium text-stone-300 mb-3">Variance Trend</h3>
          <div className="flex items-end gap-1 h-24">
            {trend.map((point) => {
              const maxVal = Math.max(...trend.map((t) => t.varianceValueCents), 1)
              const height = Math.max((point.varianceValueCents / maxVal) * 100, 4)
              return (
                <div key={point.stocktakeId} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-stone-500">
                    {formatCents(point.varianceValueCents)}
                  </span>
                  <div
                    className="w-full rounded-t bg-brand-500/60"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[10px] text-stone-600 truncate max-w-full">
                    {new Date(point.date + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Stocktake list */}
      {stocktakes.length === 0 ? (
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-8 text-center">
          <p className="text-stone-500 text-sm">
            No completed stocktakes yet. Start your first count from the Stocktake page.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-800 text-stone-400 text-left">
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium text-right">Items</th>
                <th className="px-3 py-2 font-medium text-right">Variances</th>
                <th className="px-3 py-2 font-medium text-right">$ Variance</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {stocktakes.map((st) => (
                <tr
                  key={st.id}
                  onClick={() => {
                    if (st.status === 'completed') {
                      router.push(`/inventory/stocktake/${st.id}/reconcile`)
                    }
                  }}
                  className="border-t border-stone-700/50 hover:bg-stone-800/50 cursor-pointer"
                >
                  <td className="px-3 py-2 text-stone-300">{formatDate(st.stocktakeDate)}</td>
                  <td className="px-3 py-2 text-stone-200 font-medium">{st.name}</td>
                  <td className="px-3 py-2 text-right text-stone-400">{st.totalItems}</td>
                  <td className="px-3 py-2 text-right text-stone-400">{st.varianceItems}</td>
                  <td className="px-3 py-2 text-right text-red-400">
                    {st.varianceValueCents > 0 ? formatCents(st.varianceValueCents) : '-'}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                        st.status === 'completed'
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-stone-600/20 text-stone-500'
                      }`}
                    >
                      {st.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

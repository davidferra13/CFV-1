'use client'

import { useEffect, useState } from 'react'
import { getCircleSourcingData, type CircleSourcingItem } from '@/lib/hub/circle-detail-actions'

interface SourcingBoardProps {
  circleId: string
}

export function CircleSourcingBoard({ circleId }: SourcingBoardProps) {
  const [data, setData] = useState<CircleSourcingItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCircleSourcingData(circleId)
      .then((result) => {
        setData(result)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [circleId])

  if (loading) {
    return (
      <div className="rounded-xl border border-stone-700 bg-stone-800/50 p-8 text-center text-sm text-stone-400">
        Loading sourcing data...
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-stone-700 bg-stone-800/50 p-8 text-center text-sm text-stone-400">
        No ingredients found. Link events with menus to see sourcing data.
      </div>
    )
  }

  const byEvent = data.reduce<Record<string, { title: string; items: CircleSourcingItem[] }>>(
    (acc, item) => {
      if (!acc[item.event_id]) {
        acc[item.event_id] = { title: item.event_title, items: [] }
      }
      acc[item.event_id].items.push(item)
      return acc
    },
    {}
  )

  const totalIngredients = data.length
  const sourcedCount = data.filter(
    (d) => Number(d.purchased_qty) >= Number(d.buy_qty) && Number(d.buy_qty) > 0
  ).length

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex items-center gap-4 rounded-xl border border-stone-700 bg-stone-800/50 p-4">
        <div>
          <div className="text-2xl font-bold text-stone-100">
            {sourcedCount}/{totalIngredients}
          </div>
          <div className="text-xs text-stone-400">Ingredients Sourced</div>
        </div>
        <div className="h-8 w-px bg-stone-700" />
        <div className="flex-1">
          <div className="h-2 overflow-hidden rounded-full bg-stone-700">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{
                width: `${totalIngredients > 0 ? (sourcedCount / totalIngredients) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Per-event tables */}
      {Object.entries(byEvent).map(([eventId, group]) => (
        <div key={eventId} className="rounded-xl border border-stone-700 bg-stone-800/50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-stone-200">{group.title}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-700 text-left text-xs text-stone-400">
                  <th className="pb-2 pr-4">Ingredient</th>
                  <th className="pb-2 pr-4">Need</th>
                  <th className="pb-2 pr-4">Purchased</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Vendor</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((item) => {
                  const buyQty = Number(item.buy_qty)
                  const purchasedQty = Number(item.purchased_qty)
                  const status =
                    buyQty > 0 && purchasedQty >= buyQty
                      ? 'sourced'
                      : purchasedQty > 0
                        ? 'partial'
                        : 'needed'
                  return (
                    <tr key={item.ingredient_id} className="border-b border-stone-800">
                      <td className="py-2 pr-4 font-medium text-stone-200">
                        {item.ingredient_name}
                      </td>
                      <td className="py-2 pr-4 text-stone-300">
                        {buyQty.toFixed(1)} {item.unit}
                      </td>
                      <td className="py-2 pr-4 text-stone-300">
                        {purchasedQty.toFixed(1)} {item.unit}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            status === 'sourced'
                              ? 'bg-emerald-900/50 text-emerald-300'
                              : status === 'partial'
                                ? 'bg-amber-900/50 text-amber-300'
                                : 'bg-red-900/50 text-red-300'
                          }`}
                        >
                          {status === 'sourced'
                            ? 'Sourced'
                            : status === 'partial'
                              ? 'Partial'
                              : 'Needed'}
                        </span>
                      </td>
                      <td className="py-2 text-stone-400">{item.preferred_vendor || '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

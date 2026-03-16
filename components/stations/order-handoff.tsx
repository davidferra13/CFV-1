'use client'

// Order Handoff - Compiled order list from all stations
// Table of components that need ordering, with batch actions for marking as ordered/received.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { markOrderAsOrdered, markOrderAsReceived } from '@/lib/stations/order-actions'

type GroupedOrder = {
  component_id: string
  component_name: string
  unit: string
  total_quantity: number
  stations: Array<{
    station_id: string
    station_name: string
    quantity: number
    order_id: string
  }>
  order_ids: string[]
}

type Props = {
  orders: GroupedOrder[]
}

export function OrderHandoff({ orders }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [markingOrdered, setMarkingOrdered] = useState(false)
  const [markingReceived, setMarkingReceived] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleSelect(orderIds: string[]) {
    setSelected((prev) => {
      const next = new Set(prev)
      const allSelected = orderIds.every((id) => next.has(id))
      if (allSelected) {
        orderIds.forEach((id) => next.delete(id))
      } else {
        orderIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  function selectAll() {
    const allIds = orders.flatMap((o) => o.order_ids)
    setSelected(new Set(allIds))
  }

  function selectNone() {
    setSelected(new Set())
  }

  async function handleMarkOrdered() {
    if (selected.size === 0) return
    setMarkingOrdered(true)
    setError(null)

    try {
      await markOrderAsOrdered(Array.from(selected))
      setSelected(new Set())
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as ordered')
    } finally {
      setMarkingOrdered(false)
    }
  }

  async function handleMarkReceived() {
    if (selected.size === 0) return
    setMarkingReceived(true)
    setError(null)

    try {
      await markOrderAsReceived(Array.from(selected))
      setSelected(new Set())
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as received')
    } finally {
      setMarkingReceived(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Pending Orders</CardTitle>
          <div className="flex items-center gap-2">
            <button onClick={selectAll} className="text-xs text-stone-400 hover:text-stone-200">
              Select All
            </button>
            <span className="text-stone-600">|</span>
            <button onClick={selectNone} className="text-xs text-stone-400 hover:text-stone-200">
              Clear
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-700 text-left text-xs text-stone-400 uppercase tracking-wider">
                <th className="px-4 py-3 font-medium w-10"></th>
                <th className="px-4 py-3 font-medium">Component</th>
                <th className="px-4 py-3 font-medium text-right">Total Needed</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium">Stations Requesting</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((group) => {
                const isSelected = group.order_ids.every((id) => selected.has(id))
                const isPartial = group.order_ids.some((id) => selected.has(id)) && !isSelected

                return (
                  <tr
                    key={group.component_id}
                    className={`border-b border-stone-800 ${isSelected ? 'bg-brand-500/10' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isPartial
                        }}
                        onChange={() => toggleSelect(group.order_ids)}
                        className="rounded border-stone-600"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-stone-200">{group.component_name}</td>
                    <td className="px-4 py-3 text-right text-stone-100 font-bold">
                      {group.total_quantity}
                    </td>
                    <td className="px-4 py-3 text-stone-400">{group.unit}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {group.stations.map((s) => (
                          <span
                            key={s.order_id}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-stone-800 text-stone-300"
                          >
                            {s.station_name}: {s.quantity}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Action bar */}
        <div className="px-4 py-3 border-t border-stone-700 flex items-center gap-3">
          <span className="text-xs text-stone-500">
            {selected.size} order{selected.size !== 1 ? 's' : ''} selected
          </span>
          <Button
            onClick={handleMarkOrdered}
            loading={markingOrdered}
            disabled={selected.size === 0}
            size="sm"
            variant="secondary"
          >
            Mark as Ordered
          </Button>
          <Button
            onClick={handleMarkReceived}
            loading={markingReceived}
            disabled={selected.size === 0}
            size="sm"
          >
            Mark as Received
          </Button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </CardContent>
    </Card>
  )
}

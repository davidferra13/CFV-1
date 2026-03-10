'use client'

import { useState, useTransition } from 'react'
import {
  advanceOrderStatus,
  cancelBakeryOrder,
  type BakeryOrder,
  type BakeryOrderStatus,
} from '@/lib/bakery/order-actions'

const BOARD_COLUMNS: { status: BakeryOrderStatus; label: string; color: string }[] = [
  { status: 'inquiry', label: 'Inquiry', color: 'border-stone-500' },
  { status: 'quoted', label: 'Quoted', color: 'border-blue-500' },
  { status: 'deposit_paid', label: 'Deposit Paid', color: 'border-indigo-500' },
  { status: 'in_production', label: 'In Production', color: 'border-amber-500' },
  { status: 'decorating', label: 'Decorating', color: 'border-purple-500' },
  { status: 'ready', label: 'Ready', color: 'border-emerald-500' },
]

function getUrgencyClass(pickupDate: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const pickup = new Date(pickupDate + 'T00:00:00')
  const diffDays = Math.floor((pickup.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 'border-l-red-500 bg-red-950/30'
  if (diffDays === 1) return 'border-l-yellow-500 bg-yellow-950/20'
  return 'border-l-stone-600 bg-stone-800/50'
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${displayHour}:${m} ${ampm}`
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

type Props = {
  orders: BakeryOrder[]
}

export function ProductionBoard({ orders: initialOrders }: Props) {
  const [orders, setOrders] = useState(initialOrders)
  const [isPending, startTransition] = useTransition()
  const [selectedOrder, setSelectedOrder] = useState<BakeryOrder | null>(null)
  const [filterType, setFilterType] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // Filter orders
  const filteredOrders = filterType ? orders.filter((o) => o.order_type === filterType) : orders

  // Group by status
  const ordersByStatus: Record<string, BakeryOrder[]> = {}
  for (const col of BOARD_COLUMNS) {
    ordersByStatus[col.status] = filteredOrders
      .filter((o) => o.status === col.status)
      .sort((a, b) => a.pickup_date.localeCompare(b.pickup_date))
  }

  // Summary stats
  const today = new Date().toISOString().split('T')[0]
  const thisWeekEnd = new Date()
  thisWeekEnd.setDate(thisWeekEnd.getDate() + 7)
  const weekEndStr = thisWeekEnd.toISOString().split('T')[0]

  const activeOrders = orders.filter(
    (o) => !['cancelled', 'picked_up', 'delivered'].includes(o.status)
  )
  const dueToday = activeOrders.filter((o) => o.pickup_date === today)
  const thisWeekOrders = activeOrders.filter(
    (o) => o.pickup_date >= today && o.pickup_date <= weekEndStr
  )
  const weekRevenueCents = thisWeekOrders.reduce((sum, o) => sum + o.price_cents, 0)

  function handleAdvance(order: BakeryOrder) {
    const previous = [...orders]
    setError(null)

    startTransition(async () => {
      try {
        const updated = await advanceOrderStatus(order.id)
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? (updated as BakeryOrder) : o)))
        if (selectedOrder?.id === updated.id) setSelectedOrder(updated as BakeryOrder)
      } catch (err) {
        setOrders(previous)
        setError(err instanceof Error ? err.message : 'Failed to advance order')
      }
    })
  }

  function handleCancel(order: BakeryOrder) {
    if (!confirm(`Cancel order for ${order.customer_name}?`)) return
    const previous = [...orders]
    setError(null)

    startTransition(async () => {
      try {
        const updated = await cancelBakeryOrder(order.id)
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? (updated as BakeryOrder) : o)))
        setSelectedOrder(null)
      } catch (err) {
        setOrders(previous)
        setError(err instanceof Error ? err.message : 'Failed to cancel order')
      }
    })
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-900/30 border border-red-700 p-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Summary Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-stone-800 border border-stone-700 p-4">
          <div className="text-2xl font-bold text-stone-100">{dueToday.length}</div>
          <div className="text-sm text-stone-400">Due Today</div>
        </div>
        <div className="rounded-lg bg-stone-800 border border-stone-700 p-4">
          <div className="text-2xl font-bold text-stone-100">{thisWeekOrders.length}</div>
          <div className="text-sm text-stone-400">This Week</div>
        </div>
        <div className="rounded-lg bg-stone-800 border border-stone-700 p-4">
          <div className="text-2xl font-bold text-stone-100">{formatCents(weekRevenueCents)}</div>
          <div className="text-sm text-stone-400">Week Revenue</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm text-stone-400">Filter by type:</label>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg bg-stone-800 border border-stone-600 text-stone-200 px-3 py-1.5 text-sm"
        >
          <option value="">All types</option>
          <option value="cake">Cake</option>
          <option value="cupcakes">Cupcakes</option>
          <option value="pastry">Pastry</option>
          <option value="bread">Bread</option>
          <option value="cookies">Cookies</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      {/* Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {BOARD_COLUMNS.map((col) => (
          <div
            key={col.status}
            className={`rounded-lg border-t-2 ${col.color} bg-stone-900/50 p-3`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-stone-300">{col.label}</h3>
              <span className="rounded-full bg-stone-700 px-2 py-0.5 text-xs text-stone-400">
                {ordersByStatus[col.status]?.length ?? 0}
              </span>
            </div>
            <div className="space-y-2 min-h-[100px]">
              {(ordersByStatus[col.status] ?? []).map((order) => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={`rounded-lg border-l-4 p-3 cursor-pointer transition hover:ring-1 hover:ring-amber-600/50 ${getUrgencyClass(order.pickup_date)}`}
                >
                  <div className="text-sm font-medium text-stone-200 truncate">
                    {order.customer_name}
                  </div>
                  <div className="text-xs text-stone-400 capitalize">
                    {order.order_type}
                    {order.size ? ` - ${order.size}` : ''}
                  </div>
                  <div className="text-xs text-stone-500 mt-1">
                    {formatDate(order.pickup_date)}
                    {order.pickup_time ? ` ${formatTime(order.pickup_time)}` : ''}
                  </div>
                  <div className="text-xs font-medium text-amber-400 mt-1">
                    {formatCents(order.price_cents)}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAdvance(order)
                    }}
                    disabled={isPending}
                    className="mt-2 w-full rounded bg-stone-700 px-2 py-1 text-xs text-stone-300 hover:bg-stone-600 disabled:opacity-50 transition"
                  >
                    Advance
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-stone-900 border border-stone-700 rounded-xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-stone-100">{selectedOrder.customer_name}</h2>
                <p className="text-sm text-stone-400 capitalize">
                  {selectedOrder.order_type} order
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-stone-400 hover:text-stone-200 text-xl"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-sm">
              {selectedOrder.customer_phone && (
                <div>
                  <span className="text-stone-500">Phone:</span>{' '}
                  <span className="text-stone-300">{selectedOrder.customer_phone}</span>
                </div>
              )}
              {selectedOrder.customer_email && (
                <div>
                  <span className="text-stone-500">Email:</span>{' '}
                  <span className="text-stone-300">{selectedOrder.customer_email}</span>
                </div>
              )}

              <div className="border-t border-stone-700 pt-3">
                <span className="text-stone-500">Status:</span>{' '}
                <span className="capitalize text-stone-300">
                  {selectedOrder.status.replace('_', ' ')}
                </span>
              </div>

              {selectedOrder.size && (
                <div>
                  <span className="text-stone-500">Size:</span>{' '}
                  <span className="text-stone-300">{selectedOrder.size}</span>
                </div>
              )}
              {selectedOrder.servings && (
                <div>
                  <span className="text-stone-500">Servings:</span>{' '}
                  <span className="text-stone-300">{selectedOrder.servings}</span>
                </div>
              )}
              {selectedOrder.layers && (
                <div>
                  <span className="text-stone-500">Layers:</span>{' '}
                  <span className="text-stone-300">{selectedOrder.layers}</span>
                </div>
              )}
              {selectedOrder.frosting_type && (
                <div>
                  <span className="text-stone-500">Frosting:</span>{' '}
                  <span className="text-stone-300 capitalize">
                    {selectedOrder.frosting_type.replace('_', ' ')}
                  </span>
                </div>
              )}

              {selectedOrder.flavors &&
                (
                  selectedOrder.flavors as unknown as {
                    layer: number
                    cake_flavor: string
                    filling: string
                  }[]
                ).length > 0 && (
                  <div className="border-t border-stone-700 pt-3">
                    <span className="text-stone-500 block mb-1">Flavors:</span>
                    {(
                      selectedOrder.flavors as unknown as {
                        layer: number
                        cake_flavor: string
                        filling: string
                      }[]
                    ).map((f) => (
                      <div key={f.layer} className="text-stone-300 ml-2">
                        Layer {f.layer}: {f.cake_flavor}
                        {f.filling && f.filling !== 'none' ? ` with ${f.filling}` : ''}
                      </div>
                    ))}
                  </div>
                )}

              {selectedOrder.inscription && (
                <div>
                  <span className="text-stone-500">Inscription:</span>{' '}
                  <span className="text-stone-300 italic">
                    &quot;{selectedOrder.inscription}&quot;
                  </span>
                </div>
              )}

              {selectedOrder.design_notes && (
                <div className="border-t border-stone-700 pt-3">
                  <span className="text-stone-500 block mb-1">Design Notes:</span>
                  <p className="text-stone-300">{selectedOrder.design_notes}</p>
                </div>
              )}

              {selectedOrder.colors && selectedOrder.colors.length > 0 && (
                <div>
                  <span className="text-stone-500">Colors:</span>{' '}
                  <span className="text-stone-300">{selectedOrder.colors.join(', ')}</span>
                </div>
              )}

              {selectedOrder.dietary && selectedOrder.dietary.length > 0 && (
                <div>
                  <span className="text-stone-500">Dietary:</span>{' '}
                  <span className="text-stone-300">
                    {selectedOrder.dietary.map((d) => d.replace(/_/g, ' ')).join(', ')}
                  </span>
                </div>
              )}

              <div className="border-t border-stone-700 pt-3">
                <div>
                  <span className="text-stone-500">Pickup:</span>{' '}
                  <span className="text-stone-300">
                    {formatDate(selectedOrder.pickup_date)}
                    {selectedOrder.pickup_time
                      ? ` at ${formatTime(selectedOrder.pickup_time)}`
                      : ''}
                  </span>
                </div>
                {selectedOrder.delivery_requested && (
                  <div>
                    <span className="text-stone-500">Delivery to:</span>{' '}
                    <span className="text-stone-300">
                      {selectedOrder.delivery_address || 'Address TBD'}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-stone-700 pt-3">
                <div>
                  <span className="text-stone-500">Price:</span>{' '}
                  <span className="text-amber-400 font-medium">
                    {formatCents(selectedOrder.price_cents)}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500">Deposit:</span>{' '}
                  <span className="text-stone-300">
                    {formatCents(selectedOrder.deposit_cents)}{' '}
                    {selectedOrder.deposit_paid ? '(paid)' : '(unpaid)'}
                  </span>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="border-t border-stone-700 pt-3">
                  <span className="text-stone-500 block mb-1">Notes:</span>
                  <p className="text-stone-300">{selectedOrder.notes}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              {!['cancelled', 'picked_up', 'delivered'].includes(selectedOrder.status) && (
                <>
                  <button
                    onClick={() => handleAdvance(selectedOrder)}
                    disabled={isPending}
                    className="flex-1 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50 transition"
                  >
                    Advance Status
                  </button>
                  <button
                    onClick={() => handleCancel(selectedOrder)}
                    disabled={isPending}
                    className="rounded-lg bg-red-900/50 border border-red-700 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-900 disabled:opacity-50 transition"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

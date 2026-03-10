'use client'

import { useState, useTransition, useEffect } from 'react'
import {
  TruckPreorder,
  PreorderItem,
  PreorderSummaryItem,
  PreorderStats,
  createPreorder,
  updatePreorderStatus,
  getPreordersForDate,
  getPreorderSummary,
  cancelPreorder,
  getPreorderStats,
} from '@/lib/food-truck/preorder-actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// ---- Status helpers ----

const STATUS_COLORS: Record<TruckPreorder['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  ready: 'bg-green-100 text-green-800',
  picked_up: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-orange-100 text-orange-800',
}

const NEXT_STATUS: Partial<Record<TruckPreorder['status'], TruckPreorder['status']>> = {
  pending: 'confirmed',
  confirmed: 'ready',
  ready: 'picked_up',
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

// ---- Main Component ----

export default function PreorderManager() {
  const [isPending, startTransition] = useTransition()
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [preorders, setPreorders] = useState<TruckPreorder[]>([])
  const [summary, setSummary] = useState<{
    total_preorders: number
    total_revenue_cents: number
    items: PreorderSummaryItem[]
  } | null>(null)
  const [stats, setStats] = useState<PreorderStats | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showAggregation, setShowAggregation] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load data when date changes
  useEffect(() => {
    loadData()
  }, [selectedDate])

  function loadData() {
    setError(null)
    startTransition(async () => {
      try {
        const [orders, sum, st] = await Promise.all([
          getPreordersForDate(selectedDate),
          getPreorderSummary(selectedDate),
          getPreorderStats(30),
        ])
        setPreorders(orders)
        setSummary(sum)
        setStats(st)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load pre-orders')
      }
    })
  }

  function handleAdvanceStatus(id: string, currentStatus: TruckPreorder['status']) {
    const next = NEXT_STATUS[currentStatus]
    if (!next) return

    const previous = [...preorders]
    setPreorders((prev) => prev.map((o) => (o.id === id ? { ...o, status: next } : o)))

    startTransition(async () => {
      try {
        await updatePreorderStatus(id, next)
        loadData()
      } catch (err) {
        setPreorders(previous)
        setError(err instanceof Error ? err.message : 'Failed to update status')
      }
    })
  }

  function handleCancel(id: string) {
    const previous = [...preorders]
    setPreorders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: 'cancelled' as const } : o))
    )

    startTransition(async () => {
      try {
        await cancelPreorder(id, false)
        loadData()
      } catch (err) {
        setPreorders(previous)
        setError(err instanceof Error ? err.message : 'Failed to cancel pre-order')
      }
    })
  }

  function handleNoShow(id: string) {
    const previous = [...preorders]
    setPreorders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: 'no_show' as const } : o))
    )

    startTransition(async () => {
      try {
        await updatePreorderStatus(id, 'no_show')
        loadData()
      } catch (err) {
        setPreorders(previous)
        setError(err instanceof Error ? err.message : 'Failed to mark no-show')
      }
    })
  }

  const activeOrders = preorders.filter(
    (o) => o.status !== 'cancelled' && o.status !== 'no_show' && o.status !== 'picked_up'
  )
  const completedOrders = preorders.filter(
    (o) => o.status === 'picked_up' || o.status === 'cancelled' || o.status === 'no_show'
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pre-Orders</h1>
          <p className="text-sm text-muted-foreground">Manage customer pre-orders for pickup</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          />
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Close Form' : 'Add Pre-Order'}
          </Button>
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Summary Panel */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <SummaryCard label="Pre-Orders" value={String(summary.total_preorders)} />
          <SummaryCard label="Expected Revenue" value={formatCents(summary.total_revenue_cents)} />
          {stats && (
            <>
              <SummaryCard label="Completion Rate" value={`${stats.completion_rate}%`} />
              <SummaryCard label="No-Show Rate" value={`${stats.no_show_rate}%`} />
            </>
          )}
        </div>
      )}

      {/* Item Aggregation Toggle */}
      <div>
        <Button variant="secondary" onClick={() => setShowAggregation(!showAggregation)}>
          {showAggregation ? 'Hide Prep Summary' : 'Show Prep Summary'}
        </Button>
      </div>

      {showAggregation && summary && summary.items.length > 0 && (
        <div className="rounded-lg border bg-blue-50 p-4">
          <h3 className="mb-3 font-semibold">Items to Prep Today</h3>
          <div className="space-y-2">
            {summary.items.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <span className="font-medium">
                  {item.total_quantity}x {item.name}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatCents(item.total_cents)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <AddPreorderForm
          date={selectedDate}
          onSuccess={() => {
            setShowAddForm(false)
            loadData()
          }}
          onError={(msg) => setError(msg)}
        />
      )}

      {/* Active Orders */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Active Orders ({activeOrders.length})</h2>
        {activeOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active pre-orders for this date.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeOrders.map((order) => (
              <PreorderCard
                key={order.id}
                order={order}
                onAdvance={() => handleAdvanceStatus(order.id, order.status)}
                onCancel={() => handleCancel(order.id)}
                onNoShow={() => handleNoShow(order.id)}
                isPending={isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Completed / Cancelled */}
      {completedOrders.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">
            Completed / Cancelled ({completedOrders.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {completedOrders.map((order) => (
              <PreorderCard key={order.id} order={order} isPending={isPending} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Sub-Components ----

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}

function PreorderCard({
  order,
  onAdvance,
  onCancel,
  onNoShow,
  isPending,
}: {
  order: TruckPreorder
  onAdvance?: () => void
  onCancel?: () => void
  onNoShow?: () => void
  isPending: boolean
}) {
  const nextStatus = NEXT_STATUS[order.status]

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold">{order.customer_name}</p>
          {order.pickup_time && (
            <p className="text-sm text-muted-foreground">Pickup: {order.pickup_time}</p>
          )}
          <p className="text-sm text-muted-foreground">{order.location_name}</p>
        </div>
        <span
          className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLORS[order.status]}`}
        >
          {order.status.replace('_', ' ')}
        </span>
      </div>

      {/* Items */}
      <div className="space-y-1 text-sm">
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between">
            <span>
              {item.quantity}x {item.name}
            </span>
            <span>{formatCents(item.price_cents * item.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t pt-1 font-semibold">
          <span>Total</span>
          <span>{formatCents(order.total_cents)}</span>
        </div>
      </div>

      {order.notes && <p className="text-xs text-muted-foreground">Note: {order.notes}</p>}

      {/* Payment status */}
      <div className="text-xs">
        Payment:{' '}
        <span
          className={
            order.payment_status === 'paid'
              ? 'text-green-600 font-medium'
              : order.payment_status === 'refunded'
                ? 'text-red-600 font-medium'
                : 'text-yellow-600 font-medium'
          }
        >
          {order.payment_status}
        </span>
      </div>

      {/* Actions */}
      {(onAdvance || onCancel || onNoShow) && nextStatus && (
        <div className="flex flex-wrap gap-2">
          {onAdvance && nextStatus && (
            <Button size="sm" onClick={onAdvance} disabled={isPending}>
              Mark {nextStatus.replace('_', ' ')}
            </Button>
          )}
          {onNoShow && order.status !== 'picked_up' && (
            <Button size="sm" variant="secondary" onClick={onNoShow} disabled={isPending}>
              No-Show
            </Button>
          )}
          {onCancel && (
            <Button size="sm" variant="danger" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function AddPreorderForm({
  date,
  onSuccess,
  onError,
}: {
  date: string
  onSuccess: () => void
  onError: (msg: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [locationName, setLocationName] = useState('')
  const [pickupTime, setPickupTime] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<PreorderItem[]>([{ name: '', quantity: 1, price_cents: 0 }])

  function addItem() {
    setItems([...items, { name: '', quantity: 1, price_cents: 0 }])
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index))
  }

  function updateItem(index: number, field: keyof PreorderItem, value: string | number) {
    setItems(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  const totalCents = items.reduce((sum, item) => sum + item.price_cents * item.quantity, 0)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!customerName.trim()) {
      onError('Customer name is required')
      return
    }
    if (!locationName.trim()) {
      onError('Location name is required')
      return
    }
    if (items.length === 0 || items.some((i) => !i.name.trim())) {
      onError('All items need a name')
      return
    }

    startTransition(async () => {
      try {
        await createPreorder({
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim() || undefined,
          customer_email: customerEmail.trim() || undefined,
          location_name: locationName.trim(),
          pickup_date: date,
          pickup_time: pickupTime || undefined,
          items: items.filter((i) => i.name.trim()),
          total_cents: totalCents,
          notes: notes.trim() || undefined,
        })
        onSuccess()
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Failed to create pre-order')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-4 space-y-4">
      <h3 className="font-semibold">New Pre-Order</h3>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="text-sm font-medium">Customer Name *</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Phone</label>
          <input
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Location *</label>
          <input
            type="text"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            placeholder="e.g. Downtown Farmers Market"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Pickup Time</label>
          <input
            type="time"
            value={pickupTime}
            onChange={(e) => setPickupTime(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Items */}
      <div>
        <label className="text-sm font-medium">Items</label>
        <div className="mt-1 space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={item.name}
                onChange={(e) => updateItem(i, 'name', e.target.value)}
                placeholder="Item name"
                className="flex-1 rounded-md border px-3 py-2 text-sm"
              />
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                min={1}
                className="w-16 rounded-md border px-2 py-2 text-sm text-center"
              />
              <div className="flex items-center gap-1">
                <span className="text-sm">$</span>
                <input
                  type="number"
                  value={(item.price_cents / 100).toFixed(2)}
                  onChange={(e) =>
                    updateItem(
                      i,
                      'price_cents',
                      Math.round(parseFloat(e.target.value || '0') * 100)
                    )
                  }
                  step="0.01"
                  min="0"
                  className="w-20 rounded-md border px-2 py-2 text-sm"
                />
              </div>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="text-red-500 text-sm hover:text-red-700"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addItem}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800"
        >
          + Add item
        </button>
      </div>

      <div>
        <label className="text-sm font-medium">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          rows={2}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="font-semibold">Total: {formatCents(totalCents)}</p>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating...' : 'Create Pre-Order'}
        </Button>
      </div>
    </form>
  )
}

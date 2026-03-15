'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  getMealPrepOrders,
  updateOrderStatus,
  type MealPrepOrder,
} from '@/lib/store/meal-prep-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
  pending: { label: 'Pending', variant: 'warning' },
  confirmed: { label: 'Confirmed', variant: 'info' },
  preparing: { label: 'Preparing', variant: 'info' },
  ready: { label: 'Ready', variant: 'success' },
  delivered: { label: 'Delivered', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'error' },
}

const NEXT_ACTIONS: Record<string, { label: string; status: string }[]> = {
  pending: [
    { label: 'Confirm', status: 'confirmed' },
    { label: 'Cancel', status: 'cancelled' },
  ],
  confirmed: [
    { label: 'Start Preparing', status: 'preparing' },
    { label: 'Cancel', status: 'cancelled' },
  ],
  preparing: [
    { label: 'Mark Ready', status: 'ready' },
    { label: 'Cancel', status: 'cancelled' },
  ],
  ready: [{ label: 'Mark Delivered', status: 'delivered' }],
  delivered: [],
  cancelled: [],
}

export function MealPrepOrderList() {
  const [orders, setOrders] = useState<MealPrepOrder[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const loadOrders = async () => {
    try {
      const data = await getMealPrepOrders(statusFilter ? { status: statusFilter } : undefined)
      setOrders(data)
    } catch (err) {
      toast.error('Failed to load orders')
    }
  }

  useEffect(() => {
    loadOrders()
  }, [statusFilter])

  const handleStatusChange = (orderId: string, newStatus: string) => {
    if (newStatus === 'cancelled' && !confirm('Cancel this order?')) return

    const previous = orders
    setOrders(
      orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    )

    startTransition(async () => {
      try {
        await updateOrderStatus(orderId, newStatus)
        toast.success(`Order ${newStatus}`)
      } catch (err) {
        setOrders(previous)
        toast.error('Failed to update order status')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Orders</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border px-3 py-1.5 text-sm"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>
              {cfg.label}
            </option>
          ))}
        </select>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-gray-500">
          No orders found.
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {orders.map((order) => {
            const config = STATUS_CONFIG[order.status] ?? { label: order.status, variant: 'default' as const }
            const actions = NEXT_ACTIONS[order.status] ?? []
            const isExpanded = expandedId === order.id
            const itemsList = Array.isArray(order.items) ? order.items : []

            return (
              <div key={order.id} className="p-4">
                {/* Summary row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="font-medium">{order.customer_name}</span>
                      <span className="ml-2 text-sm text-gray-500">
                        {itemsList.length} item{itemsList.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">
                      ${(order.total_cents / 100).toFixed(2)}
                    </span>
                    <Badge variant={config.variant}>{config.label}</Badge>
                    <span className="text-sm text-gray-500">
                      {order.fulfillment_type === 'delivery' ? 'Delivery' : 'Pickup'}
                    </span>
                    <span className="text-sm text-gray-500">{order.fulfillment_date}</span>
                    <span className="text-xs text-gray-400">{isExpanded ? '\u25B2' : '\u25BC'}</span>
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-3 space-y-3 border-t pt-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Email:</span> {order.customer_email}
                      </div>
                      {order.customer_phone && (
                        <div>
                          <span className="text-gray-500">Phone:</span> {order.customer_phone}
                        </div>
                      )}
                      {order.delivery_address && (
                        <div className="col-span-2">
                          <span className="text-gray-500">Delivery Address:</span>{' '}
                          {order.delivery_address}
                        </div>
                      )}
                      {order.fulfillment_notes && (
                        <div className="col-span-2">
                          <span className="text-gray-500">Notes:</span> {order.fulfillment_notes}
                        </div>
                      )}
                    </div>

                    {/* Items table */}
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-gray-500">
                          <th className="pb-1">Item</th>
                          <th className="pb-1 text-right">Qty</th>
                          <th className="pb-1 text-right">Price</th>
                          <th className="pb-1 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemsList.map((item: { itemId: string; name: string; quantity: number; priceCents: number }, idx: number) => (
                          <tr key={idx} className="border-b last:border-0">
                            <td className="py-1">{item.name}</td>
                            <td className="py-1 text-right">{item.quantity}</td>
                            <td className="py-1 text-right">
                              ${(item.priceCents / 100).toFixed(2)}
                            </td>
                            <td className="py-1 text-right">
                              ${((item.priceCents * item.quantity) / 100).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Action buttons */}
                    {actions.length > 0 && (
                      <div className="flex gap-2 pt-1">
                        {actions.map((action) => (
                          <Button
                            key={action.status}
                            variant={action.status === 'cancelled' ? 'danger' : 'primary'}
                            onClick={() => handleStatusChange(order.id, action.status)}
                            disabled={isPending}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

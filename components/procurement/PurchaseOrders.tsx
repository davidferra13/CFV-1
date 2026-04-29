'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  createProcurementOrder,
  addProcurementOrderItem,
  sendProcurementOrder,
  fulfillProcurementOrder,
} from '@/lib/procurement/actions'
import type { ProcurementOrder, ProcurementReferenceData } from '@/lib/procurement/types'

function formatCurrency(cents: number | null) {
  if (cents == null) return '--'
  return `$${(cents / 100).toFixed(2)}`
}

type Props = {
  initialOrders: ProcurementOrder[]
  references: ProcurementReferenceData
}

export function PurchaseOrders({ initialOrders, references }: Props) {
  const [orders, setOrders] = useState(initialOrders)
  const [vendorId, setVendorId] = useState('')
  const [eventId, setEventId] = useState('')
  const [notes, setNotes] = useState('')

  const [lineOrderId, setLineOrderId] = useState('')
  const [ingredientId, setIngredientId] = useState('')
  const [lineQty, setLineQty] = useState('')
  const [lineUnit, setLineUnit] = useState('')
  const [linePrice, setLinePrice] = useState('')

  const [autoUpdateStock, setAutoUpdateStock] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const ingredientLookup = useMemo(() => {
    return new Map(references.ingredients.map((ingredient) => [ingredient.id, ingredient]))
  }, [references.ingredients])

  function createOrder() {
    setError(null)
    startTransition(async () => {
      try {
        const created = await createProcurementOrder({
          vendorId: vendorId || undefined,
          eventId: eventId || undefined,
          notes: notes.trim() || undefined,
        })

        setOrders((prev) => [{ ...created, workflowStatus: 'Draft' }, ...prev])
        setLineOrderId(created.id)
        setVendorId('')
        setEventId('')
        setNotes('')
      } catch (err: any) {
        setError(err?.message || 'Failed to create order')
      }
    })
  }

  function addLineItem() {
    if (!lineOrderId || !ingredientId || !lineQty) return
    const ingredient = ingredientLookup.get(ingredientId)
    if (!ingredient) return

    setError(null)
    startTransition(async () => {
      try {
        await addProcurementOrderItem({
          purchaseOrderId: lineOrderId,
          ingredientId,
          ingredientName: ingredient.name,
          quantity: parseFloat(lineQty),
          unit: lineUnit || ingredient.defaultUnit,
          estimatedUnitPriceCents: linePrice ? Math.round(parseFloat(linePrice) * 100) : undefined,
        })
        setLineQty('')
        setLineUnit('')
        setLinePrice('')
      } catch (err: any) {
        setError(err?.message || 'Failed to add line item')
      }
    })
  }

  function markSent(orderId: string) {
    setError(null)
    startTransition(async () => {
      try {
        await sendProcurementOrder(orderId)
        setOrders((prev) =>
          prev.map((order) =>
            order.id === orderId ? { ...order, status: 'submitted', workflowStatus: 'Sent' } : order
          )
        )
      } catch (err: any) {
        setError(err?.message || 'Failed to send purchase order')
      }
    })
  }

  function markFulfilled(orderId: string) {
    setError(null)
    startTransition(async () => {
      try {
        await fulfillProcurementOrder(orderId, autoUpdateStock)
        setOrders((prev) =>
          prev.map((order) =>
            order.id === orderId
              ? { ...order, status: 'received', workflowStatus: 'Fulfilled' }
              : order
          )
        )
      } catch (err: any) {
        setError(err?.message || 'Failed to fulfill purchase order')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase Orders</CardTitle>
        <p className="text-sm text-stone-500">
          Create, send, and fulfill purchase orders with optional stock auto-updates.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="rounded-lg border border-stone-700 p-3">
          <p className="text-sm font-medium text-stone-300 mb-2">New Purchase Order</p>
          <div className="grid gap-2 md:grid-cols-[1fr_1fr_2fr_120px]">
            <select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className="rounded-md border border-stone-600 bg-stone-900 px-2 py-2 text-sm"
            >
              <option value="">Supplier (optional)</option>
              {references.suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>

            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="rounded-md border border-stone-600 bg-stone-900 px-2 py-2 text-sm"
            >
              <option value="">Event (optional)</option>
              {references.events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} ({new Date(`${event.date}T00:00:00`).toLocaleDateString()})
                </option>
              ))}
            </select>

            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Order notes"
              className="rounded-md border border-stone-600 bg-stone-900 px-2 py-2 text-sm"
            />

            <Button onClick={createOrder} disabled={isPending}>
              Create
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-stone-700 p-3">
          <p className="text-sm font-medium text-stone-300 mb-2">Add PO Line Item</p>
          <div className="grid gap-2 md:grid-cols-[1fr_1fr_90px_90px_90px_120px]">
            <select
              value={lineOrderId}
              onChange={(e) => setLineOrderId(e.target.value)}
              className="rounded-md border border-stone-600 bg-stone-900 px-2 py-2 text-sm"
            >
              <option value="">Purchase order...</option>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.poNumber || order.id.slice(0, 8)} ({order.workflowStatus})
                </option>
              ))}
            </select>

            <select
              value={ingredientId}
              onChange={(e) => setIngredientId(e.target.value)}
              className="rounded-md border border-stone-600 bg-stone-900 px-2 py-2 text-sm"
            >
              <option value="">Ingredient...</option>
              {references.ingredients.map((ingredient) => (
                <option key={ingredient.id} value={ingredient.id}>
                  {ingredient.name}
                </option>
              ))}
            </select>

            <input
              type="number"
              min="0"
              step="0.01"
              value={lineQty}
              onChange={(e) => setLineQty(e.target.value)}
              placeholder="Qty"
              className="rounded-md border border-stone-600 bg-stone-900 px-2 py-2 text-sm"
            />

            <input
              value={lineUnit}
              onChange={(e) => setLineUnit(e.target.value)}
              placeholder="Unit"
              className="rounded-md border border-stone-600 bg-stone-900 px-2 py-2 text-sm"
            />

            <input
              type="number"
              min="0"
              step="0.01"
              value={linePrice}
              onChange={(e) => setLinePrice(e.target.value)}
              placeholder="$"
              className="rounded-md border border-stone-600 bg-stone-900 px-2 py-2 text-sm"
            />

            <Button onClick={addLineItem} disabled={isPending || !lineOrderId || !ingredientId}>
              Add Item
            </Button>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-stone-400">
          <input
            type="checkbox"
            checked={autoUpdateStock}
            onChange={(e) => setAutoUpdateStock(e.target.checked)}
          />
          Auto-update inventory stock when fulfilling purchase orders
        </label>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-700 text-stone-500">
                <th className="px-2 py-2 text-left font-medium">PO</th>
                <th className="px-2 py-2 text-left font-medium">Supplier</th>
                <th className="px-2 py-2 text-left font-medium">Status</th>
                <th className="px-2 py-2 text-right font-medium">Estimated</th>
                <th className="px-2 py-2 text-right font-medium">Actual</th>
                <th className="px-2 py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-6 text-center text-stone-500">
                    No purchase orders yet.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-b border-stone-800">
                    <td className="px-2 py-2 text-stone-100">
                      <Link
                        href={`/inventory/purchase-orders/${order.id}`}
                        className="hover:underline"
                      >
                        {order.poNumber || order.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-2 py-2 text-stone-400">{order.vendorName || '--'}</td>
                    <td className="px-2 py-2">
                      <Badge
                        variant={
                          order.workflowStatus === 'Fulfilled'
                            ? 'success'
                            : order.workflowStatus === 'Sent'
                              ? 'info'
                              : order.workflowStatus === 'Partially Fulfilled'
                                ? 'warning'
                                : order.workflowStatus === 'Cancelled'
                                  ? 'error'
                                  : 'default'
                        }
                      >
                        {order.workflowStatus}
                      </Badge>
                    </td>
                    <td className="px-2 py-2 text-right text-stone-300">
                      {formatCurrency(order.estimatedTotalCents)}
                    </td>
                    <td className="px-2 py-2 text-right text-stone-300">
                      {formatCurrency(order.actualTotalCents)}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {order.workflowStatus === 'Draft' && (
                        <Button size="sm" variant="secondary" onClick={() => markSent(order.id)}>
                          Send
                        </Button>
                      )}
                      {(order.workflowStatus === 'Sent' ||
                        order.workflowStatus === 'Partially Fulfilled') && (
                        <Button size="sm" variant="primary" onClick={() => markFulfilled(order.id)}>
                          Fulfill
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

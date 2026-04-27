'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import {
  submitPO,
  cancelPO,
  addPOItem,
  receivePOItems,
} from '@/lib/inventory/purchase-order-actions'

const STATUS_COLORS: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'default',
  submitted: 'info',
  partially_received: 'warning',
  received: 'success',
  cancelled: 'error',
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatCents(cents: number | null) {
  if (cents == null) return '-'
  return `$${(cents / 100).toFixed(2)}`
}

type Props = {
  po: any
}

export function PODetailClient({ po }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showAddItem, setShowAddItem] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [itemName, setItemName] = useState('')
  const [itemQty, setItemQty] = useState('')
  const [itemUnit, setItemUnit] = useState('')
  const [itemPrice, setItemPrice] = useState('')
  const [receivingItems, setReceivingItems] = useState<Record<string, number>>({})

  const items = po.items || []

  function handleSubmitPO() {
    startTransition(async () => {
      try {
        await submitPO(po.id)
        router.refresh()
      } catch (err) {
        console.error('Failed to submit PO', err)
      }
    })
  }

  function handleCancelPO() {
    setShowCancelConfirm(true)
  }

  function handleConfirmedCancelPO() {
    setShowCancelConfirm(false)
    startTransition(async () => {
      try {
        await cancelPO(po.id)
        router.refresh()
      } catch (err) {
        console.error('Failed to cancel PO', err)
      }
    })
  }

  function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!itemName.trim() || !itemQty || !itemUnit.trim()) return
    startTransition(async () => {
      try {
        await addPOItem(po.id, {
          ingredientName: itemName.trim(),
          orderedQty: parseFloat(itemQty),
          unit: itemUnit.trim(),
          estimatedUnitPriceCents: itemPrice ? Math.round(parseFloat(itemPrice) * 100) : undefined,
        })
        setShowAddItem(false)
        setItemName('')
        setItemQty('')
        setItemUnit('')
        setItemPrice('')
        router.refresh()
      } catch (err) {
        console.error('Failed to add item', err)
      }
    })
  }

  function handleReceive() {
    const toReceive = Object.entries(receivingItems)
      .filter(([, qty]) => qty > 0)
      .map(([itemId, qty]) => ({ itemId, receivedQty: qty }))
    if (toReceive.length === 0) return

    startTransition(async () => {
      try {
        await receivePOItems(po.id, toReceive)
        router.refresh()
      } catch (err) {
        console.error('Failed to receive items', err)
      }
    })
  }

  const canEdit = po.status === 'draft'
  const canReceive = ['submitted', 'partially_received'].includes(po.status)

  return (
    <div className="space-y-4">
      {/* Header info */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <Badge variant={STATUS_COLORS[po.status] ?? 'default'}>{formatStatus(po.status)}</Badge>
          {po.orderDate && (
            <span className="text-sm text-stone-400">
              Ordered: {new Date(po.orderDate).toLocaleDateString()}
            </span>
          )}
          {po.expectedDelivery && (
            <span className="text-sm text-stone-400">
              Expected: {new Date(po.expectedDelivery).toLocaleDateString()}
            </span>
          )}
          <span className="text-sm text-stone-400">
            Est: {formatCents(po.estimatedTotalCents)} | Actual: {formatCents(po.actualTotalCents)}
          </span>
        </div>
        {po.notes && <p className="text-sm text-stone-500 mt-2">{po.notes}</p>}

        <div className="flex gap-2 mt-3">
          {canEdit && (
            <Button variant="primary" size="sm" onClick={handleSubmitPO} loading={isPending}>
              Submit PO
            </Button>
          )}
          {po.status !== 'cancelled' && po.status !== 'received' && (
            <Button variant="danger" size="sm" onClick={handleCancelPO} loading={isPending}>
              Cancel PO
            </Button>
          )}
        </div>
      </Card>

      {/* Items */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-700 flex items-center justify-between">
          <h3 className="font-semibold text-stone-100">Items ({items.length})</h3>
          {canEdit && (
            <Button variant="ghost" size="sm" onClick={() => setShowAddItem(!showAddItem)}>
              + Add Item
            </Button>
          )}
        </div>

        {showAddItem && (
          <form onSubmit={handleAddItem} className="p-4 border-b border-stone-700 bg-stone-800/50">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="Ingredient name"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-stone-200"
                required
              />
              <input
                type="number"
                placeholder="Qty"
                value={itemQty}
                onChange={(e) => setItemQty(e.target.value)}
                step="0.01"
                className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-stone-200"
                required
              />
              <input
                type="text"
                placeholder="Unit"
                value={itemUnit}
                onChange={(e) => setItemUnit(e.target.value)}
                className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-stone-200"
                required
              />
              <input
                type="number"
                placeholder="Price ($)"
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value)}
                step="0.01"
                className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-stone-200"
              />
            </div>
            <Button type="submit" variant="primary" size="sm" className="mt-3" loading={isPending}>
              Add
            </Button>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-700 text-stone-400">
                <th className="text-left px-4 py-3 font-medium">Ingredient</th>
                <th className="text-right px-4 py-3 font-medium">Ordered</th>
                <th className="text-right px-4 py-3 font-medium">Received</th>
                <th className="text-left px-4 py-3 font-medium">Unit</th>
                <th className="text-right px-4 py-3 font-medium">Est. Price</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                {canReceive && <th className="text-right px-4 py-3 font-medium">Receive Qty</th>}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={canReceive ? 7 : 6} className="px-4 py-8 text-center text-stone-500">
                    No items yet. Add items to this purchase order.
                  </td>
                </tr>
              ) : (
                items.map((item: any) => (
                  <tr key={item.id} className="border-b border-stone-800 hover:bg-stone-800/50">
                    <td className="px-4 py-3 text-stone-100 font-medium">{item.ingredientName}</td>
                    <td className="px-4 py-3 text-right text-stone-300">
                      {Number(item.orderedQty).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-300">
                      {Number(item.receivedQty ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-stone-400">{item.unit}</td>
                    <td className="px-4 py-3 text-right text-stone-300">
                      {formatCents(item.estimatedUnitPriceCents)}
                    </td>
                    <td className="px-4 py-3">
                      {item.isReceived ? (
                        <Badge variant="success">Received</Badge>
                      ) : item.isShorted ? (
                        <Badge variant="warning">Shorted</Badge>
                      ) : item.isDamaged ? (
                        <Badge variant="error">Damaged</Badge>
                      ) : (
                        <Badge variant="default">Pending</Badge>
                      )}
                    </td>
                    {canReceive && (
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0"
                          value={receivingItems[item.id] ?? ''}
                          onChange={(e) =>
                            setReceivingItems((prev) => ({
                              ...prev,
                              [item.id]: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="w-20 bg-stone-800 border border-stone-600 rounded px-2 py-1 text-sm text-stone-200 text-right"
                        />
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {canReceive && items.length > 0 && (
          <div className="p-4 border-t border-stone-700">
            <Button variant="primary" size="sm" onClick={handleReceive} loading={isPending}>
              Receive Checked Items
            </Button>
          </div>
        )}
      </Card>

      <ConfirmModal
        open={showCancelConfirm}
        title="Cancel this purchase order?"
        description="This purchase order will be cancelled."
        confirmLabel="Cancel PO"
        variant="danger"
        loading={isPending}
        onConfirm={handleConfirmedCancelPO}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </div>
  )
}

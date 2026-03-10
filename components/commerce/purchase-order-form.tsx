'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, Send, Package, AlertTriangle } from '@/components/ui/icons'
import {
  addItemToPO,
  removeItemFromPO,
  updatePOItem,
  sendPurchaseOrder,
  updatePurchaseOrder,
  generatePOFromParLevels,
} from '@/lib/commerce/purchase-order-actions'
import type { PurchaseOrder, PurchaseOrderItem } from '@/lib/commerce/purchase-order-actions'
import { toast } from 'sonner'

type Props = {
  po: PurchaseOrder
  items: PurchaseOrderItem[]
}

const UNIT_OPTIONS = ['each', 'lbs', 'oz', 'cases', 'bags', 'gallons', 'liters', 'bunches', 'dozen']

const STATUS_COLORS: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'default',
  sent: 'info',
  acknowledged: 'info',
  partially_received: 'warning',
  received: 'success',
  cancelled: 'error',
}

function formatCents(cents: number | null): string {
  if (cents === null || cents === undefined) return '-'
  return `$${(cents / 100).toFixed(2)}`
}

export function PurchaseOrderForm({ po, items: initialItems }: Props) {
  const [isPending, startTransition] = useTransition()
  const [items, setItems] = useState(initialItems)
  const [newItem, setNewItem] = useState({
    itemName: '',
    quantity: 1,
    unit: 'each',
    unitCostCents: '',
  })
  const [notes, setNotes] = useState(po.notes || '')
  const [deliveryDate, setDeliveryDate] = useState(po.expected_delivery_date || '')
  const isDraft = po.status === 'draft'

  function handleAddItem() {
    if (!newItem.itemName.trim()) {
      toast.error('Item name is required')
      return
    }

    const previousItems = [...items]
    startTransition(async () => {
      try {
        const added = await addItemToPO(po.id, {
          itemName: newItem.itemName.trim(),
          quantity: newItem.quantity,
          unit: newItem.unit,
          unitCostCents: newItem.unitCostCents
            ? Math.round(parseFloat(newItem.unitCostCents) * 100)
            : undefined,
        })
        setItems((prev) => [...prev, added])
        setNewItem({ itemName: '', quantity: 1, unit: 'each', unitCostCents: '' })
        toast.success('Item added')
      } catch (err) {
        setItems(previousItems)
        toast.error('Failed to add item')
      }
    })
  }

  function handleRemoveItem(itemId: string) {
    const previousItems = [...items]
    setItems((prev) => prev.filter((i) => i.id !== itemId))

    startTransition(async () => {
      try {
        await removeItemFromPO(po.id, itemId)
        toast.success('Item removed')
      } catch (err) {
        setItems(previousItems)
        toast.error('Failed to remove item')
      }
    })
  }

  function handleSend() {
    if (items.length === 0) {
      toast.error('Add items before sending')
      return
    }

    startTransition(async () => {
      try {
        // Save notes/delivery date first
        await updatePurchaseOrder(po.id, {
          notes: notes || undefined,
          expectedDeliveryDate: deliveryDate || undefined,
        })
        await sendPurchaseOrder(po.id)
        toast.success('Purchase order sent to vendor')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to send PO')
      }
    })
  }

  function handleGenerateFromPar() {
    startTransition(async () => {
      try {
        const result = await generatePOFromParLevels()
        if (result.items.length === 0) {
          toast.info('All items are at or above par levels')
          return
        }

        // Add each item
        for (const item of result.items) {
          const added = await addItemToPO(po.id, {
            itemName: item.itemName,
            quantity: item.quantity,
            unit: item.unit,
          })
          setItems((prev) => [...prev, added])
        }
        toast.success(`Added ${result.items.length} items below par level`)
      } catch (err) {
        toast.error('Failed to generate from par levels')
      }
    })
  }

  function handleSaveNotes() {
    startTransition(async () => {
      try {
        await updatePurchaseOrder(po.id, {
          notes: notes || undefined,
          expectedDeliveryDate: deliveryDate || undefined,
        })
        toast.success('Saved')
      } catch (err) {
        toast.error('Failed to save')
      }
    })
  }

  const subtotal = items.reduce((s, i) => s + (i.total_cost_cents || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{po.po_number}</h2>
          <p className="text-sm text-muted-foreground">
            {po.vendor?.name || 'Unknown Vendor'}
            {po.vendor?.contact_name && ` (${po.vendor.contact_name})`}
          </p>
        </div>
        <Badge variant={STATUS_COLORS[po.status] || 'default'}>{po.status.replace('_', ' ')}</Badge>
      </div>

      {/* Order Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Order Date</Label>
              <Input value={po.order_date} disabled />
            </div>
            <div>
              <Label>Expected Delivery</Label>
              <Input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                disabled={!isDraft}
                onBlur={isDraft ? handleSaveNotes : undefined}
              />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!isDraft}
              placeholder="Special instructions, delivery notes..."
              onBlur={isDraft ? handleSaveNotes : undefined}
            />
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Line Items</CardTitle>
            {isDraft && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerateFromPar}
                disabled={isPending}
              >
                <Package className="h-4 w-4 mr-1" />
                Generate from Par Levels
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Items table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Item</th>
                  <th className="pb-2 font-medium text-center">Qty</th>
                  <th className="pb-2 font-medium text-center">Unit</th>
                  <th className="pb-2 font-medium text-right">Unit Cost</th>
                  <th className="pb-2 font-medium text-right">Total</th>
                  {isDraft && <th className="pb-2 w-10"></th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-2">{item.item_name}</td>
                    <td className="py-2 text-center">{item.quantity}</td>
                    <td className="py-2 text-center">{item.unit}</td>
                    <td className="py-2 text-right">{formatCents(item.unit_cost_cents)}</td>
                    <td className="py-2 text-right">{formatCents(item.total_cost_cents)}</td>
                    {isDraft && (
                      <td className="py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td
                      colSpan={isDraft ? 6 : 5}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No items yet. Add items below or generate from par levels.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td colSpan={isDraft ? 4 : 3} className="pt-4 text-right">
                    Subtotal
                  </td>
                  <td className="pt-4 text-right">{formatCents(subtotal)}</td>
                  {isDraft && <td></td>}
                </tr>
                <tr className="font-bold text-lg">
                  <td colSpan={isDraft ? 4 : 3} className="pt-1 text-right">
                    Total
                  </td>
                  <td className="pt-1 text-right">{formatCents(subtotal)}</td>
                  {isDraft && <td></td>}
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Add item row */}
          {isDraft && (
            <div className="mt-4 border-t pt-4">
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  <Label className="text-xs">Item Name</Label>
                  <Input
                    value={newItem.itemName}
                    onChange={(e) => setNewItem((p) => ({ ...p, itemName: e.target.value }))}
                    placeholder="e.g. Olive Oil"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Qty</Label>
                  <Input
                    type="number"
                    min={0.01}
                    step="any"
                    value={newItem.quantity}
                    onChange={(e) =>
                      setNewItem((p) => ({
                        ...p,
                        quantity: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Unit</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={newItem.unit}
                    onChange={(e) => setNewItem((p) => ({ ...p, unit: e.target.value }))}
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Unit Cost ($)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={newItem.unitCostCents}
                    onChange={(e) => setNewItem((p) => ({ ...p, unitCostCents: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="col-span-2">
                  <Button onClick={handleAddItem} disabled={isPending} className="w-full">
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {isDraft && (
        <div className="flex justify-end gap-2">
          <Button variant="primary" onClick={handleSend} disabled={isPending || items.length === 0}>
            <Send className="h-4 w-4 mr-1" />
            Send to Vendor
          </Button>
        </div>
      )}
    </div>
  )
}

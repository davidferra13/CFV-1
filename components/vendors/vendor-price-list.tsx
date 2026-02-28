'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import {
  addVendorItem,
  updateVendorItem,
  deleteVendorItem,
} from '@/lib/vendors/vendor-item-actions'

interface VendorItem {
  id: string
  vendor_item_name: string
  vendor_sku: string | null
  unit_price_cents: number
  unit_size: string | null
  unit_measure: string | null
  updated_at?: string | null
}

interface VendorPriceListProps {
  vendorId: string
  items: VendorItem[]
}

export function VendorPriceList({ vendorId, items }: VendorPriceListProps) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null)

  // New item form state
  const [newName, setNewName] = useState('')
  const [newSku, setNewSku] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newSize, setNewSize] = useState('')
  const [newMeasure, setNewMeasure] = useState('')

  const handleInlineEdit = async (itemId: string) => {
    if (!editPrice.trim()) return
    setLoading(true)
    setError(null)
    try {
      const cents = Math.round(parseFloat(editPrice) * 100)
      await updateVendorItem(itemId, { unit_price_cents: cents })
      setEditingId(null)
      setEditPrice('')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to update price')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteItemId) return
    const itemId = deleteItemId
    setDeleteItemId(null)
    setLoading(true)
    try {
      await deleteVendorItem(itemId)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to delete item')
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || !newPrice.trim()) return
    setLoading(true)
    setError(null)
    try {
      await addVendorItem({
        vendor_id: vendorId,
        vendor_item_name: newName.trim(),
        vendor_sku: newSku.trim() || undefined,
        unit_price_cents: Math.round(parseFloat(newPrice) * 100),
        unit_size: newSize.trim() ? parseFloat(newSize.trim()) : undefined,
        unit_measure: newMeasure.trim() || undefined,
      })
      setNewName('')
      setNewSku('')
      setNewPrice('')
      setNewSize('')
      setNewMeasure('')
      setShowAdd(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to add item')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Price List</CardTitle>
        <Button variant="secondary" size="sm" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? 'Cancel' : 'Add Item'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-950 border border-red-800 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {showAdd && (
          <form
            onSubmit={handleAddItem}
            className="border border-stone-700 rounded-lg p-4 space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Item Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                placeholder="Chicken breast"
              />
              <Input
                label="SKU"
                value={newSku}
                onChange={(e) => setNewSku(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Unit Price ($)"
                type="number"
                step="0.01"
                min="0"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                required
                placeholder="0.00"
              />
              <Input
                label="Unit Size"
                value={newSize}
                onChange={(e) => setNewSize(e.target.value)}
                placeholder="e.g. 5"
              />
              <Input
                label="Unit Measure"
                value={newMeasure}
                onChange={(e) => setNewMeasure(e.target.value)}
                placeholder="e.g. lb, each"
              />
            </div>
            <Button type="submit" size="sm" loading={loading}>
              Add Item
            </Button>
          </form>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-stone-500">No items in this vendor&apos;s price list yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-700 text-left text-stone-400">
                  <th className="pb-2 pr-4">Item Name</th>
                  <th className="pb-2 pr-4">SKU</th>
                  <th className="pb-2 pr-4">Unit Price</th>
                  <th className="pb-2 pr-4">Size</th>
                  <th className="pb-2 pr-4">Measure</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-stone-800">
                    <td className="py-2 pr-4 text-stone-200">{item.vendor_item_name}</td>
                    <td className="py-2 pr-4 text-stone-400">{item.vendor_sku || '—'}</td>
                    <td className="py-2 pr-4">
                      {editingId === item.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="w-24"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleInlineEdit(item.id)}
                            loading={loading}
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingId(null)
                              setEditPrice('')
                            }}
                          >
                            X
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(item.id)
                            setEditPrice((item.unit_price_cents / 100).toFixed(2))
                          }}
                          className="text-stone-200 hover:text-brand-400 underline-offset-2 hover:underline"
                        >
                          ${(item.unit_price_cents / 100).toFixed(2)}
                        </button>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-stone-400">{item.unit_size || '—'}</td>
                    <td className="py-2 pr-4 text-stone-400">{item.unit_measure || '—'}</td>
                    <td className="py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => setDeleteItemId(item.id)}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <ConfirmModal
        open={deleteItemId !== null}
        title="Remove this item?"
        description="This item will be removed from the price list."
        confirmLabel="Remove"
        variant="danger"
        loading={loading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteItemId(null)}
      />
    </Card>
  )
}

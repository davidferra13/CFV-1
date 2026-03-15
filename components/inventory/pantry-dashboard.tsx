'use client'

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  getPantryLocations,
  getPantryItems,
  addPantryItem,
  updatePantryItem,
  removePantryItem,
  drawdownForEvent,
  getLowStockAlerts,
  getExpiringItems,
  type PantryLocation,
  type PantryItem,
} from '@/lib/inventory/pantry-actions'

export function PantryDashboard() {
  const [locations, setLocations] = useState<PantryLocation[]>([])
  const [items, setItems] = useState<PantryItem[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [lowStockItems, setLowStockItems] = useState<PantryItem[]>([])
  const [expiringItems, setExpiringItems] = useState<PantryItem[]>([])
  const [isPending, startTransition] = useTransition()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editQuantity, setEditQuantity] = useState('')
  const [drawdownEventId, setDrawdownEventId] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)

  // Add form state
  const [newItem, setNewItem] = useState({
    name: '',
    quantity: '',
    unit: '',
    category: '',
    expiryDate: '',
    minimumStock: '',
    notes: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    loadItems()
  }, [selectedLocationId])

  async function loadData() {
    try {
      setLoadError(null)
      const [locs, low, expiring] = await Promise.all([
        getPantryLocations(),
        getLowStockAlerts(),
        getExpiringItems(7),
      ])
      setLocations(locs)
      setLowStockItems(low)
      setExpiringItems(expiring)
      if (locs.length > 0 && !selectedLocationId) {
        setSelectedLocationId(locs[0].id)
      }
    } catch (err) {
      setLoadError('Failed to load pantry data. Please try again.')
      console.error('[pantry-dashboard] loadData error:', err)
    }
  }

  async function loadItems() {
    if (!selectedLocationId) {
      setItems([])
      return
    }
    try {
      const data = await getPantryItems(selectedLocationId)
      setItems(data)
    } catch (err) {
      console.error('[pantry-dashboard] loadItems error:', err)
      toast.error('Failed to load items')
    }
  }

  function handleAddItem() {
    if (!selectedLocationId || !newItem.name || !newItem.quantity) {
      toast.error('Name and quantity are required')
      return
    }

    const previousItems = items
    startTransition(async () => {
      try {
        await addPantryItem(selectedLocationId, {
          name: newItem.name,
          quantity: Number(newItem.quantity),
          unit: newItem.unit || null,
          category: newItem.category || null,
          expiryDate: newItem.expiryDate || null,
          minimumStock: newItem.minimumStock ? Number(newItem.minimumStock) : null,
          notes: newItem.notes || null,
        })
        setNewItem({
          name: '',
          quantity: '',
          unit: '',
          category: '',
          expiryDate: '',
          minimumStock: '',
          notes: '',
        })
        setShowAddForm(false)
        toast.success('Item added')
        await loadItems()
        await loadData()
      } catch (err) {
        setItems(previousItems)
        toast.error('Failed to add item')
        console.error('[pantry-dashboard] addItem error:', err)
      }
    })
  }

  function handleInlineEdit(itemId: string) {
    if (!editQuantity) return

    const previousItems = items
    const optimistic = items.map((it) =>
      it.id === itemId ? { ...it, quantity: Number(editQuantity) } : it
    )
    setItems(optimistic)
    setEditingItemId(null)

    startTransition(async () => {
      try {
        await updatePantryItem(itemId, { quantity: Number(editQuantity) })
        setEditQuantity('')
        toast.success('Quantity updated')
        await loadData()
      } catch (err) {
        setItems(previousItems)
        toast.error('Failed to update quantity')
        console.error('[pantry-dashboard] updateItem error:', err)
      }
    })
  }

  function handleRemoveItem(itemId: string) {
    const previousItems = items
    setItems(items.filter((it) => it.id !== itemId))

    startTransition(async () => {
      try {
        await removePantryItem(itemId)
        toast.success('Item removed')
        await loadData()
      } catch (err) {
        setItems(previousItems)
        toast.error('Failed to remove item')
        console.error('[pantry-dashboard] removeItem error:', err)
      }
    })
  }

  function handleDrawdown() {
    if (!drawdownEventId.trim()) {
      toast.error('Enter an event ID')
      return
    }

    startTransition(async () => {
      try {
        const result = await drawdownForEvent(drawdownEventId.trim())
        toast.success(
          `Drawdown complete: ${result.deducted} items deducted, ${result.skipped} ingredients not in pantry`
        )
        setDrawdownEventId('')
        await loadItems()
        await loadData()
      } catch (err) {
        toast.error('Drawdown failed')
        console.error('[pantry-dashboard] drawdown error:', err)
      }
    })
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-700">{loadError}</p>
        <Button variant="secondary" className="mt-3" onClick={loadData}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {(lowStockItems.length > 0 || expiringItems.length > 0) && (
        <div className="flex gap-4 flex-wrap">
          {lowStockItems.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex-1 min-w-[200px]">
              <h3 className="font-semibold text-amber-800 mb-2">Low Stock</h3>
              <ul className="space-y-1">
                {lowStockItems.map((item) => (
                  <li key={item.id} className="text-sm text-amber-700">
                    {item.name}: {item.quantity} {item.unit} (min: {item.minimumStock})
                  </li>
                ))}
              </ul>
            </div>
          )}
          {expiringItems.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex-1 min-w-[200px]">
              <h3 className="font-semibold text-red-800 mb-2">Expiring Soon</h3>
              <ul className="space-y-1">
                {expiringItems.map((item) => (
                  <li key={item.id} className="text-sm text-red-700">
                    {item.name}: expires {item.expiryDate}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Location Tabs */}
      <div className="flex gap-2 flex-wrap border-b pb-3">
        {locations.map((loc) => (
          <button
            key={loc.id}
            onClick={() => setSelectedLocationId(loc.id)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              selectedLocationId === loc.id
                ? 'bg-white border border-b-0 text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {loc.name}
            {loc.isDefault && (
              <Badge variant="info" className="ml-2 text-xs">
                Default
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Drawdown */}
      <div className="flex gap-2 items-center">
        <Input
          placeholder="Event ID for drawdown"
          value={drawdownEventId}
          onChange={(e) => setDrawdownEventId(e.target.value)}
          className="max-w-xs"
        />
        <Button
          variant="secondary"
          onClick={handleDrawdown}
          disabled={isPending || !drawdownEventId.trim()}
        >
          Drawdown for Event
        </Button>
      </div>

      {/* Items List */}
      {selectedLocationId && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">Items</h3>
            <Button variant="primary" onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? 'Cancel' : 'Add Item'}
            </Button>
          </div>

          {/* Add Item Form */}
          {showAddForm && (
            <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Item name *"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                />
                <Input
                  placeholder="Quantity *"
                  type="number"
                  step="0.01"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                />
                <Input
                  placeholder="Unit (e.g. kg, lbs, each)"
                  value={newItem.unit}
                  onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                />
                <Input
                  placeholder="Category"
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                />
                <Input
                  placeholder="Expiry date"
                  type="date"
                  value={newItem.expiryDate}
                  onChange={(e) => setNewItem({ ...newItem, expiryDate: e.target.value })}
                />
                <Input
                  placeholder="Minimum stock"
                  type="number"
                  step="0.01"
                  value={newItem.minimumStock}
                  onChange={(e) => setNewItem({ ...newItem, minimumStock: e.target.value })}
                />
              </div>
              <Input
                placeholder="Notes"
                value={newItem.notes}
                onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
              />
              <Button variant="primary" onClick={handleAddItem} disabled={isPending}>
                Save Item
              </Button>
            </div>
          )}

          {/* Item Table */}
          {items.length === 0 ? (
            <p className="text-gray-500 py-8 text-center">No items in this location yet.</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Quantity</th>
                    <th className="px-4 py-2 font-medium">Unit</th>
                    <th className="px-4 py-2 font-medium">Category</th>
                    <th className="px-4 py-2 font-medium">Expiry</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => {
                    const isLow = item.minimumStock != null && item.quantity <= item.minimumStock
                    const isExpiring =
                      item.expiryDate &&
                      new Date(item.expiryDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">{item.name}</td>
                        <td className="px-4 py-2">
                          {editingItemId === item.id ? (
                            <div className="flex gap-1">
                              <Input
                                type="number"
                                step="0.01"
                                value={editQuantity}
                                onChange={(e) => setEditQuantity(e.target.value)}
                                className="w-20 h-7 text-sm"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleInlineEdit(item.id)
                                  if (e.key === 'Escape') setEditingItemId(null)
                                }}
                                autoFocus
                              />
                              <Button
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() => handleInlineEdit(item.id)}
                              >
                                Save
                              </Button>
                            </div>
                          ) : (
                            <button
                              className="hover:underline cursor-pointer"
                              onClick={() => {
                                setEditingItemId(item.id)
                                setEditQuantity(String(item.quantity))
                              }}
                            >
                              {item.quantity}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-2 text-gray-600">{item.unit || '-'}</td>
                        <td className="px-4 py-2 text-gray-600">{item.category || '-'}</td>
                        <td className="px-4 py-2 text-gray-600">{item.expiryDate || '-'}</td>
                        <td className="px-4 py-2">
                          {isLow && (
                            <Badge variant="warning" className="mr-1">
                              Low
                            </Badge>
                          )}
                          {isExpiring && <Badge variant="error">Expiring</Badge>}
                          {!isLow && !isExpiring && <Badge variant="success">OK</Badge>}
                        </td>
                        <td className="px-4 py-2">
                          <Button
                            variant="ghost"
                            className="h-7 px-2 text-xs text-red-600"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={isPending}
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {locations.length === 0 && (
        <p className="text-gray-500 py-8 text-center">
          No pantry locations yet. Add your first location to start tracking inventory.
        </p>
      )}
    </div>
  )
}

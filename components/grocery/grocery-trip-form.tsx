'use client'

// Grocery Trip Form
// Create a new grocery trip with line items (store, date, items with price/qty/category).

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  createGroceryTrip,
  addTripItem,
  removeTripItem,
  type CreateTripInput,
  type AddItemInput,
} from '@/lib/grocery/grocery-splitting-actions'
import { todayLocalDateString } from '@/lib/utils/format'

const CATEGORIES = [
  { value: 'produce', label: 'Produce', color: 'bg-green-100 text-green-800' },
  { value: 'protein', label: 'Protein', color: 'bg-red-100 text-red-800' },
  { value: 'dairy', label: 'Dairy', color: 'bg-brand-100 text-brand-800' },
  { value: 'pantry', label: 'Pantry', color: 'bg-amber-100 text-amber-800' },
  { value: 'frozen', label: 'Frozen', color: 'bg-brand-100 text-brand-800' },
  { value: 'bakery', label: 'Bakery', color: 'bg-orange-100 text-orange-800' },
  { value: 'beverage', label: 'Beverage', color: 'bg-purple-100 text-purple-800' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-800' },
] as const

type CategoryValue = (typeof CATEGORIES)[number]['value']

type TripItem = {
  id: string
  item_name: string
  quantity: number
  unit: string | null
  price_cents: number
  category: string | null
}

type Props = {
  tripId?: string
  initialItems?: TripItem[]
  initialStoreName?: string
  initialDate?: string
  initialNotes?: string
  onDone?: (tripId: string) => void
}

export function GroceryTripForm({
  tripId: existingTripId,
  initialItems = [],
  initialStoreName = '',
  initialDate,
  initialNotes = '',
  onDone,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [storeName, setStoreName] = useState(initialStoreName)
  const [tripDate, setTripDate] = useState(initialDate || todayLocalDateString())
  const [notes, setNotes] = useState(initialNotes)
  const [items, setItems] = useState<TripItem[]>(initialItems)
  const [tripId, setTripId] = useState<string | null>(existingTripId ?? null)
  const [error, setError] = useState<string | null>(null)

  // New item form state
  const [newItem, setNewItem] = useState({
    name: '',
    quantity: '1',
    unit: '',
    priceDollars: '',
    category: 'other' as CategoryValue,
  })

  const runningTotal = items.reduce((sum, item) => sum + item.price_cents, 0)

  function getCategoryBadge(cat: string | null) {
    const found = CATEGORIES.find((c) => c.value === cat)
    if (!found) return null
    return (
      <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${found.color}`}>
        {found.label}
      </span>
    )
  }

  async function ensureTrip(): Promise<string> {
    if (tripId) return tripId

    const trip = await createGroceryTrip({
      store_name: storeName || undefined,
      trip_date: tripDate,
      notes: notes || undefined,
    })
    setTripId(trip.id)
    return trip.id
  }

  function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newItem.name || !newItem.priceDollars) return

    const priceCents = Math.round(parseFloat(newItem.priceDollars) * 100)
    if (isNaN(priceCents) || priceCents < 0) return

    const previousItems = [...items]
    setError(null)

    startTransition(async () => {
      try {
        const tid = await ensureTrip()
        const item = await addTripItem(tid, {
          item_name: newItem.name,
          quantity: parseFloat(newItem.quantity) || 1,
          unit: newItem.unit || undefined,
          price_cents: priceCents,
          category: newItem.category,
        })

        setItems((prev) => [...prev, item])
        setNewItem({ name: '', quantity: '1', unit: '', priceDollars: '', category: 'other' })
      } catch (err) {
        setItems(previousItems)
        setError(err instanceof Error ? err.message : 'Failed to add item')
      }
    })
  }

  function handleRemoveItem(itemId: string) {
    const previousItems = [...items]
    setItems((prev) => prev.filter((i) => i.id !== itemId))
    setError(null)

    startTransition(async () => {
      try {
        await removeTripItem(itemId)
      } catch (err) {
        setItems(previousItems)
        setError(err instanceof Error ? err.message : 'Failed to remove item')
      }
    })
  }

  function handleFinish() {
    if (tripId) {
      onDone?.(tripId)
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      {error && <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}

      {/* Trip details */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Store</label>
          <Input
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="e.g. Whole Foods"
            disabled={isPending}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <Input
            type="date"
            value={tripDate}
            onChange={(e) => setTripDate(e.target.value)}
            disabled={isPending}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes"
            disabled={isPending}
          />
        </div>
      </div>

      {/* Add item form */}
      <form onSubmit={handleAddItem} className="border rounded-lg p-4 bg-gray-50 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Add Item</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Input
            placeholder="Item name"
            value={newItem.name}
            onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
            disabled={isPending}
            className="col-span-2 sm:col-span-1"
          />
          <Input
            type="number"
            placeholder="Qty"
            value={newItem.quantity}
            onChange={(e) => setNewItem((p) => ({ ...p, quantity: e.target.value }))}
            disabled={isPending}
            min="0.01"
            step="0.01"
          />
          <Input
            placeholder="Unit (oz, lb...)"
            value={newItem.unit}
            onChange={(e) => setNewItem((p) => ({ ...p, unit: e.target.value }))}
            disabled={isPending}
          />
          <Input
            type="number"
            placeholder="Price ($)"
            value={newItem.priceDollars}
            onChange={(e) => setNewItem((p) => ({ ...p, priceDollars: e.target.value }))}
            disabled={isPending}
            min="0"
            step="0.01"
          />
          <select
            value={newItem.category}
            onChange={(e) =>
              setNewItem((p) => ({ ...p, category: e.target.value as CategoryValue }))
            }
            disabled={isPending}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="submit"
          variant="secondary"
          disabled={isPending || !newItem.name || !newItem.priceDollars}
        >
          Add Item
        </Button>
      </form>

      {/* Item list */}
      {items.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Item</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Qty</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Category</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Price</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 text-sm text-gray-900">{item.item_name}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {item.quantity}
                    {item.unit ? ` ${item.unit}` : ''}
                  </td>
                  <td className="px-4 py-2">{getCategoryBadge(item.category)}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">
                    ${(item.price_cents / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={isPending}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 bg-gray-50 text-right font-semibold text-gray-900">
            Total: ${(runningTotal / 100).toFixed(2)}
          </div>
        </div>
      )}

      {/* Finish */}
      {tripId && items.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleFinish} disabled={isPending}>
            Done - Split Costs
          </Button>
        </div>
      )}
    </div>
  )
}

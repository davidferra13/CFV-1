// New Shopping List Form
// Allows adding a name and items with category assignment

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { createShoppingList, SHOPPING_CATEGORIES } from '@/lib/shopping/actions'
import type { ShoppingItem } from '@/lib/shopping/actions'
import { Plus, Trash2, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'

export function NewShoppingListForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [newItemName, setNewItemName] = useState('')
  const [newItemQty, setNewItemQty] = useState('')
  const [newItemUnit, setNewItemUnit] = useState('')
  const [newItemCategory, setNewItemCategory] = useState('Other')

  function addItem() {
    if (!newItemName.trim()) return

    setItems((prev) => [
      ...prev,
      {
        name: newItemName.trim(),
        quantity: newItemQty ? parseFloat(newItemQty) : null,
        unit: newItemUnit || null,
        category: newItemCategory,
        checked: false,
        estimated_price_cents: null,
        actual_price_cents: null,
        vendor: null,
        notes: null,
      },
    ])
    setNewItemName('')
    setNewItemQty('')
    setNewItemUnit('')
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmit() {
    if (!name.trim()) {
      toast.error('Please enter a list name')
      return
    }

    startTransition(async () => {
      try {
        const result = await createShoppingList({
          name: name.trim(),
          items,
        })
        toast.success('Shopping list created')
        router.push(`/shopping/${result.id}`)
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to create shopping list'
        )
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* List name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          List Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Saturday Dinner Shopping"
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>

      {/* Add item form */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Add Items</h3>
        <div className="space-y-3">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Item name"
            className="w-full px-3 py-2 border rounded-lg"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addItem()
              }
            }}
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={newItemQty}
              onChange={(e) => setNewItemQty(e.target.value)}
              placeholder="Qty"
              className="w-20 px-3 py-2 border rounded-lg"
              step="any"
            />
            <input
              type="text"
              value={newItemUnit}
              onChange={(e) => setNewItemUnit(e.target.value)}
              placeholder="Unit (lb, oz, ea)"
              className="flex-1 px-3 py-2 border rounded-lg"
            />
            <select
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-white"
            >
              {SHOPPING_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <Button
            variant="secondary"
            onClick={addItem}
            disabled={!newItemName.trim()}
            className="w-full flex items-center justify-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>
      </Card>

      {/* Items preview */}
      {items.length > 0 && (
        <Card className="p-4">
          <h3 className="font-medium mb-3">{items.length} Items</h3>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div>
                  <span className="font-medium">{item.name}</span>
                  {item.quantity && (
                    <span className="text-gray-500 ml-2">
                      {item.quantity} {item.unit || ''}
                    </span>
                  )}
                  <span className="text-xs text-gray-400 ml-2 bg-gray-100 px-1.5 py-0.5 rounded">
                    {item.category}
                  </span>
                </div>
                <button
                  onClick={() => removeItem(idx)}
                  className="text-red-400 hover:text-red-600 p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Submit */}
      <Button
        variant="primary"
        onClick={handleSubmit}
        disabled={isPending || !name.trim()}
        className="w-full flex items-center justify-center gap-2 py-3 text-lg"
      >
        <ShoppingCart className="h-5 w-5" />
        {isPending ? 'Creating...' : 'Create Shopping List'}
      </Button>
    </div>
  )
}

/* eslint-disable @next/next/no-img-element */
'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import {
  getMealPrepItems,
  toggleItemAvailability,
  deleteMealPrepItem,
  type MealPrepItem,
} from '@/lib/store/meal-prep-actions'
import { MealPrepItemForm } from './meal-prep-item-form'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'entree', label: 'Entree' },
  { value: 'side', label: 'Side' },
  { value: 'soup', label: 'Soup' },
  { value: 'salad', label: 'Salad' },
  { value: 'snack', label: 'Snack' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'beverage', label: 'Beverage' },
  { value: 'bundle', label: 'Bundle' },
]

export function MealPrepMenuManager() {
  const [items, setItems] = useState<MealPrepItem[]>([])
  const [filter, setFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<MealPrepItem | null>(null)
  const [isPending, startTransition] = useTransition()

  const loadItems = useCallback(async () => {
    try {
      const data = await getMealPrepItems(filter ? { category: filter } : undefined)
      setItems(data)
    } catch (err) {
      toast.error('Failed to load menu items')
    }
  }, [filter])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const handleToggle = (item: MealPrepItem) => {
    const previous = items
    setItems(items.map((i) => (i.id === item.id ? { ...i, is_available: !i.is_available } : i)))
    startTransition(async () => {
      try {
        await toggleItemAvailability(item.id)
      } catch (err) {
        setItems(previous)
        toast.error('Failed to toggle availability')
      }
    })
  }

  const handleDelete = (item: MealPrepItem) => {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return

    const previous = items
    setItems(items.filter((i) => i.id !== item.id))
    startTransition(async () => {
      try {
        await deleteMealPrepItem(item.id)
        toast.success('Item deleted')
      } catch (err) {
        setItems(previous)
        toast.error('Failed to delete item')
      }
    })
  }

  const handleSaved = () => {
    setShowForm(false)
    setEditingItem(null)
    loadItems()
  }

  if (showForm || editingItem) {
    return (
      <MealPrepItemForm
        item={editingItem ?? undefined}
        onSaved={handleSaved}
        onCancel={() => {
          setShowForm(false)
          setEditingItem(null)
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Menu Items</h2>
        <Button variant="primary" onClick={() => setShowForm(true)}>
          Add Item
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setFilter(cat.value)}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              filter === cat.value
                ? 'bg-amber-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Items grid */}
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-gray-500">
          No menu items yet. Add your first item to get started.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`rounded-lg border p-4 transition-opacity ${
                !item.is_available ? 'opacity-50' : ''
              }`}
            >
              {item.photo_url && (
                <img
                  src={item.photo_url}
                  alt={item.name}
                  className="mb-3 h-32 w-full rounded-md object-cover"
                />
              )}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">{item.name}</h3>
                  <p className="text-sm text-gray-500">${(item.price_cents / 100).toFixed(2)}</p>
                </div>
                <Badge variant={item.is_available ? 'success' : 'default'}>{item.category}</Badge>
              </div>

              {item.description && (
                <p className="mt-2 text-sm text-gray-600 line-clamp-2">{item.description}</p>
              )}

              {item.dietary_tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.dietary_tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between border-t pt-3">
                {/* Availability toggle */}
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.is_available}
                    onChange={() => handleToggle(item)}
                    className="h-4 w-4 rounded border-gray-300"
                    disabled={isPending}
                  />
                  Available
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingItem(item)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="text-sm text-red-600 hover:underline"
                    disabled={isPending}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

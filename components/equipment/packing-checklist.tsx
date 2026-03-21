'use client'

import { useState, useTransition, useCallback } from 'react'
import {
  toggleItemPacked,
  toggleItemReturned,
  addChecklistItem,
  removeChecklistItem,
  type PackingChecklist as ChecklistType,
  type PackingChecklistItem,
  type EquipmentCategory,
} from '@/lib/equipment/packing-actions'

const CATEGORY_COLORS: Record<string, string> = {
  cookware: 'bg-orange-100 text-orange-800',
  bakeware: 'bg-amber-100 text-amber-800',
  knives: 'bg-red-100 text-red-800',
  utensils: 'bg-brand-100 text-brand-800',
  appliances: 'bg-purple-100 text-purple-800',
  serving: 'bg-green-100 text-green-800',
  transport: 'bg-gray-100 text-gray-800',
  cleaning: 'bg-brand-100 text-brand-800',
  specialty: 'bg-pink-100 text-pink-800',
  other: 'bg-slate-100 text-slate-800',
}

interface PackingChecklistProps {
  checklist: ChecklistType & { items: PackingChecklistItem[] }
  showReturnColumn?: boolean
}

export default function PackingChecklist({
  checklist,
  showReturnColumn = false,
}: PackingChecklistProps) {
  const [items, setItems] = useState<PackingChecklistItem[]>(checklist.items)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState<string>('other')
  const [printMode, setPrintMode] = useState(false)

  const packedCount = items.filter((i) => i.is_packed).length
  const totalCount = items.length
  const progressPercent = totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0

  const returnedCount = items.filter((i) => i.is_returned).length

  // Group items by category
  const grouped = items.reduce<Record<string, PackingChecklistItem[]>>((acc, item) => {
    const cat = item.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const handleTogglePacked = useCallback(
    (itemId: string) => {
      const previousItems = items
      setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, is_packed: !i.is_packed } : i)))
      setError(null)
      startTransition(async () => {
        try {
          await toggleItemPacked(itemId)
        } catch (err) {
          setItems(previousItems)
          setError(err instanceof Error ? err.message : 'Failed to update item')
        }
      })
    },
    [items]
  )

  const handleToggleReturned = useCallback(
    (itemId: string) => {
      const previousItems = items
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, is_returned: !i.is_returned } : i))
      )
      setError(null)
      startTransition(async () => {
        try {
          await toggleItemReturned(itemId)
        } catch (err) {
          setItems(previousItems)
          setError(err instanceof Error ? err.message : 'Failed to update item')
        }
      })
    },
    [items]
  )

  const handleAddItem = () => {
    if (!newItemName.trim()) return
    const previousItems = items
    setError(null)
    startTransition(async () => {
      try {
        const newItem = await addChecklistItem(checklist.id, {
          item_name: newItemName.trim(),
          category: newItemCategory,
        })
        setItems((prev) => [...prev, newItem])
        setNewItemName('')
        setShowAddItem(false)
      } catch (err) {
        setItems(previousItems)
        setError(err instanceof Error ? err.message : 'Failed to add item')
      }
    })
  }

  const handleRemoveItem = (itemId: string) => {
    const previousItems = items
    setItems((prev) => prev.filter((i) => i.id !== itemId))
    setError(null)
    startTransition(async () => {
      try {
        await removeChecklistItem(itemId)
      } catch (err) {
        setItems(previousItems)
        setError(err instanceof Error ? err.message : 'Failed to remove item')
      }
    })
  }

  if (printMode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between print:hidden">
          <button
            onClick={() => setPrintMode(false)}
            className="text-sm text-brand-600 hover:underline"
          >
            Back to interactive view
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-md bg-gray-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-900"
          >
            Print
          </button>
        </div>
        <h2 className="text-lg font-bold">{checklist.name}</h2>
        <p className="text-sm text-gray-500">
          {packedCount} of {totalCount} packed ({progressPercent}%)
        </p>
        {Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([category, catItems]) => (
            <div key={category} className="mb-3">
              <h3 className="text-sm font-semibold capitalize mb-1">{category}</h3>
              <ul className="space-y-0.5">
                {catItems.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 text-sm">
                    <span className="inline-block w-4 h-4 border border-gray-400 rounded-sm flex-shrink-0">
                      {item.is_packed && (
                        <span className="block w-full h-full bg-gray-400 rounded-sm" />
                      )}
                    </span>
                    <span className={item.is_packed ? 'line-through text-gray-400' : ''}>
                      {item.item_name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{checklist.name}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setPrintMode(true)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            Print View
          </button>
          <button
            onClick={() => setShowAddItem(true)}
            className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700"
          >
            + Add Item
          </button>
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {packedCount} of {totalCount} packed
          </span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className={`h-2 rounded-full transition-all ${
              progressPercent === 100 ? 'bg-green-500' : 'bg-orange-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {showReturnColumn && totalCount > 0 && (
          <p className="text-xs text-gray-500">
            {returnedCount} of {totalCount} returned
          </p>
        )}
      </div>

      {/* Add item form */}
      {showAddItem && (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Item name"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
              className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              autoFocus
            />
            <select
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              {Object.keys(CATEGORY_COLORS).map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddItem}
              disabled={isPending}
              className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowAddItem(false)
                setNewItemName('')
              }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Checklist items grouped by category */}
      {totalCount === 0 && (
        <p className="text-sm text-gray-500 py-8 text-center">
          No items in this checklist yet. Add items or generate from your equipment inventory.
        </p>
      )}

      {Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([category, catItems]) => (
          <div key={category} className="space-y-1">
            <h3 className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[category] || CATEGORY_COLORS.other}`}
              >
                {category}
              </span>
              <span className="text-gray-400">
                ({catItems.filter((i) => i.is_packed).length}/{catItems.length})
              </span>
            </h3>
            <div className="divide-y divide-gray-100 rounded-md border border-gray-200 bg-white">
              {catItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-3 py-2">
                  {/* Pack checkbox */}
                  <button
                    onClick={() => handleTogglePacked(item.id)}
                    className={`flex-shrink-0 h-5 w-5 rounded border-2 transition-colors ${
                      item.is_packed
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 hover:border-orange-400'
                    }`}
                    title={item.is_packed ? 'Mark as not packed' : 'Mark as packed'}
                  >
                    {item.is_packed && (
                      <svg
                        className="h-full w-full"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>

                  {/* Item details */}
                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-sm ${item.is_packed ? 'line-through text-gray-400' : 'text-gray-900'}`}
                    >
                      {item.item_name}
                    </span>
                    {item.notes && <p className="text-xs text-gray-500 truncate">{item.notes}</p>}
                  </div>

                  {/* Return checkbox (for post-event) */}
                  {showReturnColumn && (
                    <button
                      onClick={() => handleToggleReturned(item.id)}
                      className={`flex-shrink-0 h-5 w-5 rounded border-2 transition-colors ${
                        item.is_returned
                          ? 'bg-brand-500 border-brand-500 text-white'
                          : 'border-gray-300 hover:border-brand-400'
                      }`}
                      title={item.is_returned ? 'Mark as not returned' : 'Mark as returned'}
                    >
                      {item.is_returned && (
                        <svg
                          className="h-full w-full"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                  )}

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="flex-shrink-0 rounded p-1 text-gray-400 hover:text-red-600 hover:bg-red-50"
                    title="Remove item"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  )
}

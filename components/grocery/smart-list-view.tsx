'use client'

import { useState, useTransition, useCallback } from 'react'
import {
  type SmartGroceryItem,
  type SmartGroceryList,
  type AisleSection,
  toggleItemChecked,
  addItem,
  updateItem,
  removeItem,
  reorderItems,
  autoAssignAisles,
  completeList,
} from '@/lib/grocery/smart-list-actions'
import { Button } from '@/components/ui/button'

// ============================================
// AISLE DISPLAY CONFIG
// ============================================

const AISLE_CONFIG: Record<AisleSection, { label: string; color: string; bg: string }> = {
  produce: { label: 'Produce', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  meat_seafood: { label: 'Meat & Seafood', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  dairy_eggs: { label: 'Dairy & Eggs', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  bakery: { label: 'Bakery', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  frozen: { label: 'Frozen', color: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200' },
  pantry_dry: { label: 'Pantry / Dry Goods', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  canned: { label: 'Canned Goods', color: 'text-stone-700', bg: 'bg-stone-50 border-stone-200' },
  condiments_sauces: { label: 'Condiments & Sauces', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
  spices: { label: 'Spices', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
  beverages: { label: 'Beverages', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  deli: { label: 'Deli', color: 'text-pink-700', bg: 'bg-pink-50 border-pink-200' },
  bulk: { label: 'Bulk', color: 'text-lime-700', bg: 'bg-lime-50 border-lime-200' },
  international: { label: 'International', color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200' },
  baking: { label: 'Baking', color: 'text-fuchsia-700', bg: 'bg-fuchsia-50 border-fuchsia-200' },
  snacks: { label: 'Snacks', color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
  household: { label: 'Household', color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
  other: { label: 'Other', color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
}

const AISLE_ORDER: AisleSection[] = [
  'produce', 'meat_seafood', 'dairy_eggs', 'bakery', 'deli', 'frozen',
  'pantry_dry', 'canned', 'condiments_sauces', 'spices', 'baking',
  'beverages', 'snacks', 'bulk', 'international', 'household', 'other',
]

// ============================================
// COMPONENT
// ============================================

interface SmartListViewProps {
  list: SmartGroceryList & { smart_grocery_items: SmartGroceryItem[] }
  onBack: () => void
}

export function SmartListView({ list: initialList, onBack }: SmartListViewProps) {
  const [list, setList] = useState(initialList)
  const [isPending, startTransition] = useTransition()
  const [newItemName, setNewItemName] = useState('')
  const [newItemQty, setNewItemQty] = useState('1')
  const [newItemUnit, setNewItemUnit] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ quantity: string; notes: string }>({ quantity: '1', notes: '' })
  const [isPrintMode, setIsPrintMode] = useState(false)

  const items = list.smart_grocery_items || []
  const checkedCount = items.filter(i => i.is_checked).length
  const totalCount = items.length
  const progressPct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

  // Group items by aisle
  const grouped = new Map<AisleSection, SmartGroceryItem[]>()
  for (const item of items) {
    const section = (item.aisle_section as AisleSection) || 'other'
    if (!grouped.has(section)) grouped.set(section, [])
    grouped.get(section)!.push(item)
  }

  // Sort sections by defined order
  const sortedSections = AISLE_ORDER.filter(s => grouped.has(s))

  const handleToggle = useCallback((itemId: string) => {
    const previous = { ...list, smart_grocery_items: [...list.smart_grocery_items] }
    // Optimistic update
    setList(prev => ({
      ...prev,
      smart_grocery_items: prev.smart_grocery_items.map(i =>
        i.id === itemId ? { ...i, is_checked: !i.is_checked } : i
      ),
    }))
    startTransition(async () => {
      try {
        await toggleItemChecked(itemId)
      } catch {
        setList(previous)
      }
    })
  }, [list])

  const handleAddItem = useCallback(() => {
    if (!newItemName.trim()) return
    const name = newItemName.trim()
    const qty = parseFloat(newItemQty) || 1
    const unit = newItemUnit.trim() || undefined

    setNewItemName('')
    setNewItemQty('1')
    setNewItemUnit('')

    startTransition(async () => {
      try {
        const item = await addItem(list.id, { name, quantity: qty, unit })
        setList(prev => ({
          ...prev,
          smart_grocery_items: [...prev.smart_grocery_items, item],
        }))
      } catch {
        // Item wasn't added, no rollback needed since we didn't optimistically add
      }
    })
  }, [newItemName, newItemQty, newItemUnit, list.id])

  const handleRemove = useCallback((itemId: string) => {
    const previous = { ...list, smart_grocery_items: [...list.smart_grocery_items] }
    setList(prev => ({
      ...prev,
      smart_grocery_items: prev.smart_grocery_items.filter(i => i.id !== itemId),
    }))
    startTransition(async () => {
      try {
        await removeItem(itemId)
      } catch {
        setList(previous)
      }
    })
  }, [list])

  const handleStartEdit = useCallback((item: SmartGroceryItem) => {
    setEditingId(item.id)
    setEditValues({
      quantity: String(item.quantity),
      notes: item.notes || '',
    })
  }, [])

  const handleSaveEdit = useCallback((itemId: string) => {
    const qty = parseFloat(editValues.quantity) || 1
    const notes = editValues.notes.trim() || null

    const previous = { ...list, smart_grocery_items: [...list.smart_grocery_items] }
    setList(prev => ({
      ...prev,
      smart_grocery_items: prev.smart_grocery_items.map(i =>
        i.id === itemId ? { ...i, quantity: qty, notes } : i
      ),
    }))
    setEditingId(null)

    startTransition(async () => {
      try {
        await updateItem(itemId, { quantity: qty, notes })
      } catch {
        setList(previous)
      }
    })
  }, [editValues, list])

  const handleMoveItem = useCallback((section: AisleSection, itemId: string, direction: 'up' | 'down') => {
    const sectionItems = grouped.get(section) || []
    const idx = sectionItems.findIndex(i => i.id === itemId)
    if (idx < 0) return
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === sectionItems.length - 1) return

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const newOrder = [...sectionItems]
    ;[newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]]

    const newIds = newOrder.map(i => i.id)
    // Optimistic: swap sort_order
    const previous = { ...list, smart_grocery_items: [...list.smart_grocery_items] }
    setList(prev => {
      const updated = prev.smart_grocery_items.map(i => {
        const newIdx = newIds.indexOf(i.id)
        if (newIdx >= 0) return { ...i, sort_order: newIdx }
        return i
      })
      return { ...prev, smart_grocery_items: updated }
    })

    startTransition(async () => {
      try {
        await reorderItems(list.id, newIds)
      } catch {
        setList(previous)
      }
    })
  }, [grouped, list])

  const handleAutoAssign = useCallback(() => {
    startTransition(async () => {
      try {
        await autoAssignAisles(list.id)
        // Reload via revalidation; for now re-fetch would be needed
        // The page will revalidate via revalidatePath
      } catch {
        // No-op, server will not have changed
      }
    })
  }, [list.id])

  const handleComplete = useCallback(() => {
    startTransition(async () => {
      try {
        await completeList(list.id)
        onBack()
      } catch {
        // Stay on page
      }
    })
  }, [list.id, onBack])

  if (isPrintMode) {
    return (
      <div className="p-8 print:p-0">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <Button variant="ghost" onClick={() => setIsPrintMode(false)}>Exit Print Mode</Button>
          <Button variant="primary" onClick={() => window.print()}>Print</Button>
        </div>
        <h1 className="text-2xl font-bold mb-4">{list.name}</h1>
        {sortedSections.map(section => {
          const config = AISLE_CONFIG[section]
          const sectionItems = grouped.get(section) || []
          return (
            <div key={section} className="mb-6">
              <h2 className="text-lg font-semibold mb-2">{config.label}</h2>
              <ul className="space-y-1">
                {sectionItems.map(item => (
                  <li key={item.id} className="flex gap-2 text-base">
                    <span className="w-5">{item.is_checked ? '\u2713' : '\u25A1'}</span>
                    <span className={item.is_checked ? 'line-through text-gray-400' : ''}>
                      {item.quantity}{item.unit ? ` ${item.unit}` : ''} {item.name}
                    </span>
                    {item.notes && <span className="text-gray-500 text-sm">({item.notes})</span>}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack}>&larr; Back</Button>
          <h2 className="text-xl font-semibold">{list.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setIsPrintMode(true)} disabled={isPending}>
            Print
          </Button>
          <Button variant="ghost" onClick={handleAutoAssign} disabled={isPending}>
            Auto-assign Aisles
          </Button>
          <Button variant="primary" onClick={handleComplete} disabled={isPending}>
            Mark Complete
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm text-gray-600">
          <span>{checkedCount} of {totalCount} items</span>
          <span>{progressPct}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-green-500 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Grouped items */}
      {sortedSections.map(section => {
        const config = AISLE_CONFIG[section]
        const sectionItems = grouped.get(section) || []
        return (
          <div key={section} className={`rounded-lg border p-3 ${config.bg}`}>
            <h3 className={`font-semibold mb-2 ${config.color}`}>{config.label}</h3>
            <ul className="space-y-1">
              {sectionItems.map((item, idx) => (
                <li key={item.id} className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    checked={item.is_checked}
                    onChange={() => handleToggle(item.id)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className={`flex-1 ${item.is_checked ? 'line-through text-gray-400' : ''}`}>
                    <span className="font-medium">{item.quantity}{item.unit ? ` ${item.unit}` : ''}</span>{' '}
                    {item.name}
                    {item.notes && <span className="text-xs text-gray-500 ml-1">({item.notes})</span>}
                    {item.price_estimate_cents != null && (
                      <span className="text-xs text-gray-500 ml-1">
                        ~${(item.price_estimate_cents / 100).toFixed(2)}
                      </span>
                    )}
                  </span>

                  {editingId === item.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={editValues.quantity}
                        onChange={e => setEditValues(v => ({ ...v, quantity: e.target.value }))}
                        className="w-16 text-sm border rounded px-1 py-0.5"
                        min="0"
                        step="0.1"
                      />
                      <input
                        type="text"
                        value={editValues.notes}
                        onChange={e => setEditValues(v => ({ ...v, notes: e.target.value }))}
                        placeholder="Notes"
                        className="w-24 text-sm border rounded px-1 py-0.5"
                      />
                      <Button variant="ghost" onClick={() => handleSaveEdit(item.id)}>Save</Button>
                      <Button variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveItem(section, item.id, 'up')}
                        disabled={idx === 0 || isPending}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-sm px-1"
                        title="Move up"
                      >
                        &uarr;
                      </button>
                      <button
                        onClick={() => handleMoveItem(section, item.id, 'down')}
                        disabled={idx === sectionItems.length - 1 || isPending}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-sm px-1"
                        title="Move down"
                      >
                        &darr;
                      </button>
                      <button
                        onClick={() => handleStartEdit(item)}
                        className="text-gray-400 hover:text-gray-600 text-sm px-1"
                        title="Edit"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleRemove(item.id)}
                        disabled={isPending}
                        className="text-red-400 hover:text-red-600 text-sm px-1"
                        title="Remove"
                      >
                        &times;
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )
      })}

      {totalCount === 0 && (
        <p className="text-gray-500 text-center py-8">No items yet. Add your first item below.</p>
      )}

      {/* Add item form */}
      <div className="flex items-center gap-2 border rounded-lg p-3 bg-white">
        <input
          type="text"
          value={newItemName}
          onChange={e => setNewItemName(e.target.value)}
          placeholder="Item name"
          className="flex-1 border rounded px-2 py-1.5 text-sm"
          onKeyDown={e => { if (e.key === 'Enter') handleAddItem() }}
        />
        <input
          type="number"
          value={newItemQty}
          onChange={e => setNewItemQty(e.target.value)}
          className="w-16 border rounded px-2 py-1.5 text-sm"
          min="0"
          step="0.1"
        />
        <input
          type="text"
          value={newItemUnit}
          onChange={e => setNewItemUnit(e.target.value)}
          placeholder="Unit"
          className="w-20 border rounded px-2 py-1.5 text-sm"
        />
        <Button variant="primary" onClick={handleAddItem} disabled={isPending || !newItemName.trim()}>
          Add
        </Button>
      </div>
    </div>
  )
}

'use client'

import { useState, useTransition, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  getOrCreateIngredientBoard,
  addIngredientItem,
  updateIngredientItem,
  removeIngredientItem,
  type IngredientBoard,
  type IngredientBoardItem,
  type IngredientCategory,
  type IngredientStatus,
} from '@/lib/hub/ingredient-board-actions'
import { syncMenuToIngredientBoard } from '@/lib/hub/ingredient-board-sync'

const CATEGORIES: { id: IngredientCategory; label: string; emoji: string }[] = [
  { id: 'produce', label: 'Produce', emoji: '🥬' },
  { id: 'protein', label: 'Protein', emoji: '🥩' },
  { id: 'dairy', label: 'Dairy', emoji: '🧀' },
  { id: 'herb', label: 'Herbs', emoji: '🌿' },
  { id: 'grain', label: 'Grains', emoji: '🌾' },
  { id: 'pantry', label: 'Pantry', emoji: '🫙' },
  { id: 'other', label: 'Other', emoji: '📦' },
]

const STATUS_CONFIG: Record<IngredientStatus, { label: string; color: string; bg: string }> = {
  available: { label: 'Available', color: 'text-emerald-300', bg: 'bg-emerald-900/40' },
  limited: { label: 'Limited', color: 'text-amber-300', bg: 'bg-amber-900/40' },
  unavailable: { label: 'Unavailable', color: 'text-red-300', bg: 'bg-red-900/40' },
  sourced_externally: { label: 'Sourcing', color: 'text-blue-300', bg: 'bg-blue-900/40' },
}

type Props = {
  groupId: string
  eventId?: string
  isCoHost?: boolean
}

export function IngredientAvailabilityBoard({ groupId, eventId, isCoHost }: Props) {
  const [board, setBoard] = useState<IngredientBoard | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<IngredientCategory>('produce')
  const [newQuantity, setNewQuantity] = useState('')
  const [newOfferedBy, setNewOfferedBy] = useState('')

  useEffect(() => {
    getOrCreateIngredientBoard({ groupId, eventId })
      .then(setBoard)
      .catch(() => {})
  }, [groupId, eventId])

  function handleSyncFromMenu() {
    if (!board || !eventId) return
    setError(null)
    startTransition(async () => {
      try {
        const result = await syncMenuToIngredientBoard({ boardId: board.id, eventId: eventId! })
        if (!result.success) {
          setError(result.error || 'Failed to sync from menu')
          return
        }
        const updated = await getOrCreateIngredientBoard({ groupId, eventId })
        setBoard(updated)
      } catch (err: any) {
        setError(err.message || 'Failed to sync from menu')
      }
    })
  }

  function handleAdd() {
    if (!newName.trim() || !board) return
    setError(null)
    startTransition(async () => {
      try {
        const result = await addIngredientItem({
          boardId: board.id,
          ingredientName: newName.trim(),
          category: newCategory,
          quantityNotes: newQuantity.trim() || undefined,
          offeredByName: newOfferedBy.trim() || undefined,
        })
        if (!result.success) {
          setError(result.error || 'Failed to add')
          return
        }
        const updated = await getOrCreateIngredientBoard({ groupId, eventId })
        setBoard(updated)
        setNewName('')
        setNewQuantity('')
        setNewOfferedBy('')
        setShowAdd(false)
      } catch (err: any) {
        setError(err.message || 'Failed to add ingredient')
      }
    })
  }

  function handleStatusChange(item: IngredientBoardItem, status: IngredientStatus) {
    setError(null)
    startTransition(async () => {
      try {
        await updateIngredientItem({ itemId: item.id, status })
        setBoard((prev) =>
          prev
            ? {
                ...prev,
                items: prev.items.map((i) => (i.id === item.id ? { ...i, status } : i)),
              }
            : prev
        )
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  function handleRemove(itemId: string) {
    setError(null)
    startTransition(async () => {
      try {
        await removeIngredientItem({ itemId })
        setBoard((prev) =>
          prev ? { ...prev, items: prev.items.filter((i) => i.id !== itemId) } : prev
        )
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  function handleChefNote(item: IngredientBoardItem, note: string) {
    startTransition(async () => {
      await updateIngredientItem({ itemId: item.id, chefNotes: note })
      setBoard((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((i) => (i.id === item.id ? { ...i, chef_notes: note } : i)),
            }
          : prev
      )
    })
  }

  if (!board) return null

  // Group items by category
  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    items: board.items.filter((i) => (i.category || 'other') === cat.id),
  })).filter((g) => g.items.length > 0)

  const totalItems = board.items.length
  const availableCount = board.items.filter((i) => i.status === 'available').length
  const needsSourcing = board.items.filter(
    (i) => i.status === 'unavailable' || i.status === 'sourced_externally'
  ).length

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-white">Ingredient Board</h3>
        <div className="flex items-center gap-2">
          {eventId && (
            <Button
              variant="ghost"
              onClick={handleSyncFromMenu}
              disabled={isPending}
              className="text-xs"
            >
              Sync from Menu
            </Button>
          )}
          <Button
            variant="primary"
            onClick={() => setShowAdd(true)}
            disabled={isPending}
            className="text-xs"
          >
            + Add
          </Button>
        </div>
      </div>
      <p className="text-xs text-stone-400 mb-4">
        {totalItems === 0
          ? 'Track what your co-host is supplying and what you need to source.'
          : `${availableCount} available, ${needsSourcing} need sourcing`}
      </p>

      {error && (
        <div className="mb-3 rounded-lg bg-red-900/50 border border-red-700 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="mb-4 rounded-lg border border-stone-600 bg-stone-800/50 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-stone-400 mb-1">Ingredient *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Heirloom tomatoes"
                className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-400 mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as IngredientCategory)}
                title="Ingredient category"
                className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-stone-400 mb-1">Quantity</label>
              <input
                type="text"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                placeholder="5 lbs, 2 bunches..."
                className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-400 mb-1">Supplied by</label>
              <input
                type="text"
                value={newOfferedBy}
                onChange={(e) => setNewOfferedBy(e.target.value)}
                placeholder="Farm name or co-host"
                className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAdd} disabled={isPending || !newName.trim()}>
              {isPending ? 'Adding...' : 'Add'}
            </Button>
          </div>
        </div>
      )}

      {/* Ingredient list grouped by category */}
      {grouped.length === 0 && !showAdd && (
        <p className="text-sm text-stone-500">
          No ingredients yet. Add items your co-host is growing or that you need to source.
        </p>
      )}

      <div className="space-y-4">
        {grouped.map((group) => (
          <div key={group.id}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-sm">{group.emoji}</span>
              <span className="text-xs font-medium text-stone-300 uppercase tracking-wide">
                {group.label}
              </span>
              <span className="text-xs text-stone-500">({group.items.length})</span>
            </div>
            <div className="space-y-1.5">
              {group.items.map((item) => (
                <IngredientRow
                  key={item.id}
                  item={item}
                  isPending={isPending}
                  isCoHost={isCoHost}
                  onStatusChange={handleStatusChange}
                  onRemove={handleRemove}
                  onChefNote={handleChefNote}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function IngredientRow({
  item,
  isPending,
  isCoHost,
  onStatusChange,
  onRemove,
  onChefNote,
}: {
  item: IngredientBoardItem
  isPending: boolean
  isCoHost?: boolean
  onStatusChange: (item: IngredientBoardItem, status: IngredientStatus) => void
  onRemove: (id: string) => void
  onChefNote: (item: IngredientBoardItem, note: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [noteText, setNoteText] = useState(item.chef_notes || '')
  const statusConfig = STATUS_CONFIG[item.status]

  return (
    <div className="rounded-lg border border-stone-700/50 bg-stone-800/20 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${statusConfig.bg} ${statusConfig.color}`}
          >
            {statusConfig.label}
          </span>
          <span className="text-sm font-medium text-white truncate">{item.ingredient_name}</span>
          {item.quantity_notes && (
            <span className="text-xs text-stone-400">({item.quantity_notes})</span>
          )}
          {item.offered_by_name && (
            <span className="text-xs text-stone-500">from {item.offered_by_name}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* Status cycle button */}
          <select
            value={item.status}
            onChange={(e) => onStatusChange(item, e.target.value as IngredientStatus)}
            disabled={isPending}
            title="Ingredient status"
            className="text-xs bg-stone-800 border border-stone-700 rounded px-1.5 py-0.5 text-stone-300"
          >
            <option value="available">Available</option>
            <option value="limited">Limited</option>
            <option value="unavailable">Unavailable</option>
            <option value="sourced_externally">Sourcing</option>
          </select>
          {!isCoHost && (
            <button
              onClick={() => setEditing(!editing)}
              disabled={isPending}
              className="text-xs text-stone-400 hover:text-white px-1"
              title="Add chef note"
            >
              ✏️
            </button>
          )}
          <button
            onClick={() => onRemove(item.id)}
            disabled={isPending}
            className="text-xs text-red-400/60 hover:text-red-300 px-1"
            title="Remove"
          >
            ✕
          </button>
        </div>
      </div>
      {/* Chef notes */}
      {item.chef_notes && !editing && (
        <p className="mt-1 text-xs text-stone-400 italic pl-1">Chef: {item.chef_notes}</p>
      )}
      {editing && (
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Need minimum 3 lbs..."
            className="flex-1 rounded border border-stone-600 bg-stone-900 px-2 py-1 text-xs text-white placeholder:text-stone-600"
          />
          <Button
            variant="ghost"
            onClick={() => {
              onChefNote(item, noteText)
              setEditing(false)
            }}
            className="text-xs"
          >
            Save
          </Button>
        </div>
      )}
    </div>
  )
}

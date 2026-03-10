'use client'

// Equipment Checklist Per Event
// Two sections: Pack (pre-event) and Return (post-event).
// Items grouped by category with progress bars.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  addEquipmentToChecklist,
  removeEquipmentFromChecklist,
  toggleEquipmentPacked,
  toggleEquipmentReturned,
  generateDefaultChecklist,
  type EquipmentCategory,
  type EquipmentSource,
  type EquipmentChecklistItem,
} from '@/lib/events/event-equipment-actions'

const CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  cooking: 'Cooking',
  serving: 'Serving',
  transport: 'Transport',
  setup: 'Setup',
  cleaning: 'Cleaning',
  other: 'Other',
}

const SOURCE_COLORS: Record<EquipmentSource, string> = {
  owned: 'bg-stone-700 text-stone-300',
  rental: 'bg-amber-900/50 text-amber-400',
  venue_provided: 'bg-blue-900/50 text-blue-400',
}

const SOURCE_LABELS: Record<EquipmentSource, string> = {
  owned: 'Owned',
  rental: 'Rental',
  venue_provided: 'Venue',
}

type Props = {
  eventId: string
  initialChecklist: Record<EquipmentCategory, EquipmentChecklistItem[]>
  showReturn?: boolean
}

export function EventEquipmentChecklist({ eventId, initialChecklist, showReturn = false }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showAddForm, setShowAddForm] = useState(false)
  const [activeView, setActiveView] = useState<'pack' | 'return'>(showReturn ? 'return' : 'pack')

  // Add form state
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<EquipmentCategory>('cooking')
  const [newQuantity, setNewQuantity] = useState('1')
  const [newSource, setNewSource] = useState<EquipmentSource>('owned')
  const [newNotes, setNewNotes] = useState('')

  // Flatten for progress calc
  const allItems = Object.values(initialChecklist).flat()
  const totalItems = allItems.length
  const packedCount = allItems.filter((i) => i.packed).length
  const returnedCount = allItems.filter((i) => i.returned).length

  function handleTogglePacked(itemId: string) {
    startTransition(async () => {
      try {
        await toggleEquipmentPacked(eventId, itemId)
        router.refresh()
      } catch (err) {
        console.error('Failed to toggle packed:', err)
      }
    })
  }

  function handleToggleReturned(itemId: string) {
    startTransition(async () => {
      try {
        await toggleEquipmentReturned(eventId, itemId)
        router.refresh()
      } catch (err) {
        console.error('Failed to toggle returned:', err)
      }
    })
  }

  function handleRemove(itemId: string) {
    if (!confirm('Remove this item from the checklist?')) return
    startTransition(async () => {
      try {
        await removeEquipmentFromChecklist(eventId, itemId)
        router.refresh()
      } catch (err) {
        console.error('Failed to remove item:', err)
      }
    })
  }

  function handleAdd() {
    if (!newName.trim()) return
    startTransition(async () => {
      try {
        await addEquipmentToChecklist(eventId, {
          equipment_name: newName.trim(),
          category: newCategory,
          quantity: parseInt(newQuantity) || 1,
          source: newSource,
          notes: newNotes.trim() || undefined,
        })
        setNewName('')
        setNewQuantity('1')
        setNewNotes('')
        setShowAddForm(false)
        router.refresh()
      } catch (err) {
        console.error('Failed to add item:', err)
      }
    })
  }

  function handleGenerate() {
    startTransition(async () => {
      try {
        const result = await generateDefaultChecklist(eventId)
        if (result.added === 0) {
          alert('All default items already exist in the checklist.')
        }
        router.refresh()
      } catch (err) {
        console.error('Failed to generate checklist:', err)
      }
    })
  }

  const categories = Object.entries(initialChecklist).filter(([, items]) => items.length > 0) as [
    EquipmentCategory,
    EquipmentChecklistItem[],
  ][]

  return (
    <div className="space-y-4">
      {/* View Toggle + Progress */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveView('pack')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeView === 'pack'
                ? 'bg-stone-700 text-stone-100'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Pack ({packedCount}/{totalItems})
          </button>
          <button
            onClick={() => setActiveView('return')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeView === 'return'
                ? 'bg-stone-700 text-stone-100'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Return ({returnedCount}/{totalItems})
          </button>
        </div>

        <div className="flex gap-2">
          {totalItems === 0 && (
            <Button size="sm" variant="secondary" onClick={handleGenerate} disabled={isPending}>
              Generate Default
            </Button>
          )}
          <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Cancel' : 'Add Item'}
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {totalItems > 0 && (
        <div className="space-y-1">
          <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                activeView === 'pack' ? 'bg-emerald-600' : 'bg-blue-600'
              }`}
              style={{
                width: `${
                  totalItems > 0
                    ? ((activeView === 'pack' ? packedCount : returnedCount) / totalItems) * 100
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="text-xs text-stone-500">
            {activeView === 'pack'
              ? `${packedCount} of ${totalItems} items packed`
              : `${returnedCount} of ${totalItems} items returned`}
          </p>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-stone-400 mb-1">Item Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Chafing Dishes"
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-md text-sm text-stone-100 placeholder:text-stone-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as EquipmentCategory)}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-md text-sm text-stone-100"
              >
                {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">Quantity</label>
              <input
                type="number"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                min={1}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-md text-sm text-stone-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">Source</label>
              <select
                value={newSource}
                onChange={(e) => setNewSource(e.target.value as EquipmentSource)}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-md text-sm text-stone-100"
              >
                {Object.entries(SOURCE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">Notes</label>
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-md text-sm text-stone-100 placeholder:text-stone-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} disabled={isPending || !newName.trim()}>
              Add
            </Button>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {totalItems === 0 && !showAddForm && (
        <div className="text-center py-8 text-stone-500">
          <p className="text-sm">No equipment items yet.</p>
          <p className="text-xs mt-1">
            Click "Generate Default" for a smart starter list, or add items manually.
          </p>
        </div>
      )}

      {/* Items grouped by category */}
      {categories.map(([category, items]) => (
        <div key={category}>
          <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
            {CATEGORY_LABELS[category]} ({items.length})
          </h4>
          <div className="space-y-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-3 py-2 rounded-md bg-stone-800/50 hover:bg-stone-800 group"
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={activeView === 'pack' ? item.packed : item.returned}
                  onChange={() =>
                    activeView === 'pack'
                      ? handleTogglePacked(item.id)
                      : handleToggleReturned(item.id)
                  }
                  disabled={isPending}
                  className="h-4 w-4 rounded border-stone-600 bg-stone-700 text-emerald-600 focus:ring-emerald-500"
                />

                {/* Name + quantity */}
                <div className="flex-1 min-w-0">
                  <span
                    className={`text-sm ${
                      (activeView === 'pack' ? item.packed : item.returned)
                        ? 'text-stone-500 line-through'
                        : 'text-stone-200'
                    }`}
                  >
                    {item.equipment_name}
                  </span>
                  {item.quantity > 1 && (
                    <span className="ml-1 text-xs text-stone-500">x{item.quantity}</span>
                  )}
                  {item.notes && (
                    <span className="ml-2 text-xs text-stone-500 italic">{item.notes}</span>
                  )}
                </div>

                {/* Source badge */}
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    SOURCE_COLORS[item.source as EquipmentSource]
                  }`}
                >
                  {SOURCE_LABELS[item.source as EquipmentSource]}
                </span>

                {/* Remove button */}
                <button
                  onClick={() => handleRemove(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-stone-500 hover:text-red-400 transition-opacity"
                  title="Remove"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

      {/* Generate Default button when items exist but user might want more */}
      {totalItems > 0 && (
        <div className="pt-2">
          <Button size="sm" variant="ghost" onClick={handleGenerate} disabled={isPending}>
            + Add Default Items
          </Button>
        </div>
      )}
    </div>
  )
}

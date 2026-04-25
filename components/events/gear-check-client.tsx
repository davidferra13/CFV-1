'use client'

// Chef Gear Check - personal readiness checklist
// localStorage primary state, server sync in background.
// Mirrors packing-list-client.tsx architecture.

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { togglePackingConfirmation } from '@/lib/packing/actions'
import { markGearChecked, resetGearCheck, addGearDefault } from '@/lib/gear/actions'
import { GEAR_CATEGORY_ORDER, GEAR_CATEGORY_LABELS } from '@/lib/gear/defaults'
import type { GearDefault } from '@/lib/gear/actions'
import type { GearCategory } from '@/lib/gear/defaults'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function gearItemKey(itemName: string): string {
  return `gear:${slugify(itemName)}`
}

type CheckedState = Record<string, boolean>

type GearCheckClientProps = {
  eventId: string
  chefId: string
  gearDefaults: GearDefault[]
  confirmedKeys: string[]
  gearChecked: boolean
}

// ─── Item Row ────────────────────────────────────────────────────────────────

function ItemRow({
  itemKey,
  label,
  notes,
  checked,
  onToggle,
}: {
  itemKey: string
  label: string
  notes?: string | null
  checked: boolean
  onToggle: (key: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(itemKey)}
      className={`w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
        checked
          ? 'bg-green-950 border border-green-200'
          : 'bg-stone-900 border border-stone-700 hover:bg-stone-800'
      }`}
    >
      <div
        className={`flex-shrink-0 w-7 h-7 rounded border-2 flex items-center justify-center mt-0.5 ${
          checked ? 'bg-green-500 border-green-500' : 'border-stone-400 bg-stone-900'
        }`}
      >
        {checked && (
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span
          className={`text-sm font-medium ${checked ? 'line-through text-stone-300' : 'text-stone-100'}`}
        >
          {label}
        </span>
        {notes && <span className="block text-xs text-stone-300 mt-0.5">{notes}</span>}
      </div>
    </button>
  )
}

// ─── Add Item Inline ─────────────────────────────────────────────────────────

function AddItemInline({
  category,
  chefId,
  onAdded,
}: {
  category: GearCategory
  chefId: string
  onAdded: (item: GearDefault) => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAdd = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    const result = await addGearDefault(chefId, { item_name: trimmed, category })
    if (result.success) {
      // Optimistic: create a local GearDefault so it appears immediately
      onAdded({
        id: crypto.randomUUID(),
        chef_id: chefId,
        item_name: trimmed,
        category,
        sort_order: 999,
        is_active: true,
        notes: null,
        created_at: new Date().toISOString(),
      })
      setName('')
      setOpen(false)
    }
    setSaving(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-brand-500 hover:text-brand-400 mt-1"
      >
        + Add item
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        placeholder="Item name..."
        className="flex-1 bg-stone-800 border border-stone-600 rounded px-2 py-1.5 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-brand-500"
        autoFocus
      />
      <Button
        onClick={handleAdd}
        disabled={saving || !name.trim()}
        variant="primary"
        className="text-xs px-3 py-1.5"
      >
        {saving ? '...' : 'Add'}
      </Button>
      <button
        type="button"
        onClick={() => {
          setOpen(false)
          setName('')
        }}
        className="text-xs text-stone-500 hover:text-stone-300"
      >
        Cancel
      </button>
    </div>
  )
}

// ─── Category Section ────────────────────────────────────────────────────────

function GearSection({
  category,
  items,
  checkedState,
  onToggle,
  chefId,
  onItemAdded,
}: {
  category: GearCategory
  items: GearDefault[]
  checkedState: CheckedState
  onToggle: (key: string) => void
  chefId: string
  onItemAdded: (item: GearDefault) => void
}) {
  if (items.length === 0) return null

  const checkedCount = items.filter((item) => checkedState[gearItemKey(item.item_name)]).length

  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-stone-100 text-sm uppercase tracking-wide">
          {GEAR_CATEGORY_LABELS[category]}
        </h3>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            checkedCount === items.length
              ? 'bg-green-900 text-green-700'
              : 'bg-stone-800 text-stone-300'
          }`}
        >
          {checkedCount} / {items.length}
        </span>
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <ItemRow
            key={item.id}
            itemKey={gearItemKey(item.item_name)}
            label={item.item_name}
            notes={item.notes}
            checked={checkedState[gearItemKey(item.item_name)] ?? false}
            onToggle={onToggle}
          />
        ))}
      </div>
      <AddItemInline category={category} chefId={chefId} onAdded={onItemAdded} />
    </Card>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function GearCheckClient({
  eventId,
  chefId,
  gearDefaults: initialDefaults,
  confirmedKeys,
  gearChecked: initialGearChecked,
}: GearCheckClientProps) {
  const storageKey = `gear-${eventId}`

  const [gearItems, setGearItems] = useState<GearDefault[]>(initialDefaults)
  const [checked, setChecked] = useState<CheckedState>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(initialGearChecked)
  const [error, setError] = useState<string | null>(null)

  // Active items only
  const activeItems = gearItems.filter((item) => item.is_active)

  // Load from localStorage on mount, merge with server confirmations
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        setChecked(JSON.parse(saved))
      } else if (confirmedKeys.length > 0) {
        // Seed from server confirmations
        const initial: CheckedState = {}
        for (const key of confirmedKeys) {
          initial[key] = true
        }
        setChecked(initial)
        localStorage.setItem(storageKey, JSON.stringify(initial))
      }
    } catch {
      // localStorage unavailable
    }
  }, [storageKey, confirmedKeys])

  const toggle = useCallback(
    (itemKey: string) => {
      setChecked((prev) => {
        const newValue = !prev[itemKey]
        const next = { ...prev, [itemKey]: newValue }
        try {
          localStorage.setItem(storageKey, JSON.stringify(next))
        } catch {
          // ignore
        }
        // Sync to DB in background
        togglePackingConfirmation(eventId, itemKey, newValue).catch(() => {})
        return next
      })
    },
    [storageKey, eventId]
  )

  const handleMarkReady = async () => {
    setIsSubmitting(true)
    setError(null)
    const result = await markGearChecked(eventId)
    if (result.success) {
      setSubmitted(true)
    } else {
      setError(result.error ?? 'Failed to mark gear ready')
    }
    setIsSubmitting(false)
  }

  const handleReset = async () => {
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // ignore
    }
    setChecked({})

    if (submitted) {
      const result = await resetGearCheck(eventId)
      if (result.success) {
        setSubmitted(false)
      }
    }
  }

  const handleItemAdded = (item: GearDefault) => {
    setGearItems((prev) => [...prev, item])
  }

  // ─── Progress ────────────────────────────────────────────────────────────────

  const totalItems = activeItems.length
  const checkedCount = activeItems.filter((item) => checked[gearItemKey(item.item_name)]).length
  const allChecked = totalItems > 0 && checkedCount === totalItems

  // Group by category
  const grouped = GEAR_CATEGORY_ORDER.reduce(
    (acc, cat) => {
      acc[cat] = activeItems.filter((item) => item.category === cat)
      return acc
    },
    {} as Record<GearCategory, GearDefault[]>
  )

  return (
    <div className="space-y-4">
      {/* Overall progress bar */}
      <div className="bg-stone-900 border border-stone-700 rounded-lg px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-stone-300">
            {checkedCount} of {totalItems} items confirmed
          </span>
          {allChecked && !submitted && (
            <span className="text-xs text-emerald-600 font-medium">All items checked!</span>
          )}
        </div>
        <div className="w-full bg-stone-800 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: totalItems > 0 ? `${(checkedCount / totalItems) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Category sections */}
      {GEAR_CATEGORY_ORDER.map((cat) => (
        <GearSection
          key={cat}
          category={cat}
          items={grouped[cat]}
          checkedState={checked}
          onToggle={toggle}
          chefId={chefId}
          onItemAdded={handleItemAdded}
        />
      ))}

      {/* Mark Gear Ready / Reset */}
      <div className="space-y-2 pt-2">
        {error && <p className="text-sm text-red-600 text-center">{error}</p>}

        {!submitted ? (
          <Button
            onClick={handleMarkReady}
            disabled={!allChecked || isSubmitting}
            className="w-full"
            variant="primary"
          >
            {isSubmitting
              ? 'Saving...'
              : allChecked
                ? 'Mark Gear Ready'
                : `${totalItems - checkedCount} items remaining`}
          </Button>
        ) : (
          <div className="text-center py-2">
            <p className="text-green-700 font-semibold text-lg">Gear ready. You look sharp!</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleReset}
          className="w-full text-xs text-stone-300 hover:text-stone-300 py-2"
        >
          Reset checklist
        </button>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  getLeftovers,
  addLeftover,
  updateLeftover,
  removeLeftover,
  markLeftoverLabeled,
} from '@/lib/events/leftover-actions'
import type { EventLeftover, LeftoverInput } from '@/lib/events/departure-types'

const PACKAGING_OPTIONS = [
  { value: 'container', label: 'Container' },
  { value: 'wrapped', label: 'Wrapped' },
  { value: 'bag', label: 'Bag' },
  { value: 'box', label: 'Box' },
  { value: 'other', label: 'Other' },
] as const

type Props = {
  eventId: string
}

export function LeftoverTracking({ eventId }: Props) {
  const [items, setItems] = useState<EventLeftover[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Form state
  const [form, setForm] = useState<LeftoverInput>({
    item_description: '',
    quantity: '',
    packaging_type: undefined,
    labeled: false,
    label_text: '',
    given_to: '',
    storage_instructions: '',
  })

  useEffect(() => {
    getLeftovers(eventId)
      .then((result) => {
        if (result.success) setItems(result.data)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [eventId])

  function resetForm() {
    setForm({
      item_description: '',
      quantity: '',
      packaging_type: undefined,
      labeled: false,
      label_text: '',
      given_to: '',
      storage_instructions: '',
    })
  }

  function handleAdd() {
    if (!form.item_description.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        const result = await addLeftover(eventId, form)
        if (!result.success) {
          setError(result.error || 'Failed to add leftover')
          return
        }
        const updated = await getLeftovers(eventId)
        if (updated.success) setItems(updated.data)
        resetForm()
        setShowForm(false)
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  function handleRemove(id: string) {
    const previous = items
    setItems((prev) => prev.filter((i) => i.id !== id))
    startTransition(async () => {
      try {
        const result = await removeLeftover(id, eventId)
        if (!result.success) {
          setItems(previous)
          setError(result.error || 'Failed to remove')
        }
      } catch (err: any) {
        setItems(previous)
        setError(err.message)
      }
    })
  }

  function handleToggleLabeled(item: EventLeftover) {
    if (item.labeled) {
      // Unlabel
      startTransition(async () => {
        try {
          await updateLeftover(item.id, eventId, { labeled: false, label_text: '' })
          const updated = await getLeftovers(eventId)
          if (updated.success) setItems(updated.data)
        } catch (err: any) {
          setError(err.message)
        }
      })
    } else {
      // Label with item description as default text
      const text = item.item_description
      startTransition(async () => {
        try {
          await markLeftoverLabeled(item.id, eventId, text)
          const updated = await getLeftovers(eventId)
          if (updated.success) setItems(updated.data)
        } catch (err: any) {
          setError(err.message)
        }
      })
    }
  }

  if (!loaded) return null

  const labeledCount = items.filter((i) => i.labeled).length

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-white">Leftover Tracking</h3>
        <Button
          variant="ghost"
          onClick={() => setShowForm(true)}
          disabled={isPending}
          className="text-xs"
        >
          + Add Leftover
        </Button>
      </div>

      {items.length > 0 && (
        <div className="text-xs text-stone-400 mb-3">
          {items.length} item{items.length !== 1 ? 's' : ''} tracked, {labeledCount} labeled
        </div>
      )}

      {error && (
        <div className="mb-3 rounded-lg bg-red-900/50 border border-red-700 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-4 space-y-3 rounded-lg border border-stone-700 bg-stone-800/50 p-3">
          <input
            type="text"
            value={form.item_description}
            onChange={(e) => setForm({ ...form, item_description: e.target.value })}
            placeholder="What food is left over?"
            className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={form.quantity || ''}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              placeholder="Quantity (e.g. 2 containers)"
              className="rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
            />
            <select
              value={form.packaging_type || ''}
              onChange={(e) =>
                setForm({ ...form, packaging_type: (e.target.value || undefined) as any })
              }
              className="rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white"
            >
              <option value="">Packaging type...</option>
              {PACKAGING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            value={form.given_to || ''}
            onChange={(e) => setForm({ ...form, given_to: e.target.value })}
            placeholder="Given to (who took the leftovers?)"
            className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
          />
          <input
            type="text"
            value={form.storage_instructions || ''}
            onChange={(e) => setForm({ ...form, storage_instructions: e.target.value })}
            placeholder="Storage instructions (e.g. refrigerate within 2 hours)"
            className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
          />
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.labeled || false}
                onChange={(e) => setForm({ ...form, labeled: e.target.checked })}
                className="rounded border-stone-600"
              />
              Labeled
            </label>
            {form.labeled && (
              <input
                type="text"
                value={form.label_text || ''}
                onChange={(e) => setForm({ ...form, label_text: e.target.value })}
                placeholder="Label text..."
                className="flex-1 rounded-lg border border-stone-600 bg-stone-900 px-3 py-1.5 text-sm text-white placeholder:text-stone-600"
              />
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={handleAdd}
              disabled={isPending || !form.item_description.trim()}
            >
              Save Leftover
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowForm(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {items.length === 0 && !showForm && (
        <p className="text-sm text-stone-500">
          Track leftover food, packaging, and who takes it home.
        </p>
      )}

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-stone-700 bg-stone-800/30 p-3 group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-stone-200 truncate">
                      {item.item_description}
                    </span>
                    {item.labeled && (
                      <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-300 border border-emerald-700/50">
                        labeled
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-stone-400">
                    {item.quantity && <span>{item.quantity}</span>}
                    {item.packaging_type && <span>{item.packaging_type}</span>}
                    {item.given_to && <span>Given to: {item.given_to}</span>}
                  </div>
                  {item.storage_instructions && (
                    <p className="mt-1 text-xs text-stone-500 italic">
                      {item.storage_instructions}
                    </p>
                  )}
                  {item.label_text && item.labeled && (
                    <p className="mt-0.5 text-xs text-emerald-400/70">Label: {item.label_text}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => handleToggleLabeled(item)}
                    disabled={isPending}
                    className="text-xs px-2 py-1 rounded hover:bg-stone-700 text-stone-400 hover:text-stone-200 transition-colors"
                    title={item.labeled ? 'Remove label' : 'Mark as labeled'}
                  >
                    {item.labeled ? 'Unlabel' : 'Label'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    disabled={isPending}
                    className="text-xs text-red-400/0 group-hover:text-red-400/60 hover:!text-red-300 px-1 transition-colors"
                  >
                    &#10005;
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

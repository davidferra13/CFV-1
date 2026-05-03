'use client'

import { useState, useEffect, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  getDayOfChecklist,
  initializeFarmDinnerChecklist,
  toggleChecklistItem,
  addChecklistItem,
  removeChecklistItem,
  type ChecklistItem,
} from '@/lib/events/day-of-checklist-actions'

const CATEGORY_CONFIG: Record<string, { label: string; emoji: string }> = {
  gear: { label: 'Gear', emoji: '🧰' },
  transport: { label: 'Transport', emoji: '🚗' },
  outfit: { label: 'Outfit', emoji: '👔' },
  mise: { label: 'Mise en Place', emoji: '🥄' },
  docs: { label: 'Documents', emoji: '📄' },
  other: { label: 'Other', emoji: '📋' },
}

type Props = {
  eventId: string
}

export function DayOfChecklistPanel({ eventId }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getDayOfChecklist(eventId)
      .then((data) => {
        setItems(data)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [eventId])

  function handleInit() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await initializeFarmDinnerChecklist(eventId)
        if (!result.success) {
          setError(result.error || 'Failed to initialize')
          return
        }
        const updated = await getDayOfChecklist(eventId)
        setItems(updated)
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  function handleToggle(item: ChecklistItem) {
    startTransition(async () => {
      await toggleChecklistItem({ itemId: item.id, eventId, checked: !item.checked })
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)))
    })
  }

  function handleAdd() {
    if (!newLabel.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        await addChecklistItem({ eventId, label: newLabel.trim() })
        const updated = await getDayOfChecklist(eventId)
        setItems(updated)
        setNewLabel('')
        setShowAdd(false)
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  function handleRemove(itemId: string) {
    startTransition(async () => {
      await removeChecklistItem({ itemId, eventId })
      setItems((prev) => prev.filter((i) => i.id !== itemId))
    })
  }

  if (!loaded) return null

  const checkedCount = items.filter((i) => i.checked).length
  const totalCount = items.length

  // Group by category
  const grouped = Object.entries(CATEGORY_CONFIG)
    .map(([key, config]) => ({
      key,
      ...config,
      items: items.filter((i) => i.category === key),
    }))
    .filter((g) => g.items.length > 0)

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-white">Day-of Checklist</h3>
        <div className="flex items-center gap-2">
          {totalCount === 0 && (
            <Button variant="primary" onClick={handleInit} disabled={isPending} className="text-xs">
              Farm Dinner Template
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => setShowAdd(true)}
            disabled={isPending}
            className="text-xs"
          >
            + Add
          </Button>
        </div>
      </div>

      {totalCount > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 h-2 bg-stone-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs text-stone-400">
            {checkedCount}/{totalCount}
          </span>
        </div>
      )}

      {error && (
        <div className="mb-3 rounded-lg bg-red-900/50 border border-red-700 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      {showAdd && (
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Add item..."
            className="flex-1 rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Button variant="primary" onClick={handleAdd} disabled={isPending || !newLabel.trim()}>
            Add
          </Button>
          <Button variant="ghost" onClick={() => setShowAdd(false)}>
            Cancel
          </Button>
        </div>
      )}

      {totalCount === 0 && !showAdd && (
        <p className="text-sm text-stone-500">
          Night-before and day-of packing list for off-site events.
        </p>
      )}

      <div className="space-y-4">
        {grouped.map((group) => (
          <div key={group.key}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-sm">{group.emoji}</span>
              <span className="text-xs font-medium text-stone-300 uppercase tracking-wide">
                {group.label}
              </span>
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded px-2 py-1 hover:bg-stone-800/30 group"
                >
                  <button
                    type="button"
                    onClick={() => handleToggle(item)}
                    disabled={isPending}
                    className={`h-4 w-4 rounded border shrink-0 flex items-center justify-center transition-colors ${
                      item.checked
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-stone-500 hover:border-stone-400'
                    }`}
                  >
                    {item.checked && <span className="text-[10px] text-white font-bold">✓</span>}
                  </button>
                  <span
                    className={`text-sm flex-1 ${
                      item.checked ? 'line-through text-stone-500' : 'text-stone-200'
                    }`}
                  >
                    {item.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    disabled={isPending}
                    className="text-xs text-red-400/0 group-hover:text-red-400/60 hover:!text-red-300 px-1 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {checkedCount === totalCount && totalCount > 0 && (
        <div className="mt-4 text-center text-sm text-emerald-400 font-medium">
          All packed. Go get 'em, chef.
        </div>
      )}
    </Card>
  )
}

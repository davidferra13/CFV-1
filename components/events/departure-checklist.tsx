'use client'

import { useState, useEffect, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  getDepartureChecklist,
  seedDepartureDefaults,
  toggleDepartureItem,
  addDepartureChecklistItem,
} from '@/lib/events/departure-actions'
import type { DepartureChecklistItem } from '@/lib/events/departure-types'

type Props = {
  eventId: string
}

export function DepartureChecklist({ eventId }: Props) {
  const [items, setItems] = useState<DepartureChecklistItem[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getDepartureChecklist(eventId)
      .then((result) => {
        if (result.success) setItems(result.data)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [eventId])

  function handleSeedDefaults() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await seedDepartureDefaults(eventId)
        if (!result.success) {
          setError(result.error || 'Failed to seed defaults')
          return
        }
        const updated = await getDepartureChecklist(eventId)
        if (updated.success) setItems(updated.data)
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  function handleToggle(item: DepartureChecklistItem) {
    // Optimistic update
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)))
    startTransition(async () => {
      try {
        const result = await toggleDepartureItem(item.id, eventId)
        if (!result.success) {
          // Rollback
          setItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, checked: item.checked } : i))
          )
          setError(result.error || 'Failed to toggle')
        }
      } catch (err: any) {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, checked: item.checked } : i))
        )
        setError(err.message)
      }
    })
  }

  function handleAdd() {
    if (!newLabel.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        const result = await addDepartureChecklistItem(eventId, newLabel.trim(), 'departure')
        if (!result.success) {
          setError(result.error || 'Failed to add')
          return
        }
        const updated = await getDepartureChecklist(eventId)
        if (updated.success) setItems(updated.data)
        setNewLabel('')
        setShowAdd(false)
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  if (!loaded) return null

  const checkedCount = items.filter((i) => i.checked).length
  const totalCount = items.length
  const allComplete = checkedCount === totalCount && totalCount > 0

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {allComplete && <span className="text-emerald-400 text-lg">&#10003;</span>}
          <h3 className="font-semibold text-white">Departure Checklist</h3>
        </div>
        <div className="flex items-center gap-2">
          {totalCount === 0 && (
            <Button
              variant="primary"
              onClick={handleSeedDefaults}
              disabled={isPending}
              className="text-xs"
            >
              Seed Defaults
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
              className={`h-full rounded-full transition-all ${allComplete ? 'bg-emerald-500' : 'bg-amber-500'}`}
              style={{ width: `${(checkedCount / totalCount) * 100}%` }}
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
            placeholder="Add departure item..."
            className="flex-1 rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Button variant="primary" onClick={handleAdd} disabled={isPending || !newLabel.trim()}>
            Add
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setShowAdd(false)
              setNewLabel('')
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      {totalCount === 0 && !showAdd && (
        <p className="text-sm text-stone-500">
          Post-service departure tasks. Seed defaults to get started.
        </p>
      )}

      <div className="space-y-0.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-stone-800/30 group"
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
              {item.checked && <span className="text-[10px] text-white font-bold">&#10003;</span>}
            </button>
            <span
              className={`text-sm flex-1 ${
                item.checked ? 'line-through text-stone-500' : 'text-stone-200'
              }`}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {allComplete && (
        <div className="mt-4 text-center text-sm text-emerald-400 font-medium">
          All clear. Safe to leave.
        </div>
      )}
    </Card>
  )
}

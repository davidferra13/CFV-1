'use client'

// PrepBoardClient - Interactive prep item management.
// Toggle status, assign staff, assign stations, batch operations.

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  updatePrepStatus,
  assignPrep,
  batchUpdatePrepStatus,
} from '@/lib/restaurant/prep-generation-actions'
import { generatePrepRequirements } from '@/lib/restaurant/prep-generation-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { PrepRequirement } from '@/lib/restaurant/prep-generation-actions'

const STATUS_ORDER = { pending: 0, in_progress: 1, done: 2, verified: 3 }
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-stone-700 text-stone-300',
  in_progress: 'bg-amber-900/50 text-amber-300 border-amber-700',
  done: 'bg-emerald-900/50 text-emerald-300 border-emerald-700',
  verified: 'bg-emerald-800/50 text-emerald-200 border-emerald-600',
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-stone-500',
  medium: 'text-stone-400',
  high: 'text-amber-400',
  critical: 'text-red-400',
}

export function PrepBoardClient({
  serviceDayId,
  prepItems,
  staff,
  stations,
}: {
  serviceDayId: string
  prepItems: PrepRequirement[]
  staff: Array<{ id: string; name: string; role: string }>
  stations: Array<{ id: string; name: string }>
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const [filter, setFilter] = useState<string>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Sort: critical first, then by status, then by name
  const sorted = [...prepItems].sort((a, b) => {
    const pa = a.priority === 'critical' ? -2 : a.priority === 'high' ? -1 : 0
    const pb = b.priority === 'critical' ? -2 : b.priority === 'high' ? -1 : 0
    if (pa !== pb) return pa - pb
    const sa = STATUS_ORDER[a.prep_status] || 0
    const sb = STATUS_ORDER[b.prep_status] || 0
    if (sa !== sb) return sa - sb
    return a.ingredient_name.localeCompare(b.ingredient_name)
  })

  const filtered =
    filter === 'all'
      ? sorted
      : filter === 'deficit'
        ? sorted.filter((i) => (i.deficit_qty ?? 0) > 0)
        : sorted.filter((i) => i.prep_status === filter)

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelectedIds(new Set(filtered.map((i) => i.id)))
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  function handleStatusChange(id: string, status: PrepRequirement['prep_status']) {
    startTransition(async () => {
      try {
        const result = await updatePrepStatus(id, status)
        if (!result.success) {
          toast.error(result.error)
          return
        }
        router.refresh()
      } catch {
        toast.error('Update failed')
      }
    })
  }

  function handleBatchStatus(status: PrepRequirement['prep_status']) {
    if (selectedIds.size === 0) return
    startTransition(async () => {
      try {
        const result = await batchUpdatePrepStatus([...selectedIds], status)
        if (!result.success) {
          toast.error(result.error)
          return
        }
        toast.success(`${selectedIds.size} items updated`)
        setSelectedIds(new Set())
        router.refresh()
      } catch {
        toast.error('Batch update failed')
      }
    })
  }

  function handleAssign(id: string, staffId: string | null, stationId?: string | null) {
    startTransition(async () => {
      try {
        const result = await assignPrep(id, staffId, stationId)
        if (!result.success) {
          toast.error(result.error)
          return
        }
        router.refresh()
      } catch {
        toast.error('Assignment failed')
      }
    })
  }

  function handleRegenerate() {
    startTransition(async () => {
      try {
        const result = await generatePrepRequirements(serviceDayId)
        if (!result.success) {
          toast.error(result.error)
          return
        }
        toast.success(`Regenerated ${result.generated} prep items`)
        router.refresh()
      } catch {
        toast.error('Regeneration failed')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {['all', 'pending', 'in_progress', 'done', 'deficit'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                filter === f ? 'bg-stone-700 text-stone-100' : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              {f === 'all'
                ? 'All'
                : f === 'in_progress'
                  ? 'In Progress'
                  : f === 'deficit'
                    ? 'Deficits'
                    : f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && (
                <span className="ml-1.5 text-stone-600">
                  {f === 'deficit'
                    ? prepItems.filter((i) => (i.deficit_qty ?? 0) > 0).length
                    : prepItems.filter((i) => i.prep_status === f).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <span className="text-xs text-stone-500">{selectedIds.size} selected</span>
              <Button
                variant="ghost"
                onClick={() => handleBatchStatus('in_progress')}
                disabled={isPending}
              >
                Start
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleBatchStatus('done')}
                disabled={isPending}
              >
                Done
              </Button>
              <Button variant="ghost" onClick={clearSelection}>
                Clear
              </Button>
            </>
          )}
          <Button variant="ghost" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="ghost" onClick={handleRegenerate} disabled={isPending}>
            Regenerate
          </Button>
        </div>
      </div>

      {/* Prep Items */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-stone-500">No prep items match this filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-stone-500 uppercase border-b border-stone-800">
            <div className="col-span-1"></div>
            <div className="col-span-3">Ingredient</div>
            <div className="col-span-1 text-right">Need</div>
            <div className="col-span-1 text-right">On Hand</div>
            <div className="col-span-1 text-right">Deficit</div>
            <div className="col-span-2">Assigned To</div>
            <div className="col-span-1">Station</div>
            <div className="col-span-2 text-center">Status</div>
          </div>

          {filtered.map((item) => (
            <div
              key={item.id}
              className={`grid grid-cols-12 gap-2 px-3 py-2.5 rounded-lg items-center transition-colors ${
                selectedIds.has(item.id)
                  ? 'bg-stone-800/80'
                  : 'bg-stone-900/40 hover:bg-stone-900/60'
              }`}
            >
              {/* Checkbox */}
              <div className="col-span-1">
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => toggleSelect(item.id)}
                  className="rounded border-stone-600 bg-stone-800"
                />
              </div>

              {/* Name + Priority */}
              <div className="col-span-3">
                <p className="text-sm text-stone-200">{item.ingredient_name}</p>
                <p className={`text-xs ${PRIORITY_COLORS[item.priority]}`}>{item.priority}</p>
              </div>

              {/* Required */}
              <div className="col-span-1 text-right">
                <span className="text-sm text-stone-300 tabular-nums">
                  {item.required_qty} {item.unit}
                </span>
              </div>

              {/* On Hand */}
              <div className="col-span-1 text-right">
                <span className="text-sm text-stone-400 tabular-nums">
                  {item.on_hand_qty != null ? item.on_hand_qty : '-'}
                </span>
              </div>

              {/* Deficit */}
              <div className="col-span-1 text-right">
                {(item.deficit_qty ?? 0) > 0 ? (
                  <span className="text-sm text-red-400 tabular-nums">{item.deficit_qty}</span>
                ) : (
                  <span className="text-sm text-stone-600">-</span>
                )}
              </div>

              {/* Assigned To */}
              <div className="col-span-2">
                <select
                  value={item.assigned_to || ''}
                  onChange={(e) => handleAssign(item.id, e.target.value || null)}
                  disabled={isPending}
                  className="w-full text-xs px-2 py-1 rounded bg-stone-800 border border-stone-700 text-stone-300"
                >
                  <option value="">Unassigned</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Station */}
              <div className="col-span-1">
                <select
                  value={item.station_id || ''}
                  onChange={(e) => handleAssign(item.id, item.assigned_to, e.target.value || null)}
                  disabled={isPending}
                  className="w-full text-xs px-2 py-1 rounded bg-stone-800 border border-stone-700 text-stone-300"
                >
                  <option value="">-</option>
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Toggle */}
              <div className="col-span-2 flex justify-center">
                <div className="flex gap-1">
                  {(['pending', 'in_progress', 'done', 'verified'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(item.id, st)}
                      disabled={isPending}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        item.prep_status === st
                          ? STATUS_COLORS[st]
                          : 'text-stone-600 hover:text-stone-400'
                      }`}
                    >
                      {st === 'in_progress'
                        ? 'WIP'
                        : st === 'verified'
                          ? 'OK'
                          : st.charAt(0).toUpperCase() + st.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

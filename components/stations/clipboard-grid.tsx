'use client'

// Clipboard Grid - The Excel-like daily prep tracking grid
// Core view of the Station Clipboard System. Editable cells for on_hand, made,
// need_to_make, need_to_order, waste_qty, notes. Keyboard-friendly with tab navigation.

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShelfLifeIndicator } from '@/components/stations/shelf-life-indicators'
import {
  batchUpdateClipboard,
  markAs86,
  unmark86,
  type UpdateClipboardEntryInput,
} from '@/lib/stations/clipboard-actions'

type ClipboardEntry = {
  id: string
  component_id: string
  entry_date: string
  on_hand: number
  made: number
  need_to_make: number
  need_to_order: number
  waste_qty: number
  waste_reason_code: string | null
  is_86d: boolean
  eighty_sixed_at: string | null
  location: string
  notes: string | null
  station_components?: {
    id: string
    name: string
    unit: string
    par_level: number
    par_unit: string | null
    shelf_life_days: number | null
    notes: string | null
    station_menu_items?: {
      id: string
      name: string
    }
  }
}

type Props = {
  stationId: string
  stationName: string
  date: string
  entries: ClipboardEntry[]
}

const WASTE_REASONS = [
  { value: '', label: 'None' },
  { value: 'expired', label: 'Expired' },
  { value: 'over_production', label: 'Over Production' },
  { value: 'dropped', label: 'Dropped' },
  { value: 'contamination', label: 'Contamination' },
  { value: 'quality', label: 'Quality Issue' },
  { value: 'other', label: 'Other' },
]

type LocalState = {
  on_hand: number
  made: number
  need_to_make: number
  need_to_order: number
  waste_qty: number
  waste_reason_code: string | null
  location: string
  notes: string
}

export function ClipboardGrid({ stationId, stationName, date, entries }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Local editable state keyed by entry id
  const [localState, setLocalState] = useState<Record<string, LocalState>>(() => {
    const state: Record<string, LocalState> = {}
    for (const entry of entries) {
      state[entry.id] = {
        on_hand: entry.on_hand,
        made: entry.made,
        need_to_make: entry.need_to_make,
        need_to_order: entry.need_to_order,
        waste_qty: entry.waste_qty,
        waste_reason_code: entry.waste_reason_code,
        location: entry.location ?? 'line',
        notes: entry.notes ?? '',
      }
    }
    return state
  })

  const updateField = useCallback(
    (entryId: string, field: keyof LocalState, value: number | string | null) => {
      setLocalState((prev) => ({
        ...prev,
        [entryId]: { ...prev[entryId], [field]: value },
      }))
    },
    []
  )

  async function handleSaveAll() {
    setSaving(true)
    setError(null)
    setSuccessMsg(null)

    const updates: Array<{ id: string; updates: UpdateClipboardEntryInput }> = []

    for (const entry of entries) {
      const local = localState[entry.id]
      if (!local) continue

      const changed: UpdateClipboardEntryInput = {}
      if (local.on_hand !== entry.on_hand) changed.on_hand = local.on_hand
      if (local.made !== entry.made) changed.made = local.made
      if (local.need_to_make !== entry.need_to_make) changed.need_to_make = local.need_to_make
      if (local.need_to_order !== entry.need_to_order) changed.need_to_order = local.need_to_order
      if (local.waste_qty !== entry.waste_qty) changed.waste_qty = local.waste_qty
      if (local.waste_reason_code !== entry.waste_reason_code) {
        changed.waste_reason_code = (local.waste_reason_code || null) as any
      }
      if (local.location !== (entry.location ?? 'line')) changed.location = local.location as any
      if (local.notes !== (entry.notes ?? '')) changed.notes = local.notes

      if (Object.keys(changed).length > 0) {
        updates.push({ id: entry.id, updates: changed })
      }
    }

    if (updates.length === 0) {
      setSaving(false)
      setSuccessMsg('No changes to save')
      setTimeout(() => setSuccessMsg(null), 2000)
      return
    }

    try {
      await batchUpdateClipboard(updates)
      router.refresh()
      setSuccessMsg(`Saved ${updates.length} change${updates.length !== 1 ? 's' : ''}`)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handle86Toggle(entryId: string, currentlyEightySixed: boolean) {
    try {
      if (currentlyEightySixed) {
        await unmark86(entryId)
      } else {
        await markAs86(entryId)
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle 86 status')
    }
  }

  function navigateDate(offset: number) {
    const current = new Date(date)
    current.setDate(current.getDate() + offset)
    const newDate = current.toISOString().split('T')[0]
    router.push(`/stations/${stationId}/clipboard?date=${newDate}`)
  }

  // Compute totals
  const totals = entries.reduce(
    (acc, entry) => {
      const local = localState[entry.id]
      if (!local) return acc
      return {
        on_hand: acc.on_hand + local.on_hand,
        made: acc.made + local.made,
        need_to_make: acc.need_to_make + local.need_to_make,
        need_to_order: acc.need_to_order + local.need_to_order,
        waste_qty: acc.waste_qty + local.waste_qty,
      }
    },
    { on_hand: 0, made: 0, need_to_make: 0, need_to_order: 0, waste_qty: 0 }
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle className="text-base">{stationName} Clipboard</CardTitle>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateDate(-1)}
                className="px-2 py-1 text-sm text-stone-400 hover:text-stone-200 rounded border border-stone-700 hover:border-stone-500"
              >
                Prev
              </button>
              <span className="text-sm font-medium text-stone-200">{date}</span>
              <button
                onClick={() => navigateDate(1)}
                className="px-2 py-1 text-sm text-stone-400 hover:text-stone-200 rounded border border-stone-700 hover:border-stone-500"
              >
                Next
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {successMsg && <span className="text-sm text-emerald-400">{successMsg}</span>}
            {error && <span className="text-sm text-red-400">{error}</span>}
            <Button onClick={handleSaveAll} loading={saving} size="sm">
              Save All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {entries.length === 0 ? (
          <div className="p-8 text-center text-sm text-stone-500">
            No components on this station yet. Add menu items and components on the station detail
            page.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-700 text-left text-xs text-stone-400 uppercase tracking-wider">
                  <th className="px-3 py-3 font-medium">Component</th>
                  <th className="px-3 py-3 font-medium text-center">Par</th>
                  <th className="px-3 py-3 font-medium text-center">On Hand</th>
                  <th className="px-3 py-3 font-medium text-center">Need to Make</th>
                  <th className="px-3 py-3 font-medium text-center">Made</th>
                  <th className="px-3 py-3 font-medium text-center">Need to Order</th>
                  <th className="px-3 py-3 font-medium text-center">Waste</th>
                  <th className="px-3 py-3 font-medium text-center">Shelf Life</th>
                  <th className="px-3 py-3 font-medium text-center">Location</th>
                  <th className="px-3 py-3 font-medium text-center">86'd</th>
                  <th className="px-3 py-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const comp = entry.station_components
                  const local = localState[entry.id]
                  if (!local) return null

                  const is86d = entry.is_86d
                  const shelfLifeDays = comp?.shelf_life_days ?? null

                  // Row color: red for 86'd, yellow for expiring
                  let rowClass = 'border-b border-stone-800 transition-colors'
                  if (is86d) {
                    rowClass += ' bg-red-950/30'
                  } else if (shelfLifeDays !== null && shelfLifeDays <= 2) {
                    rowClass += ' bg-amber-950/20'
                  }

                  return (
                    <tr key={entry.id} className={rowClass}>
                      {/* Component name */}
                      <td className="px-3 py-2">
                        <div className="font-medium text-stone-200">{comp?.name ?? 'Unknown'}</div>
                        {comp?.station_menu_items?.name && (
                          <div className="text-xs text-stone-500">
                            {comp.station_menu_items.name}
                          </div>
                        )}
                      </td>

                      {/* Par level */}
                      <td className="px-3 py-2 text-center text-stone-400">
                        {comp?.par_level ?? 0} {comp?.par_unit ?? comp?.unit ?? ''}
                      </td>

                      {/* On Hand */}
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={local.on_hand}
                          onChange={(e) =>
                            updateField(entry.id, 'on_hand', parseFloat(e.target.value) || 0)
                          }
                          className={`w-16 mx-auto block text-center rounded border bg-stone-900 px-2 py-1 text-sm ${
                            local.on_hand >= (comp?.par_level ?? 0)
                              ? 'border-emerald-700 text-emerald-400'
                              : local.on_hand > 0
                                ? 'border-amber-700 text-amber-400'
                                : 'border-red-700 text-red-400'
                          }`}
                        />
                      </td>

                      {/* Need to Make */}
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={local.need_to_make}
                          onChange={(e) =>
                            updateField(entry.id, 'need_to_make', parseFloat(e.target.value) || 0)
                          }
                          className="w-16 mx-auto block text-center rounded border border-stone-600 bg-stone-900 px-2 py-1 text-sm text-stone-200"
                        />
                      </td>

                      {/* Made */}
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={local.made}
                          onChange={(e) =>
                            updateField(entry.id, 'made', parseFloat(e.target.value) || 0)
                          }
                          className="w-16 mx-auto block text-center rounded border border-stone-600 bg-stone-900 px-2 py-1 text-sm text-stone-200"
                        />
                      </td>

                      {/* Need to Order */}
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={local.need_to_order}
                          onChange={(e) =>
                            updateField(entry.id, 'need_to_order', parseFloat(e.target.value) || 0)
                          }
                          className={`w-16 mx-auto block text-center rounded border bg-stone-900 px-2 py-1 text-sm ${
                            local.need_to_order > 0
                              ? 'border-sky-700 text-sky-400'
                              : 'border-stone-600 text-stone-200'
                          }`}
                        />
                      </td>

                      {/* Waste */}
                      <td className="px-3 py-2">
                        <div className="flex flex-col items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={local.waste_qty}
                            onChange={(e) =>
                              updateField(entry.id, 'waste_qty', parseFloat(e.target.value) || 0)
                            }
                            className={`w-16 text-center rounded border bg-stone-900 px-2 py-1 text-sm ${
                              local.waste_qty > 0
                                ? 'border-red-700 text-red-400'
                                : 'border-stone-600 text-stone-200'
                            }`}
                          />
                          {local.waste_qty > 0 && (
                            <select
                              value={local.waste_reason_code ?? ''}
                              onChange={(e) =>
                                updateField(entry.id, 'waste_reason_code', e.target.value || null)
                              }
                              className="w-24 text-xs rounded border border-stone-600 bg-stone-900 px-1 py-0.5 text-stone-300"
                            >
                              {WASTE_REASONS.map((r) => (
                                <option key={r.value} value={r.value}>
                                  {r.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>

                      {/* Shelf Life */}
                      <td className="px-3 py-2 text-center">
                        {shelfLifeDays !== null ? (
                          <ShelfLifeIndicator
                            madeAt={entry.entry_date}
                            shelfLifeDays={shelfLifeDays}
                          />
                        ) : (
                          <span className="text-xs text-stone-600">N/A</span>
                        )}
                      </td>

                      {/* Location */}
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            updateField(
                              entry.id,
                              'location',
                              local.location === 'line' ? 'backup' : 'line'
                            )
                          }
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            local.location === 'line'
                              ? 'bg-emerald-950 text-emerald-400'
                              : 'bg-stone-800 text-stone-400'
                          }`}
                        >
                          {local.location === 'line' ? 'LINE' : 'BACKUP'}
                        </button>
                      </td>

                      {/* 86'd */}
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handle86Toggle(entry.id, is86d)}
                          className={`text-xs px-2 py-1 rounded font-bold ${
                            is86d
                              ? 'bg-red-800 text-red-100 hover:bg-red-700'
                              : 'bg-stone-800 text-stone-500 hover:bg-stone-700'
                          }`}
                        >
                          {is86d ? '86' : '--'}
                        </button>
                      </td>

                      {/* Notes */}
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={local.notes}
                          onChange={(e) => updateField(entry.id, 'notes', e.target.value)}
                          placeholder="Notes..."
                          className="w-full min-w-[120px] rounded border border-stone-600 bg-stone-900 px-2 py-1 text-sm text-stone-200 placeholder:text-stone-500"
                        />
                      </td>
                    </tr>
                  )
                })}

                {/* Totals row */}
                <tr className="border-t-2 border-stone-600 bg-stone-800/50 font-medium text-stone-300">
                  <td className="px-3 py-3">Totals</td>
                  <td className="px-3 py-3 text-center">-</td>
                  <td className="px-3 py-3 text-center">{totals.on_hand}</td>
                  <td className="px-3 py-3 text-center">{totals.need_to_make}</td>
                  <td className="px-3 py-3 text-center">{totals.made}</td>
                  <td className="px-3 py-3 text-center">{totals.need_to_order}</td>
                  <td className="px-3 py-3 text-center">{totals.waste_qty}</td>
                  <td className="px-3 py-3 text-center">-</td>
                  <td className="px-3 py-3 text-center">-</td>
                  <td className="px-3 py-3 text-center">-</td>
                  <td className="px-3 py-3">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Staff Clipboard View - Simplified clipboard for staff members
// Staff can update on_hand, waste_qty, waste_reason, and notes.
// Other fields (made, need_to_make, need_to_order) are read-only for staff.
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { updateClipboardEntry } from '@/lib/staff/staff-portal-actions'

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

type EditableFields = {
  on_hand: number
  waste_qty: number
  waste_reason_code: string | null
  notes: string
}

export function StaffClipboardView({ stationId, stationName, date, entries }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Local editable state keyed by entry id
  const [localState, setLocalState] = useState<Record<string, EditableFields>>(() => {
    const state: Record<string, EditableFields> = {}
    for (const entry of entries) {
      state[entry.id] = {
        on_hand: entry.on_hand,
        waste_qty: entry.waste_qty,
        waste_reason_code: entry.waste_reason_code,
        notes: entry.notes ?? '',
      }
    }
    return state
  })

  const updateField = useCallback(
    (entryId: string, field: keyof EditableFields, value: number | string | null) => {
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

    let savedCount = 0

    try {
      for (const entry of entries) {
        const local = localState[entry.id]
        if (!local) continue

        const updates: Record<string, unknown> = {}
        if (local.on_hand !== entry.on_hand) updates.on_hand = local.on_hand
        if (local.waste_qty !== entry.waste_qty) updates.waste_qty = local.waste_qty
        if (local.waste_reason_code !== entry.waste_reason_code) {
          updates.waste_reason_code = local.waste_reason_code || null
        }
        if (local.notes !== (entry.notes ?? '')) updates.notes = local.notes

        if (Object.keys(updates).length > 0) {
          await updateClipboardEntry(entry.id, updates as any)
          savedCount++
        }
      }

      if (savedCount === 0) {
        setSuccessMsg('No changes to save')
      } else {
        setSuccessMsg(`Saved ${savedCount} change${savedCount !== 1 ? 's' : ''}`)
        router.refresh()
      }
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Save bar */}
      <div className="flex items-center justify-end gap-2 px-3 py-2 border-b border-stone-700">
        {successMsg && <span className="text-sm text-emerald-400">{successMsg}</span>}
        {error && <span className="text-sm text-red-400">{error}</span>}
        <Button onClick={handleSaveAll} loading={saving} size="sm">
          Save Changes
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-700 text-left text-xs text-stone-400 uppercase tracking-wider">
              <th className="px-3 py-3 font-medium">Component</th>
              <th className="px-3 py-3 font-medium text-center">Par</th>
              <th className="px-3 py-3 font-medium text-center">On Hand</th>
              <th className="px-3 py-3 font-medium text-center">Need to Make</th>
              <th className="px-3 py-3 font-medium text-center">Made</th>
              <th className="px-3 py-3 font-medium text-center">Waste</th>
              <th className="px-3 py-3 font-medium text-center">86&apos;d</th>
              <th className="px-3 py-3 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const comp = entry.station_components
              const local = localState[entry.id]
              if (!local) return null

              const is86d = entry.is_86d

              let rowClass = 'border-b border-stone-800 transition-colors'
              if (is86d) {
                rowClass += ' bg-red-950/30'
              }

              return (
                <tr key={entry.id} className={rowClass}>
                  {/* Component name */}
                  <td className="px-3 py-2">
                    <div className="font-medium text-stone-200">{comp?.name ?? 'Unknown'}</div>
                    {comp?.station_menu_items?.name && (
                      <div className="text-xs text-stone-500">{comp.station_menu_items.name}</div>
                    )}
                  </td>

                  {/* Par level (read-only) */}
                  <td className="px-3 py-2 text-center text-stone-400">
                    {comp?.par_level ?? 0} {comp?.par_unit ?? comp?.unit ?? ''}
                  </td>

                  {/* On Hand (editable) */}
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

                  {/* Need to Make (read-only) */}
                  <td className="px-3 py-2 text-center text-stone-400">{entry.need_to_make}</td>

                  {/* Made (read-only) */}
                  <td className="px-3 py-2 text-center text-stone-400">{entry.made}</td>

                  {/* Waste (editable) */}
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

                  {/* 86'd (read-only) */}
                  <td className="px-3 py-2 text-center">
                    {is86d ? (
                      <Badge variant="error">86</Badge>
                    ) : (
                      <span className="text-xs text-stone-600">--</span>
                    )}
                  </td>

                  {/* Notes (editable) */}
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
          </tbody>
        </table>
      </div>
    </div>
  )
}

'use client'

// Reorder Settings Client
// Inline-editable table for per-ingredient par level and reorder quantity configuration.

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, Pencil, Trash2, Check, X, ToggleLeft, ToggleRight } from '@/components/ui/icons'
import {
  upsertReorderSetting,
  deleteReorderSetting,
  toggleReorderSetting,
  type ReorderSetting,
} from '@/lib/inventory/reorder-settings-actions'
import type { UpsertReorderSettingInput } from '@/lib/inventory/reorder-settings-actions'
import { toast } from 'sonner'

type Vendor = { id: string; name: string }

type EditRow = {
  ingredient_name: string
  par_level: string
  reorder_qty: string
  unit: string
  preferred_vendor_id: string
}

const EMPTY_ROW: EditRow = {
  ingredient_name: '',
  par_level: '0',
  reorder_qty: '0',
  unit: 'each',
  preferred_vendor_id: '',
}

export function ReorderSettingsClient({
  initialSettings,
  vendors,
}: {
  initialSettings: ReorderSetting[]
  vendors: Vendor[]
}) {
  const [settings, setSettings] = useState(initialSettings)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRow, setEditRow] = useState<EditRow>(EMPTY_ROW)
  const [addingNew, setAddingNew] = useState(false)
  const [newRow, setNewRow] = useState<EditRow>(EMPTY_ROW)
  const [pending, startTransition] = useTransition()

  function startEdit(s: ReorderSetting) {
    setEditingId(s.id)
    setEditRow({
      ingredient_name: s.ingredient_name,
      par_level: String(s.par_level),
      reorder_qty: String(s.reorder_qty),
      unit: s.unit,
      preferred_vendor_id: s.preferred_vendor_id ?? '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditRow(EMPTY_ROW)
  }

  function saveEdit(setting: ReorderSetting) {
    const input: UpsertReorderSettingInput = {
      ingredient_name: editRow.ingredient_name || setting.ingredient_name,
      par_level: parseFloat(editRow.par_level) || 0,
      reorder_qty: parseFloat(editRow.reorder_qty) || 0,
      unit: editRow.unit || setting.unit,
      preferred_vendor_id: editRow.preferred_vendor_id || null,
      is_active: setting.is_active,
    }
    startTransition(async () => {
      const res = await upsertReorderSetting(input)
      if (res.success) {
        setSettings((prev) =>
          prev.map((s) =>
            s.id === setting.id
              ? {
                  ...s,
                  ...input,
                  preferred_vendor_name:
                    vendors.find((v) => v.id === input.preferred_vendor_id)?.name ?? null,
                }
              : s
          )
        )
        setEditingId(null)
        toast.success('Saved')
      } else {
        toast.error(res.error || 'Failed to save')
      }
    })
  }

  function saveNew() {
    const input: UpsertReorderSettingInput = {
      ingredient_name: newRow.ingredient_name,
      par_level: parseFloat(newRow.par_level) || 0,
      reorder_qty: parseFloat(newRow.reorder_qty) || 0,
      unit: newRow.unit || 'each',
      preferred_vendor_id: newRow.preferred_vendor_id || null,
      is_active: true,
    }
    if (!input.ingredient_name.trim()) {
      toast.error('Ingredient name is required')
      return
    }
    startTransition(async () => {
      const res = await upsertReorderSetting(input)
      if (res.success) {
        // Optimistic add with placeholder id (server will upsert by name)
        const optimistic: ReorderSetting = {
          id: `tmp-${Date.now()}`,
          ingredient_name: input.ingredient_name,
          par_level: input.par_level,
          reorder_qty: input.reorder_qty,
          unit: input.unit,
          preferred_vendor_id: input.preferred_vendor_id ?? null,
          preferred_vendor_name:
            vendors.find((v) => v.id === input.preferred_vendor_id)?.name ?? null,
          is_active: true,
        }
        setSettings((prev) => {
          const exists = prev.findIndex((s) => s.ingredient_name === input.ingredient_name)
          if (exists >= 0) {
            return prev.map((s, i) => (i === exists ? { ...s, ...input, id: s.id } : s))
          }
          return [...prev, optimistic].sort((a, b) =>
            a.ingredient_name.localeCompare(b.ingredient_name)
          )
        })
        setAddingNew(false)
        setNewRow(EMPTY_ROW)
        toast.success('Added')
      } else {
        toast.error(res.error || 'Failed to add')
      }
    })
  }

  function handleDelete(id: string, name: string) {
    startTransition(async () => {
      const prev = settings
      setSettings((s) => s.filter((r) => r.id !== id))
      const res = await deleteReorderSetting(id)
      if (!res.success) {
        setSettings(prev)
        toast.error(res.error || 'Failed to delete')
      } else {
        toast.success(`Removed ${name}`)
      }
    })
  }

  function handleToggle(id: string, current: boolean) {
    startTransition(async () => {
      const prev = settings
      setSettings((s) => s.map((r) => (r.id === id ? { ...r, is_active: !current } : r)))
      const res = await toggleReorderSetting(id, !current)
      if (!res.success) {
        setSettings(prev)
        toast.error(res.error || 'Failed to update')
      }
    })
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-800 text-left">
              <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Ingredient
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Par Level
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Reorder Qty
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Unit
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Vendor
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Active
              </th>
              <th className="px-4 py-3 w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800">
            {settings.map((s) =>
              editingId === s.id ? (
                <tr key={s.id} className="bg-stone-800/40">
                  <td className="px-4 py-2">
                    <input
                      className="w-full bg-stone-800 border border-stone-700 rounded px-2 py-1 text-stone-100 text-sm focus:outline-none focus:border-brand-500"
                      value={editRow.ingredient_name}
                      onChange={(e) =>
                        setEditRow((r) => ({ ...r, ingredient_name: e.target.value }))
                      }
                      autoFocus
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      className="w-20 bg-stone-800 border border-stone-700 rounded px-2 py-1 text-stone-100 text-sm focus:outline-none focus:border-brand-500"
                      value={editRow.par_level}
                      onChange={(e) => setEditRow((r) => ({ ...r, par_level: e.target.value }))}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      className="w-20 bg-stone-800 border border-stone-700 rounded px-2 py-1 text-stone-100 text-sm focus:outline-none focus:border-brand-500"
                      value={editRow.reorder_qty}
                      onChange={(e) => setEditRow((r) => ({ ...r, reorder_qty: e.target.value }))}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      className="w-20 bg-stone-800 border border-stone-700 rounded px-2 py-1 text-stone-100 text-sm focus:outline-none focus:border-brand-500"
                      value={editRow.unit}
                      onChange={(e) => setEditRow((r) => ({ ...r, unit: e.target.value }))}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-stone-100 text-sm focus:outline-none focus:border-brand-500"
                      value={editRow.preferred_vendor_id}
                      onChange={(e) =>
                        setEditRow((r) => ({ ...r, preferred_vendor_id: e.target.value }))
                      }
                    >
                      <option value="">No preference</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-stone-500 text-xs">unchanged</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => saveEdit(s)}
                        disabled={pending}
                        className="p-1.5 rounded text-emerald-400 hover:bg-emerald-900/30 disabled:opacity-50"
                        title="Save"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1.5 rounded text-stone-500 hover:bg-stone-800"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={s.id} className={!s.is_active ? 'opacity-50' : ''}>
                  <td className="px-4 py-3 font-medium text-stone-100">{s.ingredient_name}</td>
                  <td className="px-4 py-3 text-stone-300 tabular-nums">{s.par_level}</td>
                  <td className="px-4 py-3 text-stone-300 tabular-nums">{s.reorder_qty}</td>
                  <td className="px-4 py-3 text-stone-500">{s.unit}</td>
                  <td className="px-4 py-3 text-stone-500 text-xs">
                    {s.preferred_vendor_name ?? <span className="text-stone-700">any</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(s.id, s.is_active)}
                      disabled={pending}
                      className="text-stone-500 hover:text-stone-300 disabled:opacity-50"
                      title={s.is_active ? 'Disable' : 'Enable'}
                    >
                      {s.is_active ? (
                        <ToggleRight className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="h-5 w-5" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(s)}
                        className="p-1.5 rounded text-stone-500 hover:text-stone-300 hover:bg-stone-800"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id, s.ingredient_name)}
                        disabled={pending}
                        className="p-1.5 rounded text-stone-500 hover:text-red-400 hover:bg-red-950 disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}

            {/* Add new row */}
            {addingNew && (
              <tr className="bg-stone-800/40">
                <td className="px-4 py-2">
                  <input
                    className="w-full bg-stone-800 border border-stone-700 rounded px-2 py-1 text-stone-100 text-sm focus:outline-none focus:border-brand-500"
                    placeholder="Ingredient name"
                    value={newRow.ingredient_name}
                    onChange={(e) => setNewRow((r) => ({ ...r, ingredient_name: e.target.value }))}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveNew()
                      if (e.key === 'Escape') {
                        setAddingNew(false)
                        setNewRow(EMPTY_ROW)
                      }
                    }}
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className="w-20 bg-stone-800 border border-stone-700 rounded px-2 py-1 text-stone-100 text-sm focus:outline-none focus:border-brand-500"
                    value={newRow.par_level}
                    onChange={(e) => setNewRow((r) => ({ ...r, par_level: e.target.value }))}
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className="w-20 bg-stone-800 border border-stone-700 rounded px-2 py-1 text-stone-100 text-sm focus:outline-none focus:border-brand-500"
                    value={newRow.reorder_qty}
                    onChange={(e) => setNewRow((r) => ({ ...r, reorder_qty: e.target.value }))}
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    className="w-20 bg-stone-800 border border-stone-700 rounded px-2 py-1 text-stone-100 text-sm focus:outline-none focus:border-brand-500"
                    placeholder="each"
                    value={newRow.unit}
                    onChange={(e) => setNewRow((r) => ({ ...r, unit: e.target.value }))}
                  />
                </td>
                <td className="px-4 py-2">
                  <select
                    className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-stone-100 text-sm focus:outline-none focus:border-brand-500"
                    value={newRow.preferred_vendor_id}
                    onChange={(e) =>
                      setNewRow((r) => ({ ...r, preferred_vendor_id: e.target.value }))
                    }
                  >
                    <option value="">No preference</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2 text-stone-600 text-xs">active</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={saveNew}
                      disabled={pending}
                      className="p-1.5 rounded text-emerald-400 hover:bg-emerald-900/30 disabled:opacity-50"
                      title="Add"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setAddingNew(false)
                        setNewRow(EMPTY_ROW)
                      }}
                      className="p-1.5 rounded text-stone-500 hover:bg-stone-800"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {settings.length === 0 && !addingNew && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-stone-500 text-sm">
                  No reorder rules yet. Add one to configure automatic par-level restocking.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-stone-800 flex items-center justify-between">
        <p className="text-xs text-stone-600">
          {settings.filter((s) => s.is_active).length} active rule
          {settings.filter((s) => s.is_active).length !== 1 ? 's' : ''}
        </p>
        {!addingNew && (
          <Button variant="secondary" size="sm" onClick={() => setAddingNew(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Rule
          </Button>
        )}
      </div>
    </Card>
  )
}

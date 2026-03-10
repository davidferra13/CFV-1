'use client'

// Reorder Settings - Configure par levels, reorder quantities, and preferred vendors per ingredient.
// Inline editing with startTransition + try/catch per project rules.

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { ReorderSetting } from '@/lib/vendors/reorder-actions'
import { setReorderSettings, deleteReorderSetting } from '@/lib/vendors/reorder-actions'

type Vendor = {
  id: string
  name: string
}

type EditingRow = {
  ingredientName: string
  parLevel: string
  reorderQty: string
  preferredVendorId: string
  unit: string
}

const EMPTY_ROW: EditingRow = {
  ingredientName: '',
  parLevel: '',
  reorderQty: '',
  preferredVendorId: '',
  unit: 'each',
}

export function ReorderSettings({
  settings,
  vendors,
}: {
  settings: ReorderSetting[]
  vendors: Vendor[]
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRow, setEditRow] = useState<EditingRow>(EMPTY_ROW)
  const [showAdd, setShowAdd] = useState(false)
  const [newRow, setNewRow] = useState<EditingRow>(EMPTY_ROW)

  function handleSave(existingId: string | null, row: EditingRow) {
    setError(null)

    if (!row.ingredientName.trim()) {
      setError('Ingredient name is required')
      return
    }

    const parLevel = Number(row.parLevel)
    const reorderQty = Number(row.reorderQty)

    if (isNaN(parLevel) || parLevel < 0) {
      setError('Par level must be a non-negative number')
      return
    }

    startTransition(async () => {
      try {
        await setReorderSettings({
          ingredientName: row.ingredientName.trim(),
          parLevel,
          reorderQty: isNaN(reorderQty) ? 0 : reorderQty,
          preferredVendorId: row.preferredVendorId || null,
          unit: row.unit || 'each',
        })
        setEditingId(null)
        setShowAdd(false)
        setNewRow(EMPTY_ROW)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save settings')
      }
    })
  }

  function handleDelete(id: string) {
    setError(null)
    startTransition(async () => {
      try {
        await deleteReorderSetting(id)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete setting')
      }
    })
  }

  function startEditing(setting: ReorderSetting) {
    setEditingId(setting.id)
    setEditRow({
      ingredientName: setting.ingredientName,
      parLevel: String(setting.parLevel),
      reorderQty: String(setting.reorderQty),
      preferredVendorId: setting.preferredVendorId || '',
      unit: setting.unit,
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Reorder Settings</CardTitle>
          {!showAdd && (
            <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>
              + Add Item
            </Button>
          )}
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Configure par levels and reorder quantities per ingredient. Items below par will trigger
          reorder alerts.
        </p>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 mb-4">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-700 text-left text-stone-400">
                <th className="pb-2 pr-4">Ingredient</th>
                <th className="pb-2 pr-4">Par Level</th>
                <th className="pb-2 pr-4">Reorder Qty</th>
                <th className="pb-2 pr-4">Unit</th>
                <th className="pb-2 pr-4">Preferred Vendor</th>
                <th className="pb-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {settings.map((setting) => {
                const isEditing = editingId === setting.id

                if (isEditing) {
                  return (
                    <tr key={setting.id} className="border-b border-stone-800">
                      <td className="py-2 pr-4">
                        <Input
                          value={editRow.ingredientName}
                          onChange={(e) =>
                            setEditRow({ ...editRow, ingredientName: e.target.value })
                          }
                          className="text-xs"
                          disabled
                        />
                      </td>
                      <td className="py-2 pr-4">
                        <Input
                          type="number"
                          value={editRow.parLevel}
                          onChange={(e) => setEditRow({ ...editRow, parLevel: e.target.value })}
                          className="text-xs w-20"
                          min={0}
                          step={0.1}
                        />
                      </td>
                      <td className="py-2 pr-4">
                        <Input
                          type="number"
                          value={editRow.reorderQty}
                          onChange={(e) => setEditRow({ ...editRow, reorderQty: e.target.value })}
                          className="text-xs w-20"
                          min={0}
                          step={0.1}
                        />
                      </td>
                      <td className="py-2 pr-4">
                        <Input
                          value={editRow.unit}
                          onChange={(e) => setEditRow({ ...editRow, unit: e.target.value })}
                          className="text-xs w-16"
                        />
                      </td>
                      <td className="py-2 pr-4">
                        <select
                          value={editRow.preferredVendorId}
                          onChange={(e) =>
                            setEditRow({ ...editRow, preferredVendorId: e.target.value })
                          }
                          className="rounded-lg border border-stone-600 bg-stone-900 px-2 py-1 text-xs text-stone-100"
                        >
                          <option value="">None</option>
                          {vendors.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex gap-1">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleSave(setting.id, editRow)}
                            disabled={isPending}
                          >
                            Save
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr key={setting.id} className="border-b border-stone-800">
                    <td className="py-2 pr-4 text-stone-200 font-medium">
                      {setting.ingredientName}
                    </td>
                    <td className="py-2 pr-4 text-stone-300">{setting.parLevel}</td>
                    <td className="py-2 pr-4 text-stone-300">{setting.reorderQty}</td>
                    <td className="py-2 pr-4 text-stone-400">{setting.unit}</td>
                    <td className="py-2 pr-4">
                      {setting.preferredVendorName ? (
                        <Badge variant="info">{setting.preferredVendorName}</Badge>
                      ) : (
                        <span className="text-stone-500">-</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => startEditing(setting)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(setting.id)}
                          disabled={isPending}
                          className="text-red-400 hover:text-red-300"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {/* Add new row */}
              {showAdd && (
                <tr className="border-b border-stone-800 bg-stone-900/50">
                  <td className="py-2 pr-4">
                    <Input
                      value={newRow.ingredientName}
                      onChange={(e) => setNewRow({ ...newRow, ingredientName: e.target.value })}
                      placeholder="Ingredient name"
                      className="text-xs"
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <Input
                      type="number"
                      value={newRow.parLevel}
                      onChange={(e) => setNewRow({ ...newRow, parLevel: e.target.value })}
                      placeholder="0"
                      className="text-xs w-20"
                      min={0}
                      step={0.1}
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <Input
                      type="number"
                      value={newRow.reorderQty}
                      onChange={(e) => setNewRow({ ...newRow, reorderQty: e.target.value })}
                      placeholder="0"
                      className="text-xs w-20"
                      min={0}
                      step={0.1}
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <Input
                      value={newRow.unit}
                      onChange={(e) => setNewRow({ ...newRow, unit: e.target.value })}
                      placeholder="each"
                      className="text-xs w-16"
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <select
                      value={newRow.preferredVendorId}
                      onChange={(e) => setNewRow({ ...newRow, preferredVendorId: e.target.value })}
                      className="rounded-lg border border-stone-600 bg-stone-900 px-2 py-1 text-xs text-stone-100"
                    >
                      <option value="">None</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex gap-1">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleSave(null, newRow)}
                        disabled={isPending}
                      >
                        Add
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowAdd(false)
                          setNewRow(EMPTY_ROW)
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {settings.length === 0 && !showAdd && (
          <p className="text-sm text-stone-500 text-center py-6">
            No reorder settings configured yet. Add items to set par levels and reorder quantities.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

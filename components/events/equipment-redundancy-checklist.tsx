'use client'

import { useState, useTransition } from 'react'
import { Plus, Save, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  saveEquipmentChecklist,
  type EquipmentItem,
} from '@/lib/events/equipment-checklist-actions'

type Props = {
  eventId: string
  items: EquipmentItem[]
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function EquipmentRedundancyChecklist({ eventId, items: initialItems }: Props) {
  const [items, setItems] = useState<EquipmentItem[]>(initialItems)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function handleAddRow() {
    setItems((prev) => [...prev, { id: generateId(), name: '', hasBackup: false, notes: '' }])
  }

  function handleNameChange(id: string, name: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, name } : i)))
  }

  function handleBackupToggle(id: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, hasBackup: !i.hasBackup } : i)))
  }

  function handleNotesChange(id: string, notes: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, notes } : i)))
  }

  function handleRemove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  function handleSave() {
    const validItems = items.filter((i) => i.name.trim())
    startTransition(async () => {
      await saveEquipmentChecklist(eventId, validItems)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const itemsWithBackup = items.filter((i) => i.hasBackup).length
  const itemsMissingBackup = items.filter((i) => i.name.trim() && !i.hasBackup).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-slate-600" />
          <h3 className="font-semibold text-base">Equipment Checklist</h3>
        </div>
        <div className="flex items-center gap-2">
          {itemsMissingBackup > 0 && (
            <Badge variant="warning">{itemsMissingBackup} missing backup</Badge>
          )}
          {itemsWithBackup > 0 && items.length > 0 && itemsMissingBackup === 0 && (
            <Badge variant="success">All backed up</Badge>
          )}
        </div>
      </div>

      {/* Table */}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          No equipment added yet. Click "Add Equipment" to start.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Equipment Name
                </th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground whitespace-nowrap">
                  Backup Available?
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Notes</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground w-8" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} className={idx % 2 === 0 ? '' : 'bg-muted/20'}>
                  <td className="px-3 py-2">
                    <Input
                      value={item.name}
                      onChange={(e) => handleNameChange(item.id, e.target.value)}
                      placeholder="e.g. Immersion blender"
                      disabled={isPending}
                      className="h-8 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleBackupToggle(item.id)}
                      disabled={isPending}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        item.hasBackup
                          ? 'bg-green-900 text-green-800 hover:bg-green-200'
                          : 'bg-red-900 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {item.hasBackup ? 'Yes' : 'No'}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={item.notes}
                      onChange={(e) => handleNotesChange(item.id, e.target.value)}
                      placeholder="Optional notes…"
                      disabled={isPending}
                      className="h-8 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      disabled={isPending}
                      className="text-muted-foreground hover:text-destructive transition-colors text-xs"
                      aria-label="Remove equipment"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" disabled={isPending} onClick={handleAddRow}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Equipment
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={isPending || items.filter((i) => i.name.trim()).length === 0}
          onClick={handleSave}
        >
          <Save className="mr-1.5 h-4 w-4" />
          {saved ? 'Saved!' : 'Save Checklist'}
        </Button>
      </div>
    </div>
  )
}

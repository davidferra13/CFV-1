'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  addWasteEntry,
  updateWasteEntry,
  deleteWasteEntry,
  type WasteEntry,
  type WasteCategory,
  type WasteReason,
} from '@/lib/events/waste-tracking-actions'

const CATEGORIES: { value: WasteCategory; label: string }[] = [
  { value: 'protein', label: 'Protein' },
  { value: 'produce', label: 'Produce' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'grain', label: 'Grain' },
  { value: 'prepared_dish', label: 'Prepared Dish' },
  { value: 'other', label: 'Other' },
]

const REASONS: { value: WasteReason; label: string }[] = [
  { value: 'overproduction', label: 'Overproduction' },
  { value: 'spoilage', label: 'Spoilage' },
  { value: 'guest_no_show', label: 'Guest No-Show' },
  { value: 'dietary_change', label: 'Dietary Change' },
  { value: 'quality_issue', label: 'Quality Issue' },
  { value: 'other', label: 'Other' },
]

function formatCents(cents: number | null): string {
  if (cents == null) return '-'
  return `$${(cents / 100).toFixed(2)}`
}

function categoryColor(cat: WasteCategory): 'default' | 'success' | 'warning' | 'error' | 'info' {
  switch (cat) {
    case 'protein':
      return 'error'
    case 'produce':
      return 'success'
    case 'dairy':
      return 'info'
    case 'grain':
      return 'warning'
    case 'prepared_dish':
      return 'default'
    default:
      return 'default'
  }
}

export function WasteLogPanel({
  eventId,
  initialEntries,
}: {
  eventId: string
  initialEntries: WasteEntry[]
}) {
  const router = useRouter()
  const [entries, setEntries] = useState<WasteEntry[]>(initialEntries)
  const [form, setForm] = useState({
    item_name: '',
    category: 'protein' as WasteCategory,
    quantity_description: '',
    estimated_cost_cents: '',
    reason: 'overproduction' as WasteReason,
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const totalWasteCents = entries.reduce((sum, e) => sum + (e.estimated_cost_cents ?? 0), 0)

  function resetForm() {
    setForm({
      item_name: '',
      category: 'protein',
      quantity_description: '',
      estimated_cost_cents: '',
      reason: 'overproduction',
      notes: '',
    })
    setEditingId(null)
  }

  function startEdit(entry: WasteEntry) {
    setForm({
      item_name: entry.item_name,
      category: entry.category,
      quantity_description: entry.quantity_description ?? '',
      estimated_cost_cents:
        entry.estimated_cost_cents != null ? String(entry.estimated_cost_cents / 100) : '',
      reason: entry.reason,
      notes: entry.notes ?? '',
    })
    setEditingId(entry.id)
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.item_name.trim()) {
      setError('Item name is required.')
      return
    }
    setError(null)
    setSaving(true)

    const costCents = form.estimated_cost_cents
      ? Math.round(parseFloat(form.estimated_cost_cents) * 100)
      : undefined

    try {
      if (editingId) {
        const updated = await updateWasteEntry(editingId, {
          item_name: form.item_name.trim(),
          category: form.category,
          quantity_description: form.quantity_description || undefined,
          estimated_cost_cents: costCents,
          reason: form.reason,
          notes: form.notes || undefined,
        })
        setEntries((prev) => prev.map((ent) => (ent.id === editingId ? updated : ent)))
      } else {
        const created = await addWasteEntry(eventId, {
          item_name: form.item_name.trim(),
          category: form.category,
          quantity_description: form.quantity_description || undefined,
          estimated_cost_cents: costCents,
          reason: form.reason,
          notes: form.notes || undefined,
        })
        setEntries((prev) => [created, ...prev])
      }
      resetForm()
    } catch (err) {
      setError(editingId ? 'Failed to update entry.' : 'Failed to log waste entry.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(entryId: string) {
    setDeleting(entryId)
    try {
      await deleteWasteEntry(entryId)
      setEntries((prev) => prev.filter((e) => e.id !== entryId))
      if (editingId === entryId) resetForm()
    } catch {
      setError('Failed to delete entry.')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-stone-200">Food Waste Log</h3>
          <p className="text-xs text-stone-500">
            {entries.length} item{entries.length !== 1 ? 's' : ''} logged
            {totalWasteCents > 0 && ` - ${formatCents(totalWasteCents)} total waste`}
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            setOpen(!open)
            if (open) resetForm()
          }}
        >
          {open ? 'Close' : '+ Log Waste'}
        </Button>
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-stone-700 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-400">Item Name *</label>
              <Input
                value={form.item_name}
                onChange={(e) => setForm((p) => ({ ...p, item_name: e.target.value }))}
                placeholder="e.g. Salmon filets"
              />
            </div>
            <div>
              <label className="text-xs text-stone-400">Category</label>
              <select
                className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-200"
                value={form.category}
                onChange={(e) =>
                  setForm((p) => ({ ...p, category: e.target.value as WasteCategory }))
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-stone-400">Quantity</label>
              <Input
                value={form.quantity_description}
                onChange={(e) => setForm((p) => ({ ...p, quantity_description: e.target.value }))}
                placeholder="e.g. 2 lbs"
              />
            </div>
            <div>
              <label className="text-xs text-stone-400">Est. Cost ($)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.estimated_cost_cents}
                onChange={(e) => setForm((p) => ({ ...p, estimated_cost_cents: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-xs text-stone-400">Reason</label>
              <select
                className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-200"
                value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value as WasteReason }))}
              >
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-stone-400">Notes</label>
            <Input
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Optional notes"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update Entry' : 'Add Entry'}
            </Button>
            {editingId && (
              <Button type="button" variant="ghost" onClick={resetForm}>
                Cancel Edit
              </Button>
            )}
          </div>
        </form>
      )}

      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start justify-between rounded-lg border border-stone-700/50 p-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-stone-200">{entry.item_name}</span>
                  <Badge variant={categoryColor(entry.category)}>
                    {CATEGORIES.find((c) => c.value === entry.category)?.label ?? entry.category}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-stone-500">
                  {entry.quantity_description && <span>{entry.quantity_description}</span>}
                  {entry.estimated_cost_cents != null && (
                    <span className="text-amber-400">
                      {formatCents(entry.estimated_cost_cents)}
                    </span>
                  )}
                  <span>
                    {REASONS.find((r) => r.value === entry.reason)?.label ?? entry.reason}
                  </span>
                </div>
                {entry.notes && <p className="text-xs text-stone-500">{entry.notes}</p>}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" onClick={() => startEdit(entry)} className="text-xs">
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleDelete(entry.id)}
                  disabled={deleting === entry.id}
                  className="text-xs text-red-400"
                >
                  {deleting === entry.id ? '...' : 'Delete'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 && !open && (
        <p className="text-center text-xs text-stone-600 py-4">
          No waste logged for this event. Tap &quot;+ Log Waste&quot; to track food waste and its
          cost.
        </p>
      )}
    </div>
  )
}

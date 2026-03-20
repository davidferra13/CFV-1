'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  addCollaborator,
  updateCollaborator,
  removeCollaborator,
  type Collaborator,
  type AddCollaboratorInput,
} from '@/lib/events/collaborator-actions'

const STATION_OPTIONS = [
  'Grill',
  'Saute',
  'Pastry',
  'Garde Manger',
  'Prep',
  'Plating',
  'Bar',
  'Front of House',
  'Other',
]

const ROLE_OPTIONS = [
  { value: 'lead', label: 'Lead' },
  { value: 'collaborator', label: 'Collaborator' },
  { value: 'assistant', label: 'Assistant' },
] as const

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  invited: 'warning',
  confirmed: 'success',
  declined: 'error',
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

type CollaboratorForm = {
  collaborator_name: string
  collaborator_email: string
  assigned_station: string
  role: 'lead' | 'collaborator' | 'assistant'
  revenue_split_pct: string
  notes: string
}

const EMPTY_FORM: CollaboratorForm = {
  collaborator_name: '',
  collaborator_email: '',
  assigned_station: '',
  role: 'collaborator',
  revenue_split_pct: '0',
  notes: '',
}

export function CollaboratorPanel({
  eventId,
  initialCollaborators,
  eventTotalCents,
}: {
  eventId: string
  initialCollaborators: Collaborator[]
  eventTotalCents: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CollaboratorForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const collaborators = initialCollaborators
  const totalSplitPct = collaborators.reduce((sum, c) => sum + c.revenue_split_pct, 0)
  const hostRetainedPct = 100 - totalSplitPct

  function startAdd() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowAddForm(true)
    setError(null)
  }

  function startEdit(collab: Collaborator) {
    setForm({
      collaborator_name: collab.collaborator_name,
      collaborator_email: collab.collaborator_email || '',
      assigned_station: collab.assigned_station || '',
      role: collab.role,
      revenue_split_pct: String(collab.revenue_split_pct),
      notes: collab.notes || '',
    })
    setEditingId(collab.id)
    setShowAddForm(false)
    setError(null)
  }

  function cancelForm() {
    setShowAddForm(false)
    setEditingId(null)
    setError(null)
  }

  async function handleAdd() {
    if (!form.collaborator_name.trim()) {
      setError('Name is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const input: AddCollaboratorInput = {
        collaborator_name: form.collaborator_name,
        collaborator_email: form.collaborator_email || null,
        assigned_station: form.assigned_station || null,
        role: form.role,
        revenue_split_pct: parseInt(form.revenue_split_pct, 10) || 0,
        notes: form.notes || null,
      }
      const result = await addCollaborator(eventId, input)
      if (!result.success) {
        setError(result.error || 'Failed to add')
        return
      }
      setShowAddForm(false)
      setForm(EMPTY_FORM)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add collaborator')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate() {
    if (!editingId) return
    setSaving(true)
    setError(null)
    try {
      const result = await updateCollaborator(editingId, {
        collaborator_name: form.collaborator_name,
        collaborator_email: form.collaborator_email || null,
        assigned_station: form.assigned_station || null,
        role: form.role,
        revenue_split_pct: parseInt(form.revenue_split_pct, 10) || 0,
        notes: form.notes || null,
      })
      if (!result.success) {
        setError(result.error || 'Failed to update')
        return
      }
      setEditingId(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update collaborator')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(collabId: string, status: 'invited' | 'confirmed' | 'declined') {
    try {
      const result = await updateCollaborator(collabId, { status })
      if (!result.success) return
      router.refresh()
    } catch {
      // non-blocking status update
    }
  }

  async function handleRemove(collabId: string) {
    try {
      await removeCollaborator(collabId)
      router.refresh()
    } catch {
      // non-blocking
    }
  }

  function updateField(field: keyof CollaboratorForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function renderForm(onSubmit: () => void, submitLabel: string) {
    return (
      <div className="space-y-3 border border-stone-700 rounded-lg p-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1">Name *</label>
            <input
              type="text"
              className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm"
              value={form.collaborator_name}
              onChange={(e) => updateField('collaborator_name', e.target.value)}
              placeholder="Chef name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1">Email</label>
            <input
              type="email"
              className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm"
              value={form.collaborator_email}
              onChange={(e) => updateField('collaborator_email', e.target.value)}
              placeholder="chef@example.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1">Station</label>
            <select
              className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm"
              value={form.assigned_station}
              onChange={(e) => updateField('assigned_station', e.target.value)}
            >
              <option value="">- None -</option>
              {STATION_OPTIONS.map((s) => (
                <option key={s} value={s.toLowerCase()}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1">Role</label>
            <select
              className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm"
              value={form.role}
              onChange={(e) => updateField('role', e.target.value)}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1">Revenue Split %</label>
            <input
              type="number"
              min="0"
              max="100"
              className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm"
              value={form.revenue_split_pct}
              onChange={(e) => updateField('revenue_split_pct', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">Notes</label>
          <textarea
            className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm min-h-[56px] resize-y"
            value={form.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Special instructions, dietary expertise, etc."
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-2">
          <Button size="sm" disabled={saving} onClick={onSubmit}>
            {saving ? 'Saving...' : submitLabel}
          </Button>
          <Button variant="ghost" size="sm" onClick={cancelForm}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-sm font-medium text-stone-400 hover:text-stone-100 transition-colors"
      >
        <span>{open ? '▾' : '▸'}</span>
        Collaborating Chefs
        {collaborators.length > 0 && <Badge variant="default">{collaborators.length}</Badge>}
      </button>

      {open && (
        <div className="pl-4 space-y-3 pt-1">
          {/* Collaborator list */}
          {collaborators.map((collab) => {
            const isEditing = editingId === collab.id

            if (isEditing) {
              return (
                <div key={collab.id}>
                  {renderForm(handleUpdate, 'Update')}
                </div>
              )
            }

            const splitAmount = Math.round((eventTotalCents * collab.revenue_split_pct) / 100)

            return (
              <div key={collab.id} className="border border-stone-700 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-stone-200">
                      {collab.collaborator_name}
                    </span>
                    <Badge variant={STATUS_VARIANT[collab.status] || 'default'}>
                      {collab.status}
                    </Badge>
                    <Badge variant="info">{collab.role}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => startEdit(collab)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs text-red-400 hover:text-red-300" onClick={() => handleRemove(collab.id)}>
                      Remove
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-400">
                  {collab.assigned_station && (
                    <span>Station: <span className="text-stone-300 capitalize">{collab.assigned_station}</span></span>
                  )}
                  {collab.collaborator_email && (
                    <span>Email: <span className="text-stone-300">{collab.collaborator_email}</span></span>
                  )}
                  <span>
                    Split: <span className="text-stone-300">{collab.revenue_split_pct}%</span>
                    {eventTotalCents > 0 && (
                      <span className="text-stone-500"> ({formatCents(splitAmount)})</span>
                    )}
                  </span>
                </div>

                {collab.notes && (
                  <p className="text-xs text-stone-500">{collab.notes}</p>
                )}

                {/* Quick status toggles */}
                <div className="flex gap-1">
                  {collab.status !== 'confirmed' && (
                    <button
                      onClick={() => handleStatusChange(collab.id, 'confirmed')}
                      className="text-xs text-green-400 hover:text-green-300"
                    >
                      Mark Confirmed
                    </button>
                  )}
                  {collab.status !== 'declined' && (
                    <button
                      onClick={() => handleStatusChange(collab.id, 'declined')}
                      className="text-xs text-red-400 hover:text-red-300 ml-2"
                    >
                      Mark Declined
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {/* Add form */}
          {showAddForm && renderForm(handleAdd, 'Add Collaborator')}

          {/* Add button + Summary */}
          {!showAddForm && !editingId && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={startAdd}>
              + Add Collaborator
            </Button>
          )}

          {/* Revenue split summary */}
          {collaborators.length > 0 && eventTotalCents > 0 && (
            <div className="border-t border-stone-700 pt-3 space-y-1">
              <p className="text-xs font-medium text-stone-400">Revenue Split Summary</p>
              <div className="space-y-0.5">
                <div className="flex justify-between text-xs">
                  <span className="text-stone-300">You (host chef)</span>
                  <span className="text-stone-200">
                    {hostRetainedPct}% - {formatCents(Math.round((eventTotalCents * hostRetainedPct) / 100))}
                  </span>
                </div>
                {collaborators.map((c) => (
                  <div key={c.id} className="flex justify-between text-xs">
                    <span className="text-stone-400">{c.collaborator_name}</span>
                    <span className="text-stone-300">
                      {c.revenue_split_pct}% - {formatCents(Math.round((eventTotalCents * c.revenue_split_pct) / 100))}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between text-xs font-medium border-t border-stone-700 pt-1 mt-1">
                  <span className="text-stone-300">Total</span>
                  <span className="text-stone-200">100% - {formatCents(eventTotalCents)}</span>
                </div>
              </div>
              <p className="text-xs text-stone-500 italic">
                Revenue splits are informational only. They do not automatically create ledger entries.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Badge } from '@/components/ui/badge'
import { upsertContingencyNote, deleteContingencyNote } from '@/lib/contingency/actions'
import { SCENARIO_LABELS } from '@/lib/contingency/constants'

type Contact = { id: string; name: string; relationship: string; phone: string | null }
type ContingencyNote = {
  id: string
  scenario_type: string
  mitigation_notes: string
  backup_contact_id: string | null
  chef_emergency_contacts?: Contact | null
}

const SCENARIOS = Object.entries(SCENARIO_LABELS)

export function ContingencyPanel({
  eventId,
  initialNotes,
  emergencyContacts,
}: {
  eventId: string
  initialNotes: ContingencyNote[]
  emergencyContacts: Contact[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null) // scenario_type being edited
  const [form, setForm] = useState({ mitigation_notes: '', backup_contact_id: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const noteMap = Object.fromEntries(initialNotes.map((n) => [n.scenario_type, n]))

  function startEdit(scenario_type: string) {
    const existing = noteMap[scenario_type]
    setForm({
      mitigation_notes: existing?.mitigation_notes ?? '',
      backup_contact_id: existing?.backup_contact_id ?? '',
    })
    setEditing(scenario_type)
    setError(null)
  }

  async function handleSave() {
    if (!editing || !form.mitigation_notes.trim()) {
      setError('Please enter a mitigation plan.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await upsertContingencyNote(eventId, {
        scenario_type: editing as Parameters<typeof upsertContingencyNote>[1]['scenario_type'],
        mitigation_notes: form.mitigation_notes,
        backup_contact_id: form.backup_contact_id || undefined,
      })
      setEditing(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteContingencyNote(id)
      router.refresh()
    } catch {
      /* silent */
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-sm font-medium text-stone-400 hover:text-stone-100 transition-colors"
      >
        <span>{open ? '▾' : '▸'}</span>
        Contingency Plans
        {initialNotes.length > 0 && <Badge variant="default">{initialNotes.length}</Badge>}
      </button>

      {open && (
        <div className="pl-4 space-y-3 pt-1">
          {SCENARIOS.map(([type, label]) => {
            const existing = noteMap[type]
            const isEditing = editing === type
            const contact = existing?.chef_emergency_contacts

            return (
              <div key={type} className="border border-stone-700 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-stone-200">{label}</span>
                  {!isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => startEdit(type)}
                    >
                      {existing ? 'Edit' : '+ Add plan'}
                    </Button>
                  )}
                </div>

                {existing && !isEditing && (
                  <div>
                    <p className="text-sm text-stone-300">{existing.mitigation_notes}</p>
                    {contact && (
                      <p className="text-xs text-stone-400 mt-0.5">
                        Backup: {contact.name} ({contact.relationship})
                        {contact.phone ? ` - ${contact.phone}` : ''}
                      </p>
                    )}
                    <button
                      onClick={() => setDeleteConfirmId(existing.id)}
                      className="text-xs text-stone-300 hover:text-red-500 mt-1"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {isEditing && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-stone-400 mb-1">
                        Mitigation plan *
                      </label>
                      <textarea
                        className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm min-h-[72px] resize-y"
                        value={form.mitigation_notes}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, mitigation_notes: e.target.value }))
                        }
                        placeholder="What will you do if this happens?"
                      />
                    </div>
                    {emergencyContacts.length > 0 && (
                      <div>
                        <label className="block text-xs font-medium text-stone-400 mb-1">
                          Backup contact
                        </label>
                        <select
                          className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm"
                          value={form.backup_contact_id}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, backup_contact_id: e.target.value }))
                          }
                        >
                          <option value="">- None -</option>
                          {emergencyContacts.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.relationship})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {error && <p className="text-xs text-red-600">{error}</p>}
                    <div className="flex gap-2">
                      <Button size="sm" disabled={saving} onClick={handleSave}>
                        {saving ? 'Saving…' : 'Save'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      <ConfirmModal
        open={!!deleteConfirmId}
        onCancel={() => setDeleteConfirmId(null)}
        title="Delete contingency plan?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (deleteConfirmId) handleDelete(deleteConfirmId)
          setDeleteConfirmId(null)
        }}
      />
    </div>
  )
}

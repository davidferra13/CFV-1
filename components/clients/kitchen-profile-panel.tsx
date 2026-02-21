'use client'

// KitchenProfilePanel
// Displays and edits structured kitchen walkthrough notes for a client.
// Surfaced on the client detail page so the chef can document the client's
// kitchen before their first service and keep it updated after each visit.

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { updateClient } from '@/lib/clients/actions'
import { format } from 'date-fns'

interface KitchenProfileData {
  kitchen_size: string | null
  kitchen_constraints: string | null
  kitchen_oven_notes: string | null
  kitchen_burner_notes: string | null
  kitchen_counter_notes: string | null
  kitchen_refrigeration_notes: string | null
  kitchen_plating_notes: string | null
  kitchen_sink_notes: string | null
  equipment_available: string[] | null
  equipment_must_bring: string[] | null
  kitchen_profile_updated_at: string | null
}

interface KitchenProfilePanelProps {
  clientId: string
  initialData: KitchenProfileData
}

const FIELDS: Array<{ key: keyof KitchenProfileData; label: string; placeholder: string }> = [
  {
    key: 'kitchen_oven_notes',
    label: 'Oven',
    placeholder: 'Reliability, temperature accuracy, quirks...',
  },
  {
    key: 'kitchen_burner_notes',
    label: 'Burners',
    placeholder: 'Number working, gas vs induction, BTU...',
  },
  {
    key: 'kitchen_counter_notes',
    label: 'Counter space',
    placeholder: 'Available surfaces, prep area quality...',
  },
  {
    key: 'kitchen_refrigeration_notes',
    label: 'Refrigeration',
    placeholder: 'Fridge/freezer space, cooler available...',
  },
  {
    key: 'kitchen_plating_notes',
    label: 'Plating surfaces',
    placeholder: 'What surfaces exist for staging dishes...',
  },
  {
    key: 'kitchen_sink_notes',
    label: 'Sink',
    placeholder: 'Access, hot water reliability, drainage...',
  },
]

export function KitchenProfilePanel({ clientId, initialData }: KitchenProfilePanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<KitchenProfileData>(initialData)
  const [draft, setDraft] = useState<KitchenProfileData>(initialData)

  const hasAnyNotes =
    FIELDS.some((f) => !!data[f.key]) || !!data.kitchen_constraints || !!data.kitchen_size

  function startEdit() {
    setDraft({ ...data })
    setIsEditing(true)
    setIsOpen(true)
  }

  function cancelEdit() {
    setDraft({ ...data })
    setIsEditing(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateClient(clientId, {
        kitchen_size: draft.kitchen_size ?? undefined,
        kitchen_constraints: draft.kitchen_constraints ?? undefined,
        kitchen_oven_notes: draft.kitchen_oven_notes ?? undefined,
        kitchen_burner_notes: draft.kitchen_burner_notes ?? undefined,
        kitchen_counter_notes: draft.kitchen_counter_notes ?? undefined,
        kitchen_refrigeration_notes: draft.kitchen_refrigeration_notes ?? undefined,
        kitchen_plating_notes: draft.kitchen_plating_notes ?? undefined,
        kitchen_sink_notes: draft.kitchen_sink_notes ?? undefined,
        equipment_available: draft.equipment_available ?? undefined,
        equipment_must_bring: draft.equipment_must_bring ?? undefined,
        kitchen_profile_updated_at: new Date().toISOString(),
      } as any)
      setData({ ...draft, kitchen_profile_updated_at: new Date().toISOString() })
      setIsEditing(false)
    } catch {
      // keep editing open on error
    } finally {
      setSaving(false)
    }
  }

  function updateDraftField(key: keyof KitchenProfileData, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value || null }))
  }

  return (
    <Card className="p-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold text-stone-900">Kitchen Profile</span>
          {!hasAnyNotes && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
              No notes yet
            </span>
          )}
          {data.kitchen_profile_updated_at && (
            <span className="text-xs text-stone-400">
              Updated {format(new Date(data.kitchen_profile_updated_at), 'MMM d, yyyy')}
            </span>
          )}
        </div>
        <span className="text-stone-400 text-sm">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 border-t border-stone-100 space-y-4 pt-4">
          {isEditing ? (
            <>
              {/* Kitchen size */}
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">
                  Kitchen size
                </label>
                <input
                  type="text"
                  value={draft.kitchen_size ?? ''}
                  onChange={(e) => updateDraftField('kitchen_size', e.target.value)}
                  placeholder="Small, medium, large, galley..."
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                />
              </div>

              {/* Structured walkthrough fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FIELDS.map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-stone-500 mb-1">
                      {f.label}
                    </label>
                    <textarea
                      value={(draft[f.key] as string) ?? ''}
                      onChange={(e) => updateDraftField(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      rows={2}
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none"
                    />
                  </div>
                ))}
              </div>

              {/* General constraints */}
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">
                  General notes
                </label>
                <textarea
                  value={draft.kitchen_constraints ?? ''}
                  onChange={(e) => updateDraftField('kitchen_constraints', e.target.value)}
                  placeholder="Anything else to know about this kitchen..."
                  rows={2}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
                  Save Kitchen Notes
                </Button>
                <Button variant="ghost" size="sm" onClick={cancelEdit}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              {hasAnyNotes ? (
                <div className="space-y-3">
                  {data.kitchen_size && (
                    <div>
                      <p className="text-xs font-medium text-stone-500">Size</p>
                      <p className="text-sm text-stone-800">{data.kitchen_size}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {FIELDS.map((f) => {
                      const val = data[f.key] as string | null
                      if (!val) return null
                      return (
                        <div key={f.key}>
                          <p className="text-xs font-medium text-stone-500">{f.label}</p>
                          <p className="text-sm text-stone-800">{val}</p>
                        </div>
                      )
                    })}
                  </div>
                  {data.kitchen_constraints && (
                    <div>
                      <p className="text-xs font-medium text-stone-500">General notes</p>
                      <p className="text-sm text-stone-800">{data.kitchen_constraints}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-stone-400">
                  No kitchen notes yet. Add notes after your first walkthrough — they&apos;ll appear
                  on every event at this location.
                </p>
              )}
              <Button variant="secondary" size="sm" onClick={startEdit}>
                {hasAnyNotes ? 'Edit Kitchen Notes' : 'Add Kitchen Notes'}
              </Button>
            </>
          )}
        </div>
      )}
    </Card>
  )
}

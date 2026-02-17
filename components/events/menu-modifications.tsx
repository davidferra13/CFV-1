'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { logMenuModification, deleteMenuModification } from '@/lib/menus/modifications'

const MODIFICATION_TYPES = [
  { value: 'substitution', label: 'Substituted' },
  { value: 'addition', label: 'Added (not on menu)' },
  { value: 'removal', label: 'Not served' },
  { value: 'method_change', label: 'Method changed' },
] as const

const COMMON_REASONS = [
  'Item unavailable',
  'Had substitute on hand',
  "Chef's choice",
  'Client request',
  'Forgot ingredient/equipment',
  'Quality issue at store',
]

type Modification = {
  id: string
  modification_type: string
  original_description: string | null
  actual_description: string | null
  reason: string | null
  created_at: string
}

export function MenuModifications({
  eventId,
  initialModifications,
}: {
  eventId: string
  initialModifications: Modification[]
}) {
  const [mods, setMods] = useState(initialModifications)
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modType, setModType] = useState<string>('substitution')
  const [original, setOriginal] = useState('')
  const [actual, setActual] = useState('')
  const [reason, setReason] = useState('')

  async function handleAdd() {
    if (!original && !actual) return
    setSaving(true)
    try {
      const result = await logMenuModification({
        event_id: eventId,
        modification_type: modType as any,
        original_description: original || null,
        actual_description: actual || null,
        reason: reason || null,
      })
      if (result.modification) {
        setMods([...mods, result.modification])
      }
      setIsAdding(false)
      setOriginal('')
      setActual('')
      setReason('')
      setModType('substitution')
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(id: string) {
    setSaving(true)
    try {
      await deleteMenuModification(id, eventId)
      setMods(mods.filter((m) => m.id !== id))
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Menu Changes</CardTitle>
          {!isAdding && (
            <Button variant="secondary" size="sm" onClick={() => setIsAdding(true)}>
              Log Change
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {mods.length === 0 && !isAdding && (
          <p className="text-sm text-stone-500">No menu changes recorded. Log any differences between what was proposed and what was served.</p>
        )}

        {mods.length > 0 && (
          <div className="space-y-3 mb-4">
            {mods.map((m) => (
              <div key={m.id} className="flex items-start justify-between py-2 border-b border-stone-100 last:border-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-700 capitalize">
                      {m.modification_type.replace('_', ' ')}
                    </span>
                  </div>
                  {m.original_description && m.actual_description && (
                    <p className="text-sm text-stone-900 mt-1">{m.original_description} &rarr; {m.actual_description}</p>
                  )}
                  {m.original_description && !m.actual_description && (
                    <p className="text-sm text-stone-900 mt-1">{m.original_description} (not served)</p>
                  )}
                  {!m.original_description && m.actual_description && (
                    <p className="text-sm text-stone-900 mt-1">Added: {m.actual_description}</p>
                  )}
                  {m.reason && <p className="text-xs text-stone-500 mt-0.5">Reason: {m.reason}</p>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleRemove(m.id)} disabled={saving} className="text-red-600 hover:text-red-700">
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}

        {isAdding && (
          <div className="space-y-3 border rounded-lg p-4 bg-stone-50">
            <div>
              <label className="text-xs font-medium text-stone-600">Change Type</label>
              <Select
                options={[...MODIFICATION_TYPES]}
                value={modType}
                onChange={(e) => setModType(e.target.value)}
              />
            </div>
            {modType !== 'addition' && (
              <div>
                <label className="text-xs font-medium text-stone-600">Original (what was planned)</label>
                <Input placeholder="e.g., Cauliflower puree" value={original} onChange={(e) => setOriginal(e.target.value)} />
              </div>
            )}
            {modType !== 'removal' && (
              <div>
                <label className="text-xs font-medium text-stone-600">Actual (what was served)</label>
                <Input placeholder="e.g., Parsnip puree" value={actual} onChange={(e) => setActual(e.target.value)} />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-stone-600">Reason</label>
              <Input placeholder="Why the change?" value={reason} onChange={(e) => setReason(e.target.value)} />
              <div className="flex flex-wrap gap-1 mt-1">
                {COMMON_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className="text-xs px-2 py-0.5 rounded-full bg-stone-200 text-stone-600 hover:bg-stone-300"
                    onClick={() => setReason(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={saving || (!original && !actual)}>
                {saving ? 'Saving...' : 'Log Change'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

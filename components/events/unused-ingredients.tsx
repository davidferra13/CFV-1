'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { logUnusedIngredient, deleteUnusedIngredient } from '@/lib/expenses/unused'

const UNUSED_REASONS = [
  { value: 'leftover_reusable', label: 'Keeping for next dinner' },
  { value: 'wasted', label: 'Thrown away' },
  { value: 'returned', label: 'Returned to store' },
] as const

type UnusedItem = {
  id: string
  ingredient_name: string
  reason: string
  estimated_cost_cents: number | null
  notes: string | null
  transferred_to_event_id: string | null
  created_at: string
}

export function UnusedIngredients({
  eventId,
  initialItems,
}: {
  eventId: string
  initialItems: UnusedItem[]
}) {
  const [items, setItems] = useState(initialItems)
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [reason, setReason] = useState<string>('leftover_reusable')
  const [cost, setCost] = useState('')
  const [notes, setNotes] = useState('')

  async function handleAdd() {
    if (!name) return
    setSaving(true)
    try {
      const costCents = cost ? Math.round(parseFloat(cost) * 100) : null
      const result = await logUnusedIngredient({
        event_id: eventId,
        ingredient_name: name,
        reason: reason as any,
        estimated_cost_cents: costCents,
        notes: notes || null,
      })
      if (result.item) {
        setItems([...items, result.item])
      }
      setIsAdding(false)
      setName('')
      setCost('')
      setNotes('')
      setReason('leftover_reusable')
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(id: string) {
    setSaving(true)
    try {
      await deleteUnusedIngredient(id, eventId)
      setItems(items.filter((i) => i.id !== id))
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const reasonLabel = (r: string) => UNUSED_REASONS.find((x) => x.value === r)?.label ?? r

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Unused Ingredients</CardTitle>
          {!isAdding && (
            <Button variant="secondary" size="sm" onClick={() => setIsAdding(true)}>
              Log Unused
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 && !isAdding && (
          <p className="text-sm text-stone-500">Everything used? Great. If not, log leftovers here to track waste and transfers.</p>
        )}

        {items.length > 0 && (
          <div className="space-y-3 mb-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-start justify-between py-2 border-b border-stone-100 last:border-0">
                <div>
                  <span className="text-sm font-medium text-stone-900">{item.ingredient_name}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      item.reason === 'wasted' ? 'bg-red-100 text-red-700' :
                      item.reason === 'returned' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {reasonLabel(item.reason)}
                    </span>
                    {item.estimated_cost_cents && (
                      <span className="text-xs text-stone-500">~${(item.estimated_cost_cents / 100).toFixed(2)}</span>
                    )}
                  </div>
                  {item.notes && <p className="text-xs text-stone-500 mt-0.5">{item.notes}</p>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleRemove(item.id)} disabled={saving} className="text-red-600 hover:text-red-700">
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}

        {isAdding && (
          <div className="space-y-3 border rounded-lg p-4 bg-stone-50">
            <div>
              <label className="text-xs font-medium text-stone-600">Ingredient</label>
              <Input placeholder="e.g., Fresh basil, Heavy cream" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-stone-600">Disposition</label>
                <Select
                  options={[...UNUSED_REASONS]}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600">Est. Cost ($, optional)</label>
                <Input type="number" step="0.01" placeholder="0.00" value={cost} onChange={(e) => setCost(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600">Notes (optional)</label>
              <Input placeholder="e.g., Half a bunch remaining" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={saving || !name}>
                {saving ? 'Saving...' : 'Log Item'}
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

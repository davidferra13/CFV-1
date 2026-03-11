'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { logSubstitution, deleteSubstitution } from '@/lib/shopping/substitutions'

const SUBSTITUTION_REASONS = [
  { value: 'unavailable', label: 'Unavailable' },
  { value: 'price', label: 'Too expensive' },
  { value: 'quality', label: 'Poor quality' },
  { value: 'preference', label: 'Chef preference' },
  { value: 'forgot', label: 'Forgot to buy' },
  { value: 'other', label: 'Other' },
] as const

type SubstitutionItem = {
  id: string
  planned_ingredient: string
  actual_ingredient: string
  reason: string
  store_name: string | null
  notes: string | null
  created_at: string
}

export function ShoppingSubstitutions({
  eventId,
  initialItems,
}: {
  eventId: string
  initialItems: SubstitutionItem[]
}) {
  const [items, setItems] = useState(initialItems)
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [planned, setPlanned] = useState('')
  const [actual, setActual] = useState('')
  const [reason, setReason] = useState<string>('unavailable')
  const [store, setStore] = useState('')
  const [notes, setNotes] = useState('')

  async function handleAdd() {
    if (!planned || !actual) return
    setSaving(true)
    try {
      const result = await logSubstitution({
        event_id: eventId,
        planned_ingredient: planned,
        actual_ingredient: actual,
        reason: reason as any,
        store_name: store || null,
        notes: notes || null,
      })
      if (result.substitution) {
        setItems([...items, result.substitution])
      }
      setIsAdding(false)
      setPlanned('')
      setActual('')
      setStore('')
      setNotes('')
      setReason('unavailable')
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(id: string) {
    setSaving(true)
    try {
      await deleteSubstitution(id, eventId)
      setItems(items.filter((i) => i.id !== id))
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const reasonLabel = (r: string) => SUBSTITUTION_REASONS.find((x) => x.value === r)?.label ?? r

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Shopping Substitutions</CardTitle>
          {!isAdding && (
            <Button variant="secondary" size="sm" onClick={() => setIsAdding(true)}>
              Log Substitution
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 && !isAdding && (
          <p className="text-sm text-stone-500">
            No substitutions. Log any items you swapped while shopping.
          </p>
        )}

        {items.length > 0 && (
          <div className="space-y-3 mb-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between py-2 border-b border-stone-800 last:border-0"
              >
                <div>
                  <p className="text-sm text-stone-100">
                    <span className="line-through text-stone-500">{item.planned_ingredient}</span>{' '}
                    &rarr; <span className="font-medium">{item.actual_ingredient}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-800 text-stone-300">
                      {reasonLabel(item.reason)}
                    </span>
                    {item.store_name && (
                      <span className="text-xs text-stone-500">at {item.store_name}</span>
                    )}
                  </div>
                  {item.notes && <p className="text-xs text-stone-500 mt-0.5">{item.notes}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(item.id)}
                  disabled={saving}
                  className="text-red-600 hover:text-red-200"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}

        {isAdding && (
          <div className="space-y-3 border rounded-lg p-4 bg-stone-800">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-stone-400">Planned Item</label>
                <Input
                  placeholder="e.g., Fresh mint"
                  value={planned}
                  onChange={(e) => setPlanned(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-400">What You Got Instead</label>
                <Input
                  placeholder="e.g., Fresh basil"
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-stone-400">Reason</label>
                <Select
                  options={[...SUBSTITUTION_REASONS]}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-400">Store (optional)</label>
                <Input
                  placeholder="e.g., Grocery store"
                  value={store}
                  onChange={(e) => setStore(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-stone-400">Notes (optional)</label>
              <Input
                placeholder="Additional context"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={saving || !planned || !actual}>
                {saving ? 'Saving...' : 'Log Substitution'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAdding(false)}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

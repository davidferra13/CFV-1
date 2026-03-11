'use client'

// UnusedIngredients — Log and manage leftover/unused ingredients after an event.
// Extended to support storage location, use-by date, and expiry marking.

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  logUnusedIngredient,
  deleteUnusedIngredient,
  markIngredientExpired,
} from '@/lib/expenses/unused'
import { differenceInDays, parseISO } from 'date-fns'

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
  storage_location: string | null
  use_by_date: string | null
  expired: boolean
  created_at: string
}

function expiryStatus(useByDate: string | null): 'expired' | 'soon' | 'ok' | null {
  if (!useByDate) return null
  const daysLeft = differenceInDays(parseISO(useByDate), new Date())
  if (daysLeft < 0) return 'expired'
  if (daysLeft <= 3) return 'soon'
  return 'ok'
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
  const [storageLocation, setStorageLocation] = useState('')
  const [useByDate, setUseByDate] = useState('')

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
        storage_location: storageLocation || null,
        use_by_date: useByDate || null,
      })
      if (result.item) {
        setItems([...items, result.item as unknown as UnusedItem])
      }
      setIsAdding(false)
      setName('')
      setCost('')
      setNotes('')
      setReason('leftover_reusable')
      setStorageLocation('')
      setUseByDate('')
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

  async function handleMarkExpired(id: string) {
    setSaving(true)
    try {
      await markIngredientExpired(id, eventId)
      setItems(items.map((i) => (i.id === id ? { ...i, expired: true } : i)))
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
          <p className="text-sm text-stone-500">
            Everything used? Great. If not, log leftovers here to track waste and transfers.
          </p>
        )}

        {items.length > 0 && (
          <div className="space-y-3 mb-4">
            {items.map((item) => {
              const expiry =
                item.reason === 'leftover_reusable' && !item.expired
                  ? expiryStatus(item.use_by_date)
                  : null
              return (
                <div
                  key={item.id}
                  className={`flex items-start justify-between py-2 border-b border-stone-800 last:border-0 ${item.expired ? 'opacity-50' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-stone-100">
                      {item.ingredient_name}
                    </span>
                    {item.expired && (
                      <span className="ml-2 text-xs text-stone-400 italic">expired</span>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          item.reason === 'wasted'
                            ? 'bg-red-900 text-red-200'
                            : item.reason === 'returned'
                              ? 'bg-blue-900 text-blue-200'
                              : 'bg-green-900 text-green-200'
                        }`}
                      >
                        {reasonLabel(item.reason)}
                      </span>
                      {item.estimated_cost_cents && (
                        <span className="text-xs text-stone-500">
                          ~${(item.estimated_cost_cents / 100).toFixed(2)}
                        </span>
                      )}
                      {item.transferred_to_event_id && (
                        <span className="text-xs text-brand-600 font-medium">transferred</span>
                      )}
                      {expiry === 'expired' && (
                        <span className="text-xs text-red-600 font-medium">past use-by date</span>
                      )}
                      {expiry === 'soon' && (
                        <span className="text-xs text-amber-600 font-medium">use soon</span>
                      )}
                    </div>
                    {item.storage_location && (
                      <p className="text-xs text-stone-500 mt-0.5">
                        Stored: {item.storage_location}
                      </p>
                    )}
                    {item.use_by_date && (
                      <p className="text-xs text-stone-500 mt-0.5">Use by: {item.use_by_date}</p>
                    )}
                    {item.notes && <p className="text-xs text-stone-500 mt-0.5">{item.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    {item.reason === 'leftover_reusable' && !item.expired && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkExpired(item.id)}
                        disabled={saving}
                        className="text-amber-600 hover:text-amber-200 text-xs"
                      >
                        Mark Expired
                      </Button>
                    )}
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
                </div>
              )
            })}
          </div>
        )}

        {isAdding && (
          <div className="space-y-3 border rounded-lg p-4 bg-stone-800">
            <div>
              <label className="text-xs font-medium text-stone-400">Ingredient</label>
              <Input
                placeholder="e.g., Fresh basil, Heavy cream"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-stone-400">Disposition</label>
                <Select
                  options={[...UNUSED_REASONS]}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-400">
                  Est. Cost ($, optional)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
              </div>
            </div>
            {reason === 'leftover_reusable' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-stone-400">
                    Storage Location (optional)
                  </label>
                  <Input
                    placeholder="e.g., Home fridge top shelf"
                    value={storageLocation}
                    onChange={(e) => setStorageLocation(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-400">
                    Use By Date (optional)
                  </label>
                  <Input
                    type="date"
                    value={useByDate}
                    onChange={(e) => setUseByDate(e.target.value)}
                  />
                </div>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-stone-400">Notes (optional)</label>
              <Input
                placeholder="e.g., Half a bunch remaining"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={saving || !name}>
                {saving ? 'Saving...' : 'Log Item'}
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

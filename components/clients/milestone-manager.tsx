'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  updateClientMilestones,
  type Milestone,
  type MilestoneType,
} from '@/lib/clients/milestones'

const MILESTONE_TYPES: { value: MilestoneType; label: string }[] = [
  { value: 'birthday', label: 'Birthday' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'child_born', label: "Child's Birthday" },
  { value: 'booking_anniversary', label: 'Booking Anniversary' },
  { value: 'other', label: 'Other' },
]

export function MilestoneManager({
  clientId,
  initialMilestones,
}: {
  clientId: string
  initialMilestones: Milestone[]
}) {
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones)
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newType, setNewType] = useState<MilestoneType>('birthday')
  const [newLabel, setNewLabel] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newNotes, setNewNotes] = useState('')

  async function handleAdd() {
    if (!newLabel || !newDate) return
    const updated = [
      ...milestones,
      { type: newType, label: newLabel, date: newDate, notes: newNotes || undefined },
    ]
    setSaving(true)
    try {
      await updateClientMilestones(clientId, updated)
      setMilestones(updated)
      setIsAdding(false)
      setNewLabel('')
      setNewDate('')
      setNewNotes('')
      setNewType('birthday')
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(index: number) {
    const updated = milestones.filter((_, i) => i !== index)
    setSaving(true)
    try {
      await updateClientMilestones(clientId, updated)
      setMilestones(updated)
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
          <CardTitle className="text-lg">Milestones</CardTitle>
          {!isAdding && (
            <Button variant="secondary" size="sm" onClick={() => setIsAdding(true)}>
              Add Milestone
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {milestones.length === 0 && !isAdding && (
          <p className="text-sm text-stone-500">
            No milestones recorded yet. Add birthdays, anniversaries, and other key dates to get
            outreach reminders.
          </p>
        )}

        {milestones.length > 0 && (
          <div className="space-y-3 mb-4">
            {milestones.map((m, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-stone-800 last:border-0"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-800 text-stone-300 capitalize">
                      {m.type.replace('_', ' ')}
                    </span>
                    <span className="text-sm font-medium text-stone-100">{m.label}</span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    {new Date(m.date).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    {m.notes && ` - ${m.notes}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(i)}
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
                <label className="text-xs font-medium text-stone-400">Type</label>
                <Select
                  options={MILESTONE_TYPES}
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as MilestoneType)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-400">Date</label>
                <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-stone-400">Label</label>
              <Input
                placeholder="e.g., Mary's birthday, Wedding anniversary"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-400">Notes (optional)</label>
              <Input
                placeholder="e.g., Prefers chocolate cake"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={saving || !newLabel || !newDate}>
                {saving ? 'Saving...' : 'Add'}
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

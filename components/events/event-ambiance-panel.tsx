// Event Ambiance Panel
// Collapsible atmosphere section for event detail Ops tab.
// Editable at any event status. Zero footprint when empty and collapsed.

'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { updateEventAmbiance } from '@/lib/events/ambiance-actions'

type EventAmbiancePanelProps = {
  eventId: string
  initialNotes: string | null
}

export function EventAmbiancePanel({ eventId, initialNotes }: EventAmbiancePanelProps) {
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [isEditing, setIsEditing] = useState(false)
  const [isOpen, setIsOpen] = useState(!!initialNotes)
  const [isPending, startTransition] = useTransition()

  const hasContent = !!initialNotes

  function handleSave() {
    const previous = notes
    startTransition(async () => {
      try {
        const result = await updateEventAmbiance(eventId, {
          ambiance_notes: notes.trim() || null,
        })
        if (!result.success) {
          setNotes(previous)
          toast.error(result.error ?? 'Failed to save')
          return
        }
        toast.success('Atmosphere notes saved')
        setIsEditing(false)
      } catch {
        setNotes(previous)
        toast.error('Failed to save atmosphere notes')
      }
    })
  }

  function handleCancel() {
    setNotes(initialNotes ?? '')
    setIsEditing(false)
  }

  // Collapsed: show nothing if empty, show summary if populated
  if (!isOpen) {
    return (
      <Card className="p-4">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">Atmosphere</span>
            {hasContent && (
              <span className="text-xs text-stone-500 truncate max-w-[300px]">
                {initialNotes!.slice(0, 80)}
                {initialNotes!.length > 80 ? '...' : ''}
              </span>
            )}
            {!hasContent && <span className="text-xs text-stone-600">No notes yet</span>}
          </div>
          <span className="text-stone-500 text-sm">+</span>
        </button>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => {
            if (!isEditing) setIsOpen(false)
          }}
          className="flex items-center gap-2"
        >
          <h2 className="text-xl font-semibold">Atmosphere</h2>
          {!isEditing && <span className="text-stone-500 text-sm">&minus;</span>}
        </button>
        {!isEditing && (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            {hasContent ? 'Edit' : 'Add Notes'}
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Music: jazz playlist, low volume&#10;Lighting: dimmed, candles on table&#10;Table: white linen, fresh flowers&#10;Pace: relaxed, 20 min between courses&#10;Special: birthday cake presentation after dessert"
            rows={6}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} loading={isPending}>
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      ) : hasContent ? (
        <p className="text-sm text-stone-300 whitespace-pre-wrap">{initialNotes}</p>
      ) : (
        <p className="text-sm text-stone-600 italic">
          No atmosphere notes. Click &quot;Add Notes&quot; to plan music, lighting, table setting,
          and mood.
        </p>
      )}
    </Card>
  )
}

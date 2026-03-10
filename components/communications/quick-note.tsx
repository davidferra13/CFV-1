'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Phone, StickyNote, Users } from 'lucide-react'
import { type CommChannel, logCommunication } from '@/lib/communications/comm-log-actions'

interface QuickNoteProps {
  clientId: string
  onSaved?: () => void
}

const QUICK_CHANNELS: { value: CommChannel; label: string; icon: typeof Phone }[] = [
  { value: 'phone', label: 'Phone Call', icon: Phone },
  { value: 'note', label: 'Note', icon: StickyNote },
]

export function QuickNote({ clientId, onSaved }: QuickNoteProps) {
  const [channel, setChannel] = useState<CommChannel>('phone')
  const [subject, setSubject] = useState('')
  const [notes, setNotes] = useState('')
  const [duration, setDuration] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    if (!subject.trim()) {
      toast.error('Subject is required')
      return
    }

    startTransition(async () => {
      try {
        const result = await logCommunication({
          clientId,
          channel,
          direction: channel === 'phone' ? 'inbound' : 'internal',
          subject,
          content: notes || null,
          metadata: duration ? { durationMinutes: parseInt(duration, 10) } : null,
          loggedBy: 'manual',
        })

        if (!result.success) {
          toast.error(result.error ?? 'Failed to save note')
          return
        }

        toast.success('Note saved')
        setSubject('')
        setNotes('')
        setDuration('')
        onSaved?.()
      } catch {
        toast.error('Failed to save note')
      }
    })
  }

  return (
    <div className="space-y-3">
      {/* Channel tabs */}
      <div className="flex gap-1">
        {QUICK_CHANNELS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setChannel(value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
              channel === value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Subject */}
      <input
        type="text"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder={channel === 'phone' ? 'Call topic...' : 'Note title...'}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />

      {/* Notes */}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Details..."
        rows={2}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
      />

      {/* Duration (phone only) */}
      {channel === 'phone' && (
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Duration (min):</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            min={0}
            className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
          />
        </div>
      )}

      <Button variant="primary" onClick={handleSave} disabled={isPending} className="w-full">
        {isPending ? 'Saving...' : 'Save Note'}
      </Button>
    </div>
  )
}

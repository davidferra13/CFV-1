'use client'

// Shift Handoff Notes Section (Phase 2)
// Displays existing notes and provides a form to add new ones.
// Used on both the Morning Briefing page and the Daily Ops Command Center.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/lib/hooks/use-confirm'
import {
  createShiftNote,
  togglePinNote,
  deleteShiftNote,
  type ShiftNote,
} from '@/lib/shifts/actions'

type Props = {
  todayNotes: ShiftNote[]
  pinnedNotes: ShiftNote[]
  yesterdayClosingNotes: ShiftNote[]
  compact?: boolean // for embedding in daily ops
}

const SHIFT_LABELS: Record<string, string> = {
  opening: 'Opening',
  mid: 'Mid',
  closing: 'Closing',
}

const SHIFT_COLORS: Record<string, string> = {
  opening: 'bg-brand-950/30 border-brand-900/40 text-brand-400',
  mid: 'bg-amber-950/30 border-amber-900/40 text-amber-400',
  closing: 'bg-violet-950/30 border-violet-900/40 text-violet-400',
}

function formatNoteTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatNoteDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function NoteCard({ note, showDate = false }: { note: ShiftNote; showDate?: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { confirm, ConfirmDialog } = useConfirm()

  function handlePin() {
    startTransition(async () => {
      try {
        await togglePinNote(note.id)
        router.refresh()
      } catch (err) {
        toast.error('Failed to toggle pin')
      }
    })
  }

  async function handleDelete() {
    const ok = await confirm({
      title: 'Delete this shift note?',
      description: 'This handoff note will be permanently removed.',
      confirmLabel: 'Delete Note',
      variant: 'danger',
    })
    if (!ok) return
    startTransition(async () => {
      try {
        await deleteShiftNote(note.id)
        router.refresh()
      } catch (err) {
        toast.error('Failed to delete note')
      }
    })
  }

  return (
    <div
      className={`rounded-lg border px-3 py-2.5 ${SHIFT_COLORS[note.shift] ?? 'bg-stone-800/50 border-stone-700 text-stone-400'}`}
    >
      <ConfirmDialog />
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant="default" className="text-xxs">
              {SHIFT_LABELS[note.shift] ?? note.shift}
            </Badge>
            {note.pinned && (
              <Badge variant="warning" className="text-xxs">
                Pinned
              </Badge>
            )}
            <span className="text-xs-tight text-stone-500">
              {note.author_name} &middot;{' '}
              {showDate ? formatNoteDate(note.date) : formatNoteTime(note.created_at)}
            </span>
          </div>
          <p className="text-sm text-stone-200 whitespace-pre-wrap">{note.content}</p>
        </div>
        <div className="flex-shrink-0 flex gap-1">
          <button
            type="button"
            onClick={handlePin}
            disabled={isPending}
            className="text-xs-tight text-stone-500 hover:text-stone-300 px-1 disabled:opacity-40"
            title={note.pinned ? 'Unpin' : 'Pin'}
          >
            {note.pinned ? 'Unpin' : 'Pin'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="text-xs-tight text-red-500 hover:text-red-400 px-1 disabled:opacity-40"
          >
            Del
          </button>
        </div>
      </div>
    </div>
  )
}

export function ShiftNotesSection({
  todayNotes,
  pinnedNotes,
  yesterdayClosingNotes,
  compact,
}: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [shift, setShift] = useState<'opening' | 'mid' | 'closing'>(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'opening'
    if (hour < 17) return 'mid'
    return 'closing'
  })
  const [content, setContent] = useState('')
  const [isPending, startTransition] = useTransition()

  const hasAnyNotes =
    todayNotes.length > 0 || pinnedNotes.length > 0 || yesterdayClosingNotes.length > 0

  function handleSubmit() {
    if (!content.trim()) return
    startTransition(async () => {
      try {
        await createShiftNote({ shift, content })
        setContent('')
        setShowForm(false)
        router.refresh()
      } catch (err) {
        console.error('Failed to create note:', err)
      }
    })
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-stone-200`}>
          Shift Notes
          {hasAnyNotes && (
            <Badge variant="info" className="ml-2 text-xxs">
              {todayNotes.length + pinnedNotes.length + yesterdayClosingNotes.length}
            </Badge>
          )}
        </h2>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-xs text-brand-400 hover:text-brand-300"
          >
            + Add Note
          </button>
        )}
      </div>

      {/* Note creation form */}
      {showForm && (
        <Card className="mb-3">
          <CardContent className="pt-3 pb-3 space-y-3">
            <div className="flex gap-2">
              {(['opening', 'mid', 'closing'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setShift(s)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    shift === s
                      ? 'bg-brand-600 text-white'
                      : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                  }`}
                >
                  {SHIFT_LABELS[s]}
                </button>
              ))}
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What does the next shift need to know?"
              rows={3}
              className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSubmit} disabled={isPending || !content.trim()}>
                {isPending ? 'Posting...' : 'Post Note'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowForm(false)
                  setContent('')
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pinned notes (from previous days) */}
      {pinnedNotes.length > 0 && (
        <div className="space-y-2 mb-3">
          {pinnedNotes.map((note) => (
            <NoteCard key={note.id} note={note} showDate />
          ))}
        </div>
      )}

      {/* Yesterday's closing notes */}
      {yesterdayClosingNotes.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-stone-500 mb-2 uppercase tracking-wide font-medium">
            Yesterday's Closing Notes
          </p>
          <div className="space-y-2">
            {yesterdayClosingNotes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        </div>
      )}

      {/* Today's notes */}
      {todayNotes.length > 0 && (
        <div>
          {(pinnedNotes.length > 0 || yesterdayClosingNotes.length > 0) && (
            <p className="text-xs text-stone-500 mb-2 uppercase tracking-wide font-medium">Today</p>
          )}
          <div className="space-y-2">
            {todayNotes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasAnyNotes && !showForm && (
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-sm text-stone-500">No shift notes yet.</p>
            <p className="text-xs text-stone-600 mt-1">
              Add a note to communicate with the next shift.
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  )
}

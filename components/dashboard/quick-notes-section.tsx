'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { addQuickNote, triageQuickNote, deleteQuickNote } from '@/lib/quick-notes/actions'
import type { QuickNote } from '@/lib/quick-notes/actions'
import { toast } from 'sonner'
import {
  Plus,
  CheckCircle2,
  Calendar,
  ListChecks,
  MessageSquare,
  X,
  ChevronDown,
} from '@/components/ui/icons'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

type TriageAction = {
  label: string
  icon: React.ReactNode
  triaged_to: string
}

const triageActions: TriageAction[] = [
  { label: 'Convert to Task', icon: <ListChecks className="h-3.5 w-3.5" />, triaged_to: 'task' },
  {
    label: 'Add to Calendar',
    icon: <Calendar className="h-3.5 w-3.5" />,
    triaged_to: 'calendar',
  },
  {
    label: 'Link to Inquiry',
    icon: <MessageSquare className="h-3.5 w-3.5" />,
    triaged_to: 'inquiry',
  },
]

function NoteItem({
  note,
  onTriage,
  onDismiss,
  onDelete,
}: {
  note: QuickNote
  onTriage: (id: string, triaged_to: string) => void
  onDismiss: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  return (
    <div className="flex items-start gap-2 group py-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-2 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-stone-200 leading-snug">{note.text}</p>
      </div>
      <span className="text-xs text-stone-500 shrink-0 mt-0.5">{timeAgo(note.created_at)}</span>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setShowMenu(!showMenu)}
          title="Triage note"
          className="text-xs text-stone-500 hover:text-stone-300 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 px-1.5 py-0.5 rounded hover:bg-stone-800"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 z-20 bg-stone-800 border border-stone-700 rounded-lg shadow-xl py-1 w-44">
            {triageActions.map((action) => (
              <button
                type="button"
                key={action.triaged_to}
                onClick={() => {
                  onTriage(note.id, action.triaged_to)
                  setShowMenu(false)
                }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-stone-300 hover:bg-stone-700 hover:text-stone-100 transition-colors"
              >
                {action.icon}
                {action.label}
              </button>
            ))}
            <div className="border-t border-stone-700 my-1" />
            <button
              type="button"
              onClick={() => {
                onDismiss(note.id)
                setShowMenu(false)
              }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-stone-400 hover:bg-stone-700 hover:text-stone-200 transition-colors"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => {
                onDelete(note.id)
                setShowMenu(false)
              }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-400 hover:bg-red-950/50 hover:text-red-300 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function QuickNotesSection({ initialNotes }: { initialNotes: QuickNote[] }) {
  const [notes, setNotes] = useState(initialNotes)
  const [input, setInput] = useState('')
  const [isPending, startTransition] = useTransition()
  const [showAll, setShowAll] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const rawNotes = notes.filter((n) => n.status === 'raw')
  const visibleNotes = showAll ? rawNotes : rawNotes.slice(0, 5)
  const hasMore = rawNotes.length > 5

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return

    // Optimistic add
    const optimisticNote: QuickNote = {
      id: `temp-${Date.now()}`,
      text,
      status: 'raw',
      triaged_to: null,
      triaged_ref_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const previous = notes
    setNotes([optimisticNote, ...notes])
    setInput('')

    startTransition(async () => {
      try {
        const result = await addQuickNote(text)
        if (!result.success) {
          setNotes(previous)
          toast.error(result.error ?? 'Failed to save note')
        }
      } catch {
        setNotes(previous)
        toast.error('Failed to save note')
      }
    })
  }

  function handleTriage(id: string, triaged_to: string) {
    const previous = notes
    setNotes(notes.map((n) => (n.id === id ? { ...n, status: 'triaged' as const, triaged_to } : n)))

    startTransition(async () => {
      try {
        const result = await triageQuickNote(id, { status: 'triaged', triaged_to })
        if (!result.success) {
          setNotes(previous)
          toast.error(result.error ?? 'Failed to triage note')
        } else {
          toast.success(`Converted to ${triaged_to}`)
        }
      } catch {
        setNotes(previous)
        toast.error('Failed to triage note')
      }
    })
  }

  function handleDismiss(id: string) {
    const previous = notes
    setNotes(notes.map((n) => (n.id === id ? { ...n, status: 'dismissed' as const } : n)))

    startTransition(async () => {
      try {
        const result = await triageQuickNote(id, { status: 'dismissed' })
        if (!result.success) {
          setNotes(previous)
          toast.error(result.error ?? 'Failed to dismiss note')
        }
      } catch {
        setNotes(previous)
        toast.error('Failed to dismiss note')
      }
    })
  }

  function handleDelete(id: string) {
    const previous = notes
    setNotes(notes.filter((n) => n.id !== id))

    startTransition(async () => {
      try {
        const result = await deleteQuickNote(id)
        if (!result.success) {
          setNotes(previous)
          toast.error(result.error ?? 'Failed to delete note')
        }
      } catch {
        setNotes(previous)
        toast.error('Failed to delete note')
      }
    })
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="section-label">Quick Notes</div>
        {rawNotes.length > 0 && (
          <span className="text-xs text-stone-500">{rawNotes.length} notes</span>
        )}
      </div>

      <div className="rounded-2xl border border-stone-800 bg-stone-900/50 p-4">
        {/* Input */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a quick note..."
              className="w-full bg-stone-800/50 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-200 placeholder:text-stone-500 focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600/30 transition-all"
              disabled={isPending}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isPending}
            title="Add note"
            className="shrink-0 p-2 rounded-xl bg-brand-600 text-white hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Plus className="h-4 w-4" />
          </button>
        </form>

        {/* Notes list */}
        {rawNotes.length === 0 ? (
          <p className="text-sm text-stone-500 text-center py-3">
            No notes yet. Jot something down.
          </p>
        ) : (
          <div className="divide-y divide-stone-800/50">
            {visibleNotes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                onTriage={handleTriage}
                onDismiss={handleDismiss}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Show more */}
        {hasMore && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-brand-400 hover:text-brand-300 mt-2 transition-colors"
          >
            {showAll ? 'Show less' : `Show all ${rawNotes.length} notes`}
          </button>
        )}
      </div>
    </section>
  )
}

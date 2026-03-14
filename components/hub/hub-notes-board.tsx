'use client'

import { useState, useTransition } from 'react'
import type { HubPinnedNote, HubNoteColor } from '@/lib/hub/types'
import { createPinnedNote, deletePinnedNote } from '@/lib/hub/message-actions'

const NOTE_COLORS: Record<HubNoteColor, string> = {
  default: 'bg-stone-800 border-stone-700',
  yellow: 'bg-amber-900/30 border-amber-700/50',
  pink: 'bg-pink-900/30 border-pink-700/50',
  blue: 'bg-blue-900/30 border-blue-700/50',
  green: 'bg-emerald-900/30 border-emerald-700/50',
  purple: 'bg-purple-900/30 border-purple-700/50',
  orange: 'bg-orange-900/30 border-orange-700/50',
}

interface HubNotesBoardProps {
  groupId: string
  notes: HubPinnedNote[]
  profileToken: string | null
  canPost: boolean
}

export function HubNotesBoard({
  groupId,
  notes: initialNotes,
  profileToken,
  canPost,
}: HubNotesBoardProps) {
  const [notes, setNotes] = useState(initialNotes)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [color, setColor] = useState<HubNoteColor>('yellow')
  const [isPending, startTransition] = useTransition()

  const handleCreate = () => {
    if (!profileToken || !body.trim()) return

    startTransition(async () => {
      try {
        const note = await createPinnedNote({
          groupId,
          profileToken,
          title: title.trim() || null,
          body: body.trim(),
          color,
        })
        setNotes((prev) => [...prev, note])
        setTitle('')
        setBody('')
        setShowForm(false)
      } catch {
        // Error handled by toast in production
      }
    })
  }

  const handleDelete = (noteId: string) => {
    if (!profileToken) return

    startTransition(async () => {
      try {
        await deletePinnedNote({ noteId, profileToken })
        setNotes((prev) => prev.filter((n) => n.id !== noteId))
      } catch {
        // Ignore
      }
    })
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-300">📝 Notes Board</h3>
        {canPost && profileToken && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-full bg-stone-800 px-3 py-1 text-xs text-stone-400 hover:bg-stone-700 hover:text-stone-200"
          >
            {showForm ? 'Cancel' : '+ Add Note'}
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-4 rounded-xl border border-stone-700 bg-stone-800 p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="mb-2 w-full rounded bg-stone-900 px-3 py-1.5 text-sm text-stone-200 outline-none placeholder:text-stone-600"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your note..."
            rows={3}
            className="mb-2 w-full resize-none rounded bg-stone-900 px-3 py-2 text-sm text-stone-200 outline-none placeholder:text-stone-600"
          />
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {(Object.keys(NOTE_COLORS) as HubNoteColor[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-5 w-5 rounded-full border-2 ${
                    c === color ? 'border-white' : 'border-transparent'
                  } ${NOTE_COLORS[c]}`}
                  title={c}
                />
              ))}
            </div>
            <button
              onClick={handleCreate}
              disabled={!body.trim() || isPending}
              className="rounded-lg bg-[var(--hub-primary,#e88f47)] px-3 py-1 text-xs font-medium text-white disabled:opacity-30"
            >
              Post Note
            </button>
          </div>
        </div>
      )}

      {/* Notes grid */}
      {notes.length === 0 ? (
        <div className="py-8 text-center text-sm text-stone-600">
          No notes yet. Add one to share ideas with the group!
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`group relative rounded-xl border p-4 ${NOTE_COLORS[note.color]}`}
            >
              {note.title && (
                <h4 className="mb-1 text-sm font-semibold text-stone-200">{note.title}</h4>
              )}
              <p className="whitespace-pre-wrap text-sm text-stone-300">{note.body}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
                <span>{note.author?.display_name ?? 'Guest'}</span>
                <span>{new Date(note.created_at).toLocaleDateString()}</span>
              </div>

              {/* Delete button (on hover) */}
              {profileToken && (
                <button
                  onClick={() => handleDelete(note.id)}
                  className="absolute right-2 top-2 rounded p-1 text-xs text-stone-600 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                  title="Delete note"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

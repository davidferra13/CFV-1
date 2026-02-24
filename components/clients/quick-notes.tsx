'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { Pin, PinOff, Trash2, Edit3, Plus, StickyNote } from 'lucide-react'
import {
  addClientNote,
  updateClientNote,
  deleteClientNote,
  toggleNotePin,
} from '@/lib/notes/actions'
import type { ClientNote, NoteCategory } from '@/lib/notes/actions'
import { QuickNoteForm } from './quick-note-form'

const CATEGORY_STYLES: Record<NoteCategory, { bg: string; text: string; label: string }> = {
  general: { bg: 'bg-stone-800', text: 'text-stone-300', label: 'General' },
  dietary: { bg: 'bg-red-900', text: 'text-red-700', label: 'Dietary' },
  preference: { bg: 'bg-blue-900', text: 'text-blue-700', label: 'Preference' },
  logistics: { bg: 'bg-green-900', text: 'text-green-700', label: 'Logistics' },
  relationship: { bg: 'bg-purple-900', text: 'text-purple-700', label: 'Relationship' },
}

interface QuickNotesProps {
  clientId: string
  initialNotes: ClientNote[]
}

export function QuickNotes({ clientId, initialNotes }: QuickNotesProps) {
  const [notes, setNotes] = useState<ClientNote[]>(initialNotes)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleAdd = async (data: { note_text: string; category: NoteCategory }) => {
    startTransition(async () => {
      const result = await addClientNote({
        client_id: clientId,
        note_text: data.note_text,
        category: data.category,
      })
      setNotes((prev) => [result.note, ...prev])
      setShowForm(false)
    })
  }

  const handleUpdate = async (
    noteId: string,
    data: { note_text?: string; category?: NoteCategory }
  ) => {
    startTransition(async () => {
      const result = await updateClientNote(noteId, data)
      setNotes((prev) => prev.map((n) => (n.id === noteId ? result.note : n)))
      setEditingId(null)
    })
  }

  const handleDelete = async (noteId: string) => {
    startTransition(async () => {
      await deleteClientNote(noteId)
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
    })
  }

  const handleTogglePin = async (noteId: string) => {
    startTransition(async () => {
      const result = await toggleNotePin(noteId)
      setNotes((prev) => {
        const updated = prev.map((n) => (n.id === noteId ? { ...n, pinned: result.pinned } : n))
        // Re-sort: pinned first, then by created_at desc
        return updated.sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
      })
    })
  }

  const pinnedCount = notes.filter((n) => n.pinned).length

  return (
    <div className="border border-stone-700 rounded-xl bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-stone-500" />
          <h3 className="font-semibold text-stone-100">Notes</h3>
          <span className="text-xs text-stone-400">
            {notes.length} note{notes.length !== 1 ? 's' : ''}
            {pinnedCount > 0 && ` (${pinnedCount} pinned)`}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-400 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Note
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="px-5 py-3 border-b border-stone-800 bg-stone-800">
          <QuickNoteForm
            onSubmit={handleAdd}
            onCancel={() => setShowForm(false)}
            submitting={isPending}
          />
        </div>
      )}

      {/* Notes list */}
      <div className="divide-y divide-stone-50">
        {notes.length === 0 && !showForm && (
          <div className="px-5 py-8 text-center text-sm text-stone-400">
            No notes yet. Click &quot;Add Note&quot; to start.
          </div>
        )}

        {notes.map((note) => (
          <div key={note.id} className="px-5 py-3 hover:bg-stone-25 group">
            {editingId === note.id ? (
              <QuickNoteForm
                initialData={{ note_text: note.note_text, category: note.category }}
                onSubmit={(data) => handleUpdate(note.id, data)}
                onCancel={() => setEditingId(null)}
                submitting={isPending}
              />
            ) : (
              <div className="flex items-start gap-3">
                {/* Category badge */}
                <span
                  className={`flex-shrink-0 mt-0.5 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${CATEGORY_STYLES[note.category].bg} ${CATEGORY_STYLES[note.category].text}`}
                >
                  {CATEGORY_STYLES[note.category].label}
                </span>

                {/* Note content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-200 whitespace-pre-wrap">{note.note_text}</p>
                  <p className="text-[10px] text-stone-400 mt-1">
                    {new Date(note.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    {note.source === 'ai_insight' && (
                      <span className="ml-1.5 text-amber-500">Suggested</span>
                    )}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => handleTogglePin(note.id)}
                    className="p-1 text-stone-400 hover:text-stone-400 transition-colors"
                    title={note.pinned ? 'Unpin' : 'Pin'}
                  >
                    {note.pinned ? (
                      <PinOff className="w-3.5 h-3.5" />
                    ) : (
                      <Pin className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(note.id)}
                    className="p-1 text-stone-400 hover:text-stone-400 transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(note.id)}
                    className="p-1 text-stone-400 hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

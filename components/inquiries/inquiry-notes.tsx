'use client'

import { useState, useTransition } from 'react'
import { Pin, PinOff, Trash2, Edit3, Plus, StickyNote, ExternalLink } from '@/components/ui/icons'
import {
  addInquiryNote,
  updateInquiryNote,
  deleteInquiryNote,
  toggleInquiryNotePinned,
} from '@/lib/inquiries/note-actions'
import type { InquiryNote, InquiryNoteCategory } from '@/lib/inquiries/note-actions'
import { InquiryNoteForm } from './inquiry-note-form'
import { toast } from 'sonner'

// ============================================================
// Category styles + filter tabs
// ============================================================

const CATEGORY_META: Record<InquiryNoteCategory, { bg: string; text: string; label: string }> = {
  general: { bg: 'bg-stone-800', text: 'text-stone-300', label: 'General' },
  inspiration: { bg: 'bg-pink-900', text: 'text-pink-200', label: 'Inspiration' },
  menu_planning: { bg: 'bg-amber-900', text: 'text-amber-200', label: 'Menu Planning' },
  sourcing: { bg: 'bg-green-900', text: 'text-green-200', label: 'Sourcing' },
  logistics: { bg: 'bg-blue-900', text: 'text-blue-200', label: 'Logistics' },
  staffing: { bg: 'bg-purple-900', text: 'text-purple-200', label: 'Staffing' },
  post_event: { bg: 'bg-teal-900', text: 'text-teal-200', label: 'Post-Event' },
}

const ALL_CATEGORIES = Object.keys(CATEGORY_META) as InquiryNoteCategory[]

// ============================================================
// Props
// ============================================================

interface InquiryNotesProps {
  inquiryId: string
  initialNotes: InquiryNote[]
}

// ============================================================
// Component
// ============================================================

export function InquiryNotes({ inquiryId, initialNotes }: InquiryNotesProps) {
  const [notes, setNotes] = useState<InquiryNote[]>(initialNotes)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<InquiryNoteCategory | 'all'>('all')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // ---- Derived ----
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const visibleNotes =
    activeFilter === 'all' ? sortedNotes : sortedNotes.filter((n) => n.category === activeFilter)

  const pinnedCount = notes.filter((n) => n.pinned).length

  // ---- Handlers ----
  const handleAdd = async (data: {
    note_text: string
    category: InquiryNoteCategory
    attachment_url: string | null
    attachment_filename: string | null
  }) => {
    startTransition(async () => {
      try {
        const result = await addInquiryNote({
          inquiry_id: inquiryId,
          ...data,
        })
        setNotes((prev) => [result.note, ...prev])
        setShowForm(false)
      } catch (err) {
        toast.error('Failed to add note')
      }
    })
  }

  const handleUpdate = async (
    noteId: string,
    data: {
      note_text: string
      category: InquiryNoteCategory
      attachment_url: string | null
      attachment_filename: string | null
    }
  ) => {
    startTransition(async () => {
      try {
        const result = await updateInquiryNote(noteId, data)
        setNotes((prev) => prev.map((n) => (n.id === noteId ? result.note : n)))
        setEditingId(null)
      } catch (err) {
        toast.error('Failed to update note')
      }
    })
  }

  const handleDelete = async (noteId: string) => {
    startTransition(async () => {
      try {
        await deleteInquiryNote(noteId)
        setNotes((prev) => prev.filter((n) => n.id !== noteId))
      } catch (err) {
        toast.error('Failed to delete note')
      }
    })
  }

  const handleTogglePin = async (noteId: string) => {
    startTransition(async () => {
      try {
        const result = await toggleInquiryNotePinned(noteId)
        setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, pinned: result.pinned } : n)))
      } catch (err) {
        toast.error('Failed to toggle pin')
      }
    })
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <>
      <div className="border border-stone-700 rounded-xl bg-stone-900">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-stone-500" />
            <h3 className="font-semibold text-stone-100">Notes</h3>
            <span className="text-xs text-stone-400">
              {notes.length} note{notes.length !== 1 ? 's' : ''}
              {pinnedCount > 0 && ` · ${pinnedCount} pinned`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowForm(!showForm)
              setEditingId(null)
            }}
            className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-400 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Note
          </button>
        </div>

        {/* Category filter tabs */}
        {notes.length > 0 && (
          <div className="flex gap-1 px-5 py-2 border-b border-stone-800 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                activeFilter === 'all'
                  ? 'bg-stone-800 text-white'
                  : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
              }`}
            >
              All ({notes.length})
            </button>
            {ALL_CATEGORIES.filter((cat) => notes.some((n) => n.category === cat)).map((cat) => {
              const meta = CATEGORY_META[cat]
              const count = notes.filter((n) => n.category === cat).length
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveFilter(cat)}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                    activeFilter === cat
                      ? `${meta.bg} ${meta.text} ring-1 ring-current`
                      : 'bg-stone-800 text-stone-500 hover:bg-stone-700'
                  }`}
                >
                  {meta.label} ({count})
                </button>
              )
            })}
          </div>
        )}

        {/* Add form */}
        {showForm && (
          <div className="px-5 py-3 border-b border-stone-800 bg-stone-800">
            <InquiryNoteForm
              inquiryId={inquiryId}
              onSubmit={handleAdd}
              onCancel={() => setShowForm(false)}
              submitting={isPending}
            />
          </div>
        )}

        {/* Notes list */}
        <div className="divide-y divide-stone-50">
          {visibleNotes.length === 0 && !showForm && (
            <div className="px-5 py-8 text-center text-sm text-stone-400">
              {activeFilter === 'all'
                ? 'No notes yet. Click "Add Note" to start.'
                : `No ${CATEGORY_META[activeFilter].label.toLowerCase()} notes yet.`}
            </div>
          )}

          {visibleNotes.map((note) => (
            <div key={note.id} className="px-5 py-3 hover:bg-stone-25 group">
              {editingId === note.id ? (
                <InquiryNoteForm
                  inquiryId={inquiryId}
                  initialData={{
                    note_text: note.note_text,
                    category: note.category,
                    attachment_url: note.attachment_url,
                    attachment_filename: note.attachment_filename,
                  }}
                  onSubmit={(data) => handleUpdate(note.id, data)}
                  onCancel={() => setEditingId(null)}
                  submitting={isPending}
                />
              ) : (
                <div className="flex items-start gap-3">
                  {/* Category badge */}
                  <span
                    className={`flex-shrink-0 mt-0.5 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${CATEGORY_META[note.category].bg} ${CATEGORY_META[note.category].text}`}
                  >
                    {CATEGORY_META[note.category].label}
                  </span>

                  {/* Note content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-200 whitespace-pre-wrap">{note.note_text}</p>

                    {/* Attachment image */}
                    {note.attachment_url && (
                      <button
                        type="button"
                        onClick={() => setLightboxUrl(note.attachment_url)}
                        className="mt-2 block"
                        title="View full size"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={note.attachment_url}
                          alt={note.attachment_filename || 'Attachment'}
                          className="h-24 w-auto rounded-lg object-cover border border-stone-700 hover:opacity-90 transition-opacity"
                        />
                      </button>
                    )}

                    <p className="text-[10px] text-stone-400 mt-1">
                      {new Date(note.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      {note.pinned && <span className="ml-1.5 text-brand-500">Pinned</span>}
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
                    {note.attachment_url && (
                      <a
                        href={note.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-stone-400 hover:text-stone-400 transition-colors"
                        title="Open image in new tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(note.id)
                        setShowForm(false)
                      }}
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

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightboxUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="Full size"
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl font-light"
          >
            ✕
          </button>
        </div>
      )}
    </>
  )
}

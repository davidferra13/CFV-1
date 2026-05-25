'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  StickyNote,
  Plus,
  Pin,
  PinOff,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Filter,
} from '@/components/ui/icons'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { EmptyState } from '@/components/ui/empty-state'
import {
  addClientChefNote,
  updateClientChefNote,
  deleteClientChefNote,
  toggleClientChefNotePin,
  toggleClientChefNoteSharing,
} from '@/lib/notes/client-chef-note-actions'

type ClientChefNoteCategory = 'general' | 'service_quality' | 'food' | 'communication' | 'logistics'

interface ClientChefNote {
  id: string
  client_id: string
  chef_id: string
  note_text: string
  category: ClientChefNoteCategory
  pinned: boolean
  shared_with_chef: boolean
  created_at: string
  updated_at: string
}

const CATEGORIES: { value: ClientChefNoteCategory; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'service_quality', label: 'Service Quality' },
  { value: 'food', label: 'Food' },
  { value: 'communication', label: 'Communication' },
  { value: 'logistics', label: 'Logistics' },
]

const CATEGORY_BADGE_VARIANT: Record<
  ClientChefNoteCategory,
  'default' | 'success' | 'warning' | 'error' | 'info'
> = {
  general: 'default',
  service_quality: 'info',
  food: 'success',
  communication: 'warning',
  logistics: 'default',
}

function categoryLabel(cat: ClientChefNoteCategory): string {
  return CATEGORIES.find((c) => c.value === cat)?.label ?? cat
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ChefNotesPanel({
  chefId,
  initialNotes,
}: {
  chefId: string
  initialNotes: ClientChefNote[]
}) {
  const [showForm, setShowForm] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [category, setCategory] = useState<ClientChefNoteCategory>('general')
  const [filterCategory, setFilterCategory] = useState<ClientChefNoteCategory | 'all'>('all')
  const [editingNote, setEditingNote] = useState<ClientChefNote | null>(null)
  const [editText, setEditText] = useState('')
  const [editCategory, setEditCategory] = useState<ClientChefNoteCategory>('general')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [confirmShare, setConfirmShare] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const refresh = useCallback(() => router.refresh(), [router])

  // Sort: pinned first, then newest
  const sortedNotes = [...initialNotes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const filteredNotes =
    filterCategory === 'all'
      ? sortedNotes
      : sortedNotes.filter((n) => n.category === filterCategory)

  function handleAdd() {
    if (!noteText.trim()) {
      toast.error('Note cannot be empty')
      return
    }
    startTransition(async () => {
      try {
        await addClientChefNote({ chef_id: chefId, note_text: noteText.trim(), category })
        toast.success('Note added')
        setNoteText('')
        setCategory('general')
        setShowForm(false)
        refresh()
      } catch (err: any) {
        toast.error(err.message || 'Failed to add note')
      }
    })
  }

  function handleUpdate() {
    if (!editingNote || !editText.trim()) {
      toast.error('Note cannot be empty')
      return
    }
    startTransition(async () => {
      try {
        await updateClientChefNote(editingNote.id, {
          note_text: editText.trim(),
          category: editCategory,
        })
        toast.success('Note updated')
        setEditingNote(null)
        refresh()
      } catch (err: any) {
        toast.error(err.message || 'Failed to update note')
      }
    })
  }

  function handleDelete(noteId: string) {
    startTransition(async () => {
      try {
        await deleteClientChefNote(noteId)
        toast.success('Note deleted')
        setConfirmDelete(null)
        refresh()
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete note')
      }
    })
  }

  function handleTogglePin(noteId: string) {
    startTransition(async () => {
      try {
        await toggleClientChefNotePin(noteId)
        refresh()
      } catch (err: any) {
        toast.error(err.message || 'Failed to update pin')
      }
    })
  }

  function handleToggleShare(noteId: string) {
    startTransition(async () => {
      try {
        await toggleClientChefNoteSharing(noteId)
        toast.success('Sharing preference updated')
        setConfirmShare(null)
        refresh()
      } catch (err: any) {
        toast.error(err.message || 'Failed to update sharing')
      }
    })
  }

  function startEdit(note: ClientChefNote) {
    setEditingNote(note)
    setEditText(note.note_text)
    setEditCategory(note.category)
  }

  const shareTarget = confirmShare ? initialNotes.find((n) => n.id === confirmShare) : null

  return (
    <div className="space-y-4">
      {/* Toolbar: Add + Filter */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-stone-500" />
          <Select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as ClientChefNoteCategory | 'all')}
            className="w-44"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" />
            Add Note
          </Button>
        )}
      </div>

      {/* Add Note Form */}
      {showForm && (
        <Card variant="highlight">
          <CardHeader>
            <CardTitle as="h3">New Note</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
              maxLength={2000}
              showCount
              placeholder="Write your note about your chef here..."
            />
            <div>
              <label className="text-xs text-stone-500 block mb-1">Category</label>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value as ClientChefNoteCategory)}
                className="w-52"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-center gap-3 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowForm(false)
                  setNoteText('')
                  setCategory('general')
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAdd}
                loading={isPending}
                disabled={isPending || !noteText.trim()}
              >
                Save Note
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes List */}
      {filteredNotes.length === 0 && !showForm ? (
        <EmptyState
          remy="pondering"
          title="No notes yet"
          description="Add private notes about your chef to keep track of your experience."
          action={{
            label: 'Add Your First Note',
            onClick: () => setShowForm(true),
          }}
        />
      ) : (
        <div className="space-y-3">
          {filteredNotes.map((note) => (
            <Card key={note.id} className={note.pinned ? 'border-amber-600/30' : ''}>
              <CardContent className="pt-4 space-y-2">
                {/* Editing mode */}
                {editingNote?.id === note.id ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      maxLength={2000}
                      showCount
                    />
                    <div>
                      <label className="text-xs text-stone-500 block mb-1">Category</label>
                      <Select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value as ClientChefNoteCategory)}
                        className="w-52"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="flex items-center gap-3 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setEditingNote(null)}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleUpdate}
                        loading={isPending}
                        disabled={isPending || !editText.trim()}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Note header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={CATEGORY_BADGE_VARIANT[note.category]}>
                          {categoryLabel(note.category)}
                        </Badge>
                        {note.pinned && (
                          <Pin className="w-3.5 h-3.5 text-amber-400" weight="fill" />
                        )}
                        {note.shared_with_chef && (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                            <Eye className="w-3 h-3" />
                            Shared
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-stone-500 whitespace-nowrap">
                        {formatDate(note.updated_at)}
                      </span>
                    </div>

                    {/* Note body */}
                    <p className="text-sm text-stone-200 whitespace-pre-wrap">{note.note_text}</p>

                    {/* Actions */}
                    <div className="flex items-center gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() => startEdit(note)}
                        className="p-1.5 rounded-md text-stone-500 hover:text-stone-200 hover:bg-stone-800 transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTogglePin(note.id)}
                        disabled={isPending}
                        className="p-1.5 rounded-md text-stone-500 hover:text-amber-400 hover:bg-stone-800 transition-colors"
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
                        onClick={() => {
                          if (note.shared_with_chef) {
                            handleToggleShare(note.id)
                          } else {
                            setConfirmShare(note.id)
                          }
                        }}
                        disabled={isPending}
                        className={`p-1.5 rounded-md hover:bg-stone-800 transition-colors ${
                          note.shared_with_chef
                            ? 'text-emerald-400 hover:text-stone-300'
                            : 'text-stone-500 hover:text-emerald-400'
                        }`}
                        title={note.shared_with_chef ? 'Stop sharing' : 'Share with chef'}
                      >
                        {note.shared_with_chef ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(note.id)}
                        className="p-1.5 rounded-md text-stone-500 hover:text-red-400 hover:bg-stone-800 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmModal
        open={confirmDelete !== null}
        title="Delete this note?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={isPending}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Share confirmation */}
      <ConfirmModal
        open={confirmShare !== null}
        title="Share with your chef?"
        description={
          shareTarget
            ? 'Your chef will be able to see this note. You can stop sharing at any time.'
            : ''
        }
        confirmLabel="Share"
        loading={isPending}
        onConfirm={() => confirmShare && handleToggleShare(confirmShare)}
        onCancel={() => setConfirmShare(null)}
      />
    </div>
  )
}

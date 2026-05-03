'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import {
  BookOpen,
  Bookmark,
  Check,
  Download,
  Edit2,
  Link2,
  Lock,
  Pin,
  Plus,
  Search,
  Trash2,
  Unlock,
  X,
} from '@/components/ui/icons'
import {
  addChefNote,
  deleteChefNote,
  updateChefNote,
  getChefNotes,
  pinChefNote,
  setChefNoteReview,
  shareChefNote,
  exportNotesAsMarkdown,
} from '@/lib/chef/knowledge/note-actions'
import type { ChefNote, ChefNoteType } from '@/lib/chef/knowledge/note-types'
import type { ChefTipCategory } from '@/lib/chef/knowledge/tip-types'
import { KnowledgeLinkPicker } from '@/components/knowledge/knowledge-link-picker'
import { toast } from 'sonner'

const PAGE_SIZE = 20

type Props = {
  initialNotes: ChefNote[]
  initialTotal: number
  categories: { value: ChefTipCategory; label: string }[]
  topTags: { tag: string; count: number }[]
}

export function ChefNotesArchive({ initialNotes, initialTotal, categories, topTags }: Props) {
  const [notes, setNotes] = useState(initialNotes)
  const [total, setTotal] = useState(initialTotal)
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<ChefNoteType | ''>('')
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // New note form state
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')
  const [newType, setNewType] = useState<ChefNoteType>('journal')
  const [newTags, setNewTags] = useState<string[]>([])

  // Edit form state
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editType, setEditType] = useState<ChefNoteType>('journal')
  const [editTags, setEditTags] = useState<string[]>([])

  function doSearch(searchVal?: string, tagVal?: string, typeVal?: string) {
    startTransition(async () => {
      const result = await getChefNotes({
        search: (searchVal ?? search) || undefined,
        tag: (tagVal ?? tagFilter) || undefined,
        note_type: ((typeVal ?? typeFilter) as ChefNoteType) || undefined,
        limit: PAGE_SIZE,
      })
      setNotes(result.notes)
      setTotal(result.total)
    })
  }

  function handleLoadMore() {
    setIsLoadingMore(true)
    startTransition(async () => {
      const result = await getChefNotes({
        search: search || undefined,
        tag: tagFilter || undefined,
        note_type: typeFilter || undefined,
        limit: PAGE_SIZE,
        offset: notes.length,
      })
      setNotes((prev) => [...prev, ...result.notes])
      setTotal(result.total)
      setIsLoadingMore(false)
    })
  }

  function handleAdd() {
    const trimmedTitle = newTitle.trim()
    const trimmedBody = newBody.trim()
    if (!trimmedTitle || !trimmedBody) return

    startTransition(async () => {
      try {
        const result = await addChefNote(trimmedTitle, trimmedBody, newType, newTags)
        if (result.success) {
          setNotes((prev) => [
            {
              id: result.id!,
              chef_id: '',
              title: trimmedTitle,
              body: trimmedBody,
              note_type: newType,
              tags: newTags,
              shared: false,
              pinned: false,
              review: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            ...prev,
          ])
          setTotal((prev) => prev + 1)
          setNewTitle('')
          setNewBody('')
          setNewType('journal')
          setNewTags([])
          setShowAdd(false)
          toast.success('Note saved')
        } else {
          toast.error(result.error || 'Failed to save')
        }
      } catch {
        toast.error('Failed to save note')
      }
    })
  }

  function startEdit(note: ChefNote) {
    setEditingId(note.id)
    setEditTitle(note.title)
    setEditBody(note.body)
    setEditType(note.note_type)
    setEditTags([...note.tags])
  }

  function handleUpdate() {
    if (!editingId) return
    const trimmedTitle = editTitle.trim()
    const trimmedBody = editBody.trim()
    if (!trimmedTitle || !trimmedBody) return

    startTransition(async () => {
      try {
        const result = await updateChefNote(editingId, {
          title: trimmedTitle,
          body: trimmedBody,
          note_type: editType,
          tags: editTags,
        })
        if (result.success) {
          setNotes((prev) =>
            prev.map((n) =>
              n.id === editingId
                ? {
                    ...n,
                    title: trimmedTitle,
                    body: trimmedBody,
                    note_type: editType,
                    tags: editTags,
                    updated_at: new Date().toISOString(),
                  }
                : n
            )
          )
          setEditingId(null)
          toast.success('Note updated')
        } else {
          toast.error(result.error || 'Failed to update')
        }
      } catch {
        toast.error('Failed to update note')
      }
    })
  }

  function handleDelete(id: string) {
    if (confirmDelete !== id) {
      setConfirmDelete(id)
      return
    }
    setConfirmDelete(null)
    startTransition(async () => {
      try {
        const result = await deleteChefNote(id)
        if (result.success) {
          setNotes((prev) => prev.filter((n) => n.id !== id))
          setTotal((prev) => prev - 1)
          toast.success('Note removed')
        } else {
          toast.error(result.error || 'Failed to delete')
        }
      } catch {
        toast.error('Failed to delete note')
      }
    })
  }

  function handleTogglePin(note: ChefNote) {
    const newPinned = !note.pinned
    setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, pinned: newPinned } : n)))
    startTransition(async () => {
      try {
        const result = await pinChefNote(note.id, newPinned)
        if (!result.success) {
          setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, pinned: !newPinned } : n)))
          toast.error(result.error || 'Failed to update pin')
        }
      } catch {
        setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, pinned: !newPinned } : n)))
        toast.error('Failed to update pin')
      }
    })
  }

  function handleToggleReview(note: ChefNote) {
    const newReview = !note.review
    setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, review: newReview } : n)))
    startTransition(async () => {
      try {
        const result = await setChefNoteReview(note.id, newReview)
        if (!result.success) {
          setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, review: !newReview } : n)))
          toast.error(result.error || 'Failed to update review')
        }
      } catch {
        setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, review: !newReview } : n)))
        toast.error('Failed to update review')
      }
    })
  }

  function handleToggleShare(note: ChefNote) {
    const newShared = !note.shared
    setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, shared: newShared } : n)))
    startTransition(async () => {
      try {
        const result = await shareChefNote(note.id, newShared)
        if (!result.success) {
          setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, shared: !newShared } : n)))
          toast.error(result.error || 'Failed to update sharing')
        } else {
          toast.success(newShared ? 'Note shared' : 'Note set to private')
        }
      } catch {
        setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, shared: !newShared } : n)))
        toast.error('Failed to update sharing')
      }
    })
  }

  function handleExport() {
    startTransition(async () => {
      try {
        const md = await exportNotesAsMarkdown()
        const blob = new Blob([md], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `chefnotes-${new Date().toISOString().split('T')[0]}.md`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Notes exported')
      } catch {
        toast.error('Export failed')
      }
    })
  }

  const hasMore = total > notes.length

  return (
    <div className="space-y-6">
      {/* Top tags quick filter */}
      {topTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {topTags.map((t) => (
            <button
              key={t.tag}
              type="button"
              onClick={() => {
                setTagFilter(t.tag)
                doSearch(search, t.tag, typeFilter)
              }}
              className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                tagFilter === t.tag
                  ? 'bg-amber-700 text-amber-100'
                  : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-300'
              }`}
            >
              {t.tag}
              <span className="ml-1 text-stone-600">{t.count}</span>
            </button>
          ))}
          {tagFilter && (
            <button
              type="button"
              onClick={() => {
                setTagFilter('')
                doSearch(search, '', typeFilter)
              }}
              className="rounded-full px-2 py-1 text-xs text-stone-500 hover:text-stone-400"
            >
              <X className="h-3 w-3 inline" /> Clear
            </button>
          )}
        </div>
      )}

      {/* Search + filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
            placeholder="Search notes..."
            className="w-full rounded-md border border-stone-700 bg-stone-800 py-2 pl-9 pr-3 text-sm text-stone-200 placeholder:text-stone-600 focus:border-amber-700 focus:outline-none"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value as ChefNoteType | '')
            doSearch(search, tagFilter, e.target.value)
          }}
          className="rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-400 focus:outline-none"
        >
          <option value="">All types</option>
          <option value="journal">Journal</option>
          <option value="reference">Reference</option>
        </select>
        <select
          value={tagFilter}
          onChange={(e) => {
            setTagFilter(e.target.value)
            doSearch(search, e.target.value, typeFilter)
          }}
          className="rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-400 focus:outline-none"
        >
          <option value="">All categories</option>
          {categories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={handleExport}
            disabled={isPending || total === 0}
            className="rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-400 hover:bg-stone-700 disabled:opacity-40"
            title="Export as Markdown"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="rounded-md bg-amber-700 px-3 py-2 text-sm font-medium text-amber-100 hover:bg-amber-600"
            title="Add note"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Add new note form */}
      {showAdd && (
        <NoteForm
          title={newTitle}
          body={newBody}
          noteType={newType}
          tags={newTags}
          categories={categories}
          onTitleChange={setNewTitle}
          onBodyChange={setNewBody}
          onTypeChange={setNewType}
          onTagsChange={setNewTags}
          onSave={handleAdd}
          onCancel={() => {
            setShowAdd(false)
            setNewTitle('')
            setNewBody('')
            setNewType('journal')
            setNewTags([])
          }}
          isPending={isPending}
          saveLabel="Save Note"
        />
      )}

      {/* Notes list */}
      {notes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-700 p-8 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-stone-600" />
          <p className="mt-2 text-sm text-stone-400">
            {search || tagFilter || typeFilter ? 'No notes match your search.' : 'No notes yet.'}
          </p>
          <p className="text-xs text-stone-600 mt-1">
            {search || tagFilter || typeFilter
              ? 'Try a different search or clear filters.'
              : 'Start documenting your knowledge.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="group rounded-lg border border-stone-700/50 bg-stone-800/40 p-4"
            >
              {editingId === note.id ? (
                <NoteForm
                  title={editTitle}
                  body={editBody}
                  noteType={editType}
                  tags={editTags}
                  categories={categories}
                  onTitleChange={setEditTitle}
                  onBodyChange={setEditBody}
                  onTypeChange={setEditType}
                  onTagsChange={setEditTags}
                  onSave={handleUpdate}
                  onCancel={() => setEditingId(null)}
                  isPending={isPending}
                  saveLabel="Update"
                />
              ) : (
                <>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-medium text-stone-200 truncate">
                          {note.title}
                        </h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            note.note_type === 'reference'
                              ? 'bg-blue-900/40 text-blue-400'
                              : 'bg-stone-700/50 text-stone-400'
                          }`}
                        >
                          {note.note_type === 'reference' ? 'Reference' : 'Journal'}
                        </span>
                        {note.pinned && <Pin className="h-3 w-3 text-amber-500 shrink-0" />}
                        {note.shared && <Unlock className="h-3 w-3 text-green-500 shrink-0" />}
                      </div>
                      <p className="mt-1 text-xs text-stone-500 line-clamp-2">
                        {note.body.length > 200 ? note.body.slice(0, 200) + '...' : note.body}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleTogglePin(note)}
                        className={`rounded p-1.5 transition-colors ${
                          note.pinned ? 'text-amber-400' : 'text-stone-600 hover:text-amber-400'
                        }`}
                        title={note.pinned ? 'Unpin' : 'Pin for quick access'}
                      >
                        <Pin className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleReview(note)}
                        className={`rounded p-1.5 transition-colors ${
                          note.review ? 'text-blue-400' : 'text-stone-600 hover:text-blue-400'
                        }`}
                        title={note.review ? 'Remove from review queue' : 'Add to review queue'}
                      >
                        <Bookmark className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleShare(note)}
                        className={`rounded p-1.5 transition-colors ${
                          note.shared ? 'text-green-400' : 'text-stone-600 hover:text-green-400'
                        }`}
                        title={note.shared ? 'Make private' : 'Share with community'}
                      >
                        {note.shared ? (
                          <Unlock className="h-3.5 w-3.5" />
                        ) : (
                          <Lock className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setLinkingId(linkingId === note.id ? null : note.id)}
                        className={`rounded p-1.5 transition-colors ${
                          linkingId === note.id
                            ? 'text-cyan-400'
                            : 'text-stone-600 hover:text-cyan-400'
                        }`}
                        title="Link to entity"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(note)}
                        className="rounded p-1.5 text-stone-600 hover:text-amber-400"
                        title="Edit note"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      {confirmDelete === note.id ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(note.id)}
                          className="rounded px-2 py-1 text-xs bg-red-900/60 text-red-300 hover:bg-red-800/60"
                          onBlur={() => setConfirmDelete(null)}
                        >
                          Delete?
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDelete(note.id)}
                          className="rounded p-1.5 text-stone-600 hover:text-red-400"
                          title="Delete note"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tags + date */}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {note.tags.map((tag) => (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => {
                          setTagFilter(tag)
                          doSearch(search, tag, typeFilter)
                        }}
                        className="rounded-full bg-amber-900/30 px-2 py-0.5 text-xs text-amber-400 hover:bg-amber-900/50 cursor-pointer transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                    <span className="text-xs text-stone-600 ml-auto">
                      {new Date(note.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  {linkingId === note.id && (
                    <div className="mt-3">
                      <KnowledgeLinkPicker
                        sourceType="note"
                        sourceId={note.id}
                        onClose={() => setLinkingId(null)}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="text-center">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isPending || isLoadingMore}
            className="rounded-md border border-stone-700 bg-stone-800 px-4 py-2 text-sm text-stone-400 hover:bg-stone-700 hover:text-stone-300 disabled:opacity-40 transition-colors"
          >
            {isLoadingMore ? 'Loading...' : `Load more (${total - notes.length} remaining)`}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Note Form (shared for add + edit) ─────────────────

function NoteForm({
  title,
  body,
  noteType,
  tags,
  categories,
  onTitleChange,
  onBodyChange,
  onTypeChange,
  onTagsChange,
  onSave,
  onCancel,
  isPending,
  saveLabel,
}: {
  title: string
  body: string
  noteType: ChefNoteType
  tags: string[]
  categories: { value: string; label: string }[]
  onTitleChange: (v: string) => void
  onBodyChange: (v: string) => void
  onTypeChange: (v: ChefNoteType) => void
  onTagsChange: (v: string[]) => void
  onSave: () => void
  onCancel: () => void
  isPending: boolean
  saveLabel: string
}) {
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  return (
    <div className="rounded-lg border border-amber-900/40 bg-stone-800/80 p-4 space-y-3">
      <input
        ref={titleRef}
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Note title..."
        maxLength={200}
        className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-600 focus:border-amber-700 focus:outline-none"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel()
        }}
      />

      <div className="relative">
        <textarea
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder="Write your note..."
          className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-600 focus:border-amber-700 focus:outline-none resize-y min-h-[120px]"
          rows={6}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSave()
            if (e.key === 'Escape') onCancel()
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Type selector */}
        <div className="flex rounded-md border border-stone-700 overflow-hidden">
          <button
            type="button"
            onClick={() => onTypeChange('journal')}
            className={`px-3 py-1 text-xs ${
              noteType === 'journal'
                ? 'bg-stone-700 text-stone-200'
                : 'bg-stone-800 text-stone-500 hover:text-stone-400'
            }`}
          >
            Journal
          </button>
          <button
            type="button"
            onClick={() => onTypeChange('reference')}
            className={`px-3 py-1 text-xs ${
              noteType === 'reference'
                ? 'bg-blue-900/60 text-blue-300'
                : 'bg-stone-800 text-stone-500 hover:text-stone-400'
            }`}
          >
            Reference
          </button>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
          {categories.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => {
                if (tags.includes(cat.value)) {
                  onTagsChange(tags.filter((t) => t !== cat.value))
                } else if (tags.length < 10) {
                  onTagsChange([...tags, cat.value])
                }
              }}
              className={`rounded-full px-2 py-0.5 text-[11px] transition-colors ${
                tags.includes(cat.value)
                  ? 'bg-amber-700 text-amber-100'
                  : 'bg-stone-800 text-stone-500 hover:bg-stone-700 hover:text-stone-400'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-stone-700 hidden sm:inline">Ctrl+Enter to save</span>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1 text-xs text-stone-500 hover:text-stone-400"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isPending || !title.trim() || !body.trim()}
          className="rounded-md bg-amber-700 px-4 py-1 text-xs font-medium text-amber-100 hover:bg-amber-600 disabled:opacity-40"
        >
          {isPending ? 'Saving...' : saveLabel}
        </button>
      </div>
    </div>
  )
}

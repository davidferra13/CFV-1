'use client'

// WorkflowNotesPanel - Quick capture, list, filter, attach, and promote UI
// Renders inside existing menu screens (landing, detail) and create-menu form.
// All mutations go through workflow-actions.ts server actions.

import { useCallback, useEffect, useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  createWorkflowNote,
  updateWorkflowNote,
  linkWorkflowNoteToMenu,
  unlinkWorkflowNoteFromMenu,
  promoteWorkflowNoteToDish,
  getWorkflowNotes,
} from '@/lib/notes/workflow-actions'

// ============================================================
// TYPES
// ============================================================

type OwnershipScope = 'global' | 'client' | 'event'
type NoteStatus = 'open' | 'promoted' | 'archived'

type WorkflowNote = {
  id: string
  title: string | null
  body: string
  ownership_scope: OwnershipScope
  status: NoteStatus
  client_id: string | null
  event_id: string | null
  created_at: string
}

type PanelMode =
  | 'landing' // menus landing page - global capture, no menu context
  | 'menu' // menu detail - notes linked/linkable to a specific menu
  | 'create' // create-menu form - pre-link to draft key

interface WorkflowNotesPanelProps {
  mode: PanelMode
  menuId?: string
  draftMenuKey?: string
  clientId?: string
  eventId?: string
}

// ============================================================
// SCOPE BADGE
// ============================================================

function ScopeBadge({ scope }: { scope: OwnershipScope }) {
  const labels: Record<OwnershipScope, string> = {
    global: 'Global',
    client: 'Client',
    event: 'Event',
  }
  const variants: Record<OwnershipScope, 'default' | 'info' | 'success'> = {
    global: 'default',
    client: 'info',
    event: 'success',
  }
  return <Badge variant={variants[scope]}>{labels[scope]}</Badge>
}

function StatusBadge({ status }: { status: NoteStatus }) {
  if (status === 'promoted') return <Badge variant="success">Promoted</Badge>
  if (status === 'archived') return <Badge variant="default">Archived</Badge>
  return null
}

// ============================================================
// PROMOTE DIALOG (inline, no external modal dependency)
// ============================================================

function PromoteDialog({
  note,
  menuId,
  onDone,
  onCancel,
}: {
  note: WorkflowNote
  menuId?: string
  onDone: () => void
  onCancel: () => void
}) {
  const [dishName, setDishName] = useState(note.title ?? '')
  const [course, setCourse] = useState('')
  const [description, setDescription] = useState(note.body)
  const [attachMode, setAttachMode] = useState<'reference' | 'copy' | ''>('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const handlePromote = () => {
    if (!dishName.trim()) {
      setError('Dish name is required')
      return
    }
    if (!course.trim()) {
      setError('Course is required')
      return
    }

    startTransition(async () => {
      try {
        const result = await promoteWorkflowNoteToDish({
          noteId: note.id,
          name: dishName.trim(),
          course: course.trim(),
          description: description.trim() || undefined,
          attachMenuId: menuId && attachMode ? menuId : undefined,
          attachMode: menuId && attachMode ? attachMode : undefined,
        })

        if (!result.success) {
          setError(result.error ?? 'Promotion failed')
          return
        }

        onDone()
      } catch {
        setError('Promotion failed. Please try again.')
      }
    })
  }

  return (
    <div className="border border-violet-500 rounded-lg p-4 bg-stone-950 space-y-3">
      <p className="text-sm font-medium text-stone-200">Promote to Canonical Dish</p>
      <p className="text-xs text-stone-500">
        The original note will be preserved. A new reusable dish will be created in the Dish Index.
      </p>

      <Input
        placeholder="Dish name"
        value={dishName}
        onChange={(e) => setDishName(e.target.value)}
        className="bg-stone-900 border-stone-700 text-stone-200 text-sm"
      />
      <Input
        placeholder="Course (e.g. Appetizer, Main, Dessert)"
        value={course}
        onChange={(e) => setCourse(e.target.value)}
        className="bg-stone-900 border-stone-700 text-stone-200 text-sm"
      />
      <Textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="bg-stone-900 border-stone-700 text-stone-200 text-sm"
      />

      {menuId && (
        <div>
          <p className="text-xs text-stone-500 mb-1">Add to this menu?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setAttachMode(attachMode === 'reference' ? '' : 'reference')}
              className={`px-3 py-1 text-xs rounded border transition-colors ${
                attachMode === 'reference'
                  ? 'bg-violet-600 border-violet-500 text-white'
                  : 'bg-stone-800 border-stone-600 text-stone-400 hover:text-stone-200'
              }`}
            >
              Reference
            </button>
            <button
              onClick={() => setAttachMode(attachMode === 'copy' ? '' : 'copy')}
              className={`px-3 py-1 text-xs rounded border transition-colors ${
                attachMode === 'copy'
                  ? 'bg-violet-600 border-violet-500 text-white'
                  : 'bg-stone-800 border-stone-600 text-stone-400 hover:text-stone-200'
              }`}
            >
              Copy
            </button>
            {attachMode === 'reference' && (
              <span className="text-xs text-stone-500 self-center">
                Stays synced with canonical dish
              </span>
            )}
            {attachMode === 'copy' && (
              <span className="text-xs text-stone-500 self-center">
                Frozen snapshot, no future sync
              </span>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2">
        <Button size="sm" variant="primary" onClick={handlePromote} disabled={isPending}>
          {isPending ? 'Promoting...' : 'Promote to Dish'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ============================================================
// NOTE CARD
// ============================================================

function NoteCard({
  note,
  menuId,
  isLinked,
  onLink,
  onUnlink,
  onPromote,
  onArchive,
}: {
  note: WorkflowNote
  menuId?: string
  isLinked: boolean
  onLink: (noteId: string) => void
  onUnlink: (noteId: string) => void
  onPromote: (note: WorkflowNote) => void
  onArchive: (noteId: string) => void
}) {
  return (
    <div
      className={`rounded-lg border p-3 space-y-2 ${
        note.status === 'archived'
          ? 'border-stone-800 bg-stone-900/40 opacity-60'
          : 'border-stone-700 bg-stone-900'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {note.title && (
            <p className="text-sm font-medium text-stone-200 truncate">{note.title}</p>
          )}
          <p className="text-sm text-stone-400 line-clamp-2">{note.body}</p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <ScopeBadge scope={note.ownership_scope} />
          <StatusBadge status={note.status} />
        </div>
      </div>

      {note.status !== 'archived' && (
        <div className="flex flex-wrap gap-2">
          {menuId && !isLinked && (
            <button
              onClick={() => onLink(note.id)}
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              + Attach to menu
            </button>
          )}
          {menuId && isLinked && (
            <button
              onClick={() => onUnlink(note.id)}
              className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
            >
              Detach
            </button>
          )}
          {note.status !== 'promoted' && (
            <button
              onClick={() => onPromote(note)}
              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Promote to dish
            </button>
          )}
          <button
            onClick={() => onArchive(note.id)}
            className="text-xs text-stone-600 hover:text-stone-400 transition-colors"
          >
            Archive
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================================
// PANEL
// ============================================================

export function WorkflowNotesPanel({
  mode,
  menuId,
  draftMenuKey,
  clientId,
  eventId,
}: WorkflowNotesPanelProps) {
  const [notes, setNotes] = useState<WorkflowNote[]>([])
  const [linkedNoteIds, setLinkedNoteIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Capture form state
  const [captureBody, setCaptureBody] = useState('')
  const [captureTitle, setCaptureTitle] = useState('')
  const [showCapture, setShowCapture] = useState(false)
  const [capturing, startCapture] = useTransition()

  // Promote dialog state
  const [promotingNote, setPromotingNote] = useState<WorkflowNote | null>(null)

  const [actionPending, startAction] = useTransition()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const filters: Parameters<typeof getWorkflowNotes>[0] = {}
      if (mode === 'menu' && menuId) filters.menu_id = menuId
      if (clientId) filters.client_id = clientId
      if (eventId) filters.event_id = eventId

      const result = await getWorkflowNotes(filters)
      if (!result.success) {
        setError(result.error ?? 'Failed to load notes')
        return
      }

      const notesList = result.notes as WorkflowNote[]
      setNotes(notesList)

      // For menu mode, also load all notes (not just linked) so user can attach any
      if (mode === 'menu' && menuId) {
        setLinkedNoteIds(new Set(notesList.map((n) => n.id)))
        // Reload all global notes for the "attach existing" flow
        const all = await getWorkflowNotes({})
        if (all.success) {
          const allNotes = all.notes as WorkflowNote[]
          const unlinked = allNotes.filter((n) => !linkedNoteIds.has(n.id))
          setNotes([...notesList, ...unlinked])
        }
      }
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, menuId, clientId, eventId])

  useEffect(() => {
    load()
  }, [load])

  const handleCapture = () => {
    if (!captureBody.trim()) return

    startCapture(async () => {
      const prev = notes

      const scope: OwnershipScope = eventId ? 'event' : clientId ? 'client' : 'global'

      try {
        const result = await createWorkflowNote({
          title: captureTitle.trim() || undefined,
          body: captureBody.trim(),
          ownership_scope: scope,
          client_id: clientId,
          event_id: eventId,
        })

        if (!result.success) {
          setError(result.error ?? 'Failed to create note')
          return
        }

        setCaptureBody('')
        setCaptureTitle('')
        setShowCapture(false)
        setError('')

        // If we have a menu/draft context, auto-link the new note
        if (result.note && (menuId || draftMenuKey)) {
          await linkWorkflowNoteToMenu({
            noteId: result.note.id,
            menuId: menuId,
            draftMenuKey: draftMenuKey,
          })
          setLinkedNoteIds((prev) => new Set([...prev, result.note!.id]))
        }

        await load()
      } catch {
        setNotes(prev)
        setError('Failed to save note')
      }
    })
  }

  const handleLink = (noteId: string) => {
    if (!menuId && !draftMenuKey) return
    startAction(async () => {
      try {
        const result = await linkWorkflowNoteToMenu({
          noteId,
          menuId,
          draftMenuKey,
        })
        if (result.success) {
          setLinkedNoteIds((prev) => new Set([...prev, noteId]))
        } else {
          setError(result.error ?? 'Failed to attach note')
        }
      } catch {
        setError('Failed to attach note')
      }
    })
  }

  const handleUnlink = (noteId: string) => {
    if (!menuId) return
    startAction(async () => {
      try {
        const result = await unlinkWorkflowNoteFromMenu({ noteId, menuId })
        if (result.success) {
          setLinkedNoteIds((prev) => {
            const next = new Set(prev)
            next.delete(noteId)
            return next
          })
        } else {
          setError(result.error ?? 'Failed to detach note')
        }
      } catch {
        setError('Failed to detach note')
      }
    })
  }

  const handleArchive = (noteId: string) => {
    startAction(async () => {
      try {
        const result = await updateWorkflowNote(noteId, { status: 'archived' })
        if (result.success) {
          setNotes((prev) =>
            prev.map((n) => (n.id === noteId ? { ...n, status: 'archived' as NoteStatus } : n))
          )
        } else {
          setError(result.error ?? 'Failed to archive note')
        }
      } catch {
        setError('Failed to archive note')
      }
    })
  }

  const openNotes = notes.filter((n) => n.status !== 'archived')
  const archivedNotes = notes.filter((n) => n.status === 'archived')

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-stone-300">Workflow Notes</h3>
        <button
          onClick={() => setShowCapture(!showCapture)}
          className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
        >
          {showCapture ? 'Cancel' : '+ Capture idea'}
        </button>
      </div>

      {showCapture && (
        <div className="border border-stone-700 rounded-lg p-3 bg-stone-900 space-y-2">
          <Input
            placeholder="Title (optional)"
            value={captureTitle}
            onChange={(e) => setCaptureTitle(e.target.value)}
            className="bg-stone-950 border-stone-700 text-stone-200 text-sm"
          />
          <Textarea
            placeholder="Capture an idea, dish thought, or note..."
            value={captureBody}
            onChange={(e) => setCaptureBody(e.target.value)}
            rows={3}
            className="bg-stone-950 border-stone-700 text-stone-200 text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={handleCapture}
              disabled={capturing || !captureBody.trim()}
            >
              {capturing ? 'Saving...' : 'Save Note'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowCapture(false)
                setCaptureBody('')
                setCaptureTitle('')
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 bg-red-950/20 border border-red-900 rounded px-3 py-2">
          {error}
        </p>
      )}

      {loading && <div className="text-xs text-stone-500 py-2">Loading notes...</div>}

      {promotingNote && (
        <PromoteDialog
          note={promotingNote}
          menuId={menuId}
          onDone={() => {
            setPromotingNote(null)
            load()
          }}
          onCancel={() => setPromotingNote(null)}
        />
      )}

      {!loading && openNotes.length === 0 && !showCapture && (
        <div className="text-xs text-stone-600 py-2 text-center border border-dashed border-stone-800 rounded-lg">
          Capture your first idea - notes can live here without being part of any menu yet.
        </div>
      )}

      {openNotes.length > 0 && (
        <div className="space-y-2">
          {openNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              menuId={menuId}
              isLinked={linkedNoteIds.has(note.id)}
              onLink={handleLink}
              onUnlink={handleUnlink}
              onPromote={setPromotingNote}
              onArchive={handleArchive}
            />
          ))}
        </div>
      )}

      {archivedNotes.length > 0 && (
        <details className="text-xs text-stone-600">
          <summary className="cursor-pointer hover:text-stone-400 select-none">
            {archivedNotes.length} archived note{archivedNotes.length > 1 ? 's' : ''}
          </summary>
          <div className="mt-2 space-y-2">
            {archivedNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                menuId={menuId}
                isLinked={linkedNoteIds.has(note.id)}
                onLink={handleLink}
                onUnlink={handleUnlink}
                onPromote={setPromotingNote}
                onArchive={handleArchive}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

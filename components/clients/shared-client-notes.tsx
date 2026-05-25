// Shared Client Notes - Read-only chef view of notes clients chose to share
// These are client-authored; the chef cannot edit or delete them.

import { getSharedClientNotes } from '@/lib/notes/client-chef-note-actions'
import type { ClientChefNote, ClientChefNoteCategory } from '@/lib/notes/client-chef-note-actions'
import { Badge } from '@/components/ui/badge'
import { Info, MessageSquare } from '@/components/ui/icons'

const CATEGORY_STYLES: Record<
  ClientChefNoteCategory,
  { variant: 'default' | 'success' | 'warning' | 'error' | 'info'; label: string }
> = {
  general: { variant: 'default', label: 'General' },
  service_quality: { variant: 'success', label: 'Service Quality' },
  food: { variant: 'warning', label: 'Food' },
  communication: { variant: 'info', label: 'Communication' },
  logistics: { variant: 'default', label: 'Logistics' },
}

function formatNoteDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface SharedClientNotesProps {
  clientId: string
}

export async function SharedClientNotes({ clientId }: SharedClientNotesProps) {
  let notes: ClientChefNote[] = []
  try {
    notes = await getSharedClientNotes({ client_id: clientId })
  } catch (err) {
    console.error('[shared-client-notes] Failed to load shared notes', err)
    return null
  }

  return (
    <div className="border border-stone-700 rounded-xl bg-stone-900">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-stone-500" />
          <h3 className="font-semibold text-stone-100">Client Shared Notes</h3>
          <span className="text-xs text-stone-400">
            {notes.length} note{notes.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="group relative">
          <Info className="w-4 h-4 text-stone-500 cursor-help" />
          <div className="absolute right-0 top-6 z-10 hidden group-hover:block w-56 rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-xs text-stone-300 shadow-lg">
            Notes your client has chosen to share with you. These are read-only.
          </div>
        </div>
      </div>

      {/* Notes list */}
      <div className="divide-y divide-stone-800">
        {notes.length === 0 && (
          <div className="px-5 py-6 text-center text-sm text-stone-500">
            No shared notes from this client.
          </div>
        )}

        {notes.map((note) => {
          const style = CATEGORY_STYLES[note.category] ?? CATEGORY_STYLES.general
          return (
            <div key={note.id} className="px-5 py-3">
              <div className="flex items-start gap-3">
                {/* Category badge */}
                <Badge variant={style.variant} className="flex-shrink-0 mt-0.5">
                  {style.label}
                </Badge>

                {/* Note content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-200 whitespace-pre-wrap">{note.note_text}</p>
                  <p className="text-xs text-stone-500 mt-1">
                    {formatNoteDate(note.created_at)}
                    {note.pinned && <span className="ml-1.5 text-amber-500">Pinned</span>}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

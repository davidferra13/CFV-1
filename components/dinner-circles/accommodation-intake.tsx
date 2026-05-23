'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  deleteDinnerCircleAccommodationNote,
  getDinnerCircleAccommodationIntake,
  requestDinnerCircleAccommodationUpdates,
  saveDinnerCircleAccommodationNotes,
} from '@/lib/dinner-circles/accommodation-actions'
import {
  DINNER_CIRCLE_ACCOMMODATION_CATEGORIES,
  DINNER_CIRCLE_ACCOMMODATION_VISIBILITIES,
  getDinnerCircleAccommodationCategoryLabel,
} from '@/lib/dinner-circles/accommodation-intake'
import type {
  DinnerCircleAccommodationCategory,
  DinnerCircleAccommodationIntake,
  DinnerCircleAccommodationNote,
  DinnerCircleAccommodationVisibility,
} from '@/lib/dinner-circles/types'

type DraftNote = {
  id?: string
  category: DinnerCircleAccommodationCategory
  note: string
  visibility: DinnerCircleAccommodationVisibility
  chefRelevant: boolean
}

type DinnerCircleAccommodationIntakeProps = {
  circleId: string
  callerProfileId: string
  isHost: boolean
  initialIntake?: DinnerCircleAccommodationIntake | null
}

const DEFAULT_VISIBILITY: DinnerCircleAccommodationVisibility = 'chef_only'

function emptyDraft(category: DinnerCircleAccommodationCategory): DraftNote {
  return {
    category,
    note: '',
    visibility: DEFAULT_VISIBILITY,
    chefRelevant: true,
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function draftFromNote(note: DinnerCircleAccommodationNote): DraftNote {
  return {
    id: note.id,
    category: note.category,
    note: note.note,
    visibility: note.visibility,
    chefRelevant: note.chefRelevant,
  }
}

export function DinnerCircleAccommodationIntake({
  circleId,
  callerProfileId,
  isHost,
  initialIntake = null,
}: DinnerCircleAccommodationIntakeProps) {
  const [isPending, startTransition] = useTransition()
  const [intake, setIntake] = useState<DinnerCircleAccommodationIntake>(
    initialIntake ?? { notes: [] }
  )
  const [drafts, setDrafts] = useState<DraftNote[]>([])
  const [loaded, setLoaded] = useState(Boolean(initialIntake))

  useEffect(() => {
    let active = true
    startTransition(() => {
      void (async () => {
        try {
          const result = await getDinnerCircleAccommodationIntake({ circleId })
          if (!active) return
          setIntake(result.intake)
          setLoaded(true)
        } catch (error: unknown) {
          if (!active) return
          setLoaded(true)
          toast.error(error instanceof Error ? error.message : 'Failed to load accommodations')
        }
      })()
    })

    return () => {
      active = false
    }
  }, [circleId])

  const ownNotes = useMemo(
    () => intake.notes.filter((note) => note.submittedByProfileId === callerProfileId),
    [callerProfileId, intake.notes]
  )

  const visibleSharedNotes = useMemo(
    () => intake.notes.filter((note) => note.submittedByProfileId !== callerProfileId),
    [callerProfileId, intake.notes]
  )

  function beginEditing() {
    setDrafts(
      ownNotes.length > 0
        ? ownNotes.map(draftFromNote)
        : [emptyDraft('mobility'), emptyDraft('seating_access')]
    )
  }

  function updateDraft(index: number, patch: Partial<DraftNote>) {
    setDrafts((current) =>
      current.map((draft, draftIndex) => (draftIndex === index ? { ...draft, ...patch } : draft))
    )
  }

  function addDraft() {
    setDrafts((current) => [...current, emptyDraft('service_preference')])
  }

  function removeDraft(index: number) {
    setDrafts((current) => current.filter((_, draftIndex) => draftIndex !== index))
  }

  function saveDrafts() {
    startTransition(() => {
      void (async () => {
        try {
          const cleaned = drafts.filter((draft) => draft.note.trim())
          await saveDinnerCircleAccommodationNotes({ circleId, notes: cleaned })
          const result = await getDinnerCircleAccommodationIntake({ circleId })
          setIntake(result.intake)
          setDrafts([])
          toast.success('Accommodation notes saved')
        } catch (error: unknown) {
          toast.error(error instanceof Error ? error.message : 'Failed to save accommodations')
        }
      })()
    })
  }

  function deleteNote(noteId: string) {
    startTransition(() => {
      void (async () => {
        try {
          await deleteDinnerCircleAccommodationNote({ circleId, noteId })
          setIntake((current) => ({
            ...current,
            notes: current.notes.filter((note) => note.id !== noteId),
          }))
          toast.success('Accommodation note deleted')
        } catch (error: unknown) {
          toast.error(error instanceof Error ? error.message : 'Failed to delete note')
        }
      })()
    })
  }

  function requestUpdates() {
    startTransition(() => {
      void (async () => {
        try {
          const result = await requestDinnerCircleAccommodationUpdates({ circleId })
          setIntake((current) => ({
            ...current,
            requestedAt: result.requestedAt ?? new Date().toISOString(),
          }))
          toast.success('Accommodation request recorded')
        } catch (error: unknown) {
          toast.error(error instanceof Error ? error.message : 'Failed to request updates')
        }
      })()
    })
  }

  const requestDate = formatDate(intake.requestedAt)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-semibold">Access and accommodations</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Optional notes for access, seating, sensory, language, service, and voluntary
            health-related food constraints.
          </p>
          {requestDate && (
            <p className="mt-2 text-xs text-muted-foreground">
              Host requested updates on {requestDate}.
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {isHost && (
            <button
              type="button"
              onClick={requestUpdates}
              disabled={isPending}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
            >
              Request updates
            </button>
          )}
          <button
            type="button"
            onClick={drafts.length > 0 ? () => setDrafts([]) : beginEditing}
            disabled={isPending || !loaded}
            className="rounded-md bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {drafts.length > 0 ? 'Cancel' : ownNotes.length > 0 ? 'Edit mine' : 'Add notes'}
          </button>
        </div>
      </div>

      {drafts.length > 0 && (
        <section
          className="space-y-3 rounded-xl border bg-card p-4"
          aria-label="Accommodation form"
        >
          <div className="space-y-1">
            <p className="text-sm font-medium">Your accommodation notes</p>
            <p className="text-xs text-muted-foreground">
              Share only what you want to share. Pick who can see each note.
            </p>
          </div>

          <div className="space-y-4">
            {drafts.map((draft, index) => {
              const category = DINNER_CIRCLE_ACCOMMODATION_CATEGORIES.find(
                (entry) => entry.id === draft.category
              )
              return (
                <div
                  key={`${draft.id ?? 'new'}-${index}`}
                  className="space-y-3 rounded-lg border p-3"
                >
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="space-y-1">
                      <label
                        htmlFor={`accommodation-category-${index}`}
                        className="text-xs font-medium text-muted-foreground"
                      >
                        Type
                      </label>
                      <select
                        id={`accommodation-category-${index}`}
                        value={draft.category}
                        onChange={(event) =>
                          updateDraft(index, {
                            category: event.target.value as DinnerCircleAccommodationCategory,
                          })
                        }
                        className="w-full rounded-md border px-3 py-2 text-sm"
                      >
                        {DINNER_CIRCLE_ACCOMMODATION_CATEGORIES.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.label}
                          </option>
                        ))}
                      </select>
                      {category && (
                        <p className="text-xs leading-5 text-muted-foreground">{category.prompt}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor={`accommodation-visibility-${index}`}
                        className="text-xs font-medium text-muted-foreground"
                      >
                        Visibility
                      </label>
                      <select
                        id={`accommodation-visibility-${index}`}
                        value={draft.visibility}
                        onChange={(event) =>
                          updateDraft(index, {
                            visibility: event.target.value as DinnerCircleAccommodationVisibility,
                          })
                        }
                        className="w-full rounded-md border px-3 py-2 text-sm"
                      >
                        {DINNER_CIRCLE_ACCOMMODATION_VISIBILITIES.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor={`accommodation-note-${index}`}
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Note
                    </label>
                    <textarea
                      id={`accommodation-note-${index}`}
                      value={draft.note}
                      onChange={(event) => updateDraft(index, { note: event.target.value })}
                      rows={3}
                      maxLength={1200}
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      placeholder="Optional details for planning and service."
                    />
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex items-start gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={draft.chefRelevant}
                        onChange={(event) =>
                          updateDraft(index, { chefRelevant: event.target.checked })
                        }
                        className="mt-0.5"
                      />
                      <span>Route to chef readiness when the chef is allowed to see it.</span>
                    </label>
                    {drafts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDraft(index)}
                        className="self-start text-xs text-muted-foreground hover:text-destructive sm:self-auto"
                      >
                        Remove note
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveDrafts}
              disabled={isPending}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Save notes
            </button>
            <button
              type="button"
              onClick={addDraft}
              disabled={isPending || drafts.length >= 12}
              className="rounded-md border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
            >
              Add another
            </button>
          </div>
        </section>
      )}

      <section className="space-y-2" aria-label="Your saved accommodation notes">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Your notes ({ownNotes.length})
        </p>
        {ownNotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No accommodation notes saved. This intake is optional.
          </p>
        ) : (
          <ul className="space-y-2">
            {ownNotes.map((note) => (
              <AccommodationNoteRow
                key={note.id}
                note={note}
                canDelete
                onDelete={() => deleteNote(note.id)}
              />
            ))}
          </ul>
        )}
      </section>

      {visibleSharedNotes.length > 0 && (
        <section className="space-y-2" aria-label="Visible circle accommodation notes">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Visible to you ({visibleSharedNotes.length})
          </p>
          <ul className="space-y-2">
            {visibleSharedNotes.map((note) => (
              <AccommodationNoteRow key={note.id} note={note} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function AccommodationNoteRow({
  note,
  canDelete = false,
  onDelete,
}: {
  note: DinnerCircleAccommodationNote
  canDelete?: boolean
  onDelete?: () => void
}) {
  const visibility = DINNER_CIRCLE_ACCOMMODATION_VISIBILITIES.find(
    (entry) => entry.id === note.visibility
  )

  return (
    <li className="rounded-lg border bg-card px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {getDinnerCircleAccommodationCategoryLabel(note.category)}
            </span>
            <span className="rounded-full bg-brand-600/10 px-2 py-0.5 text-xs text-brand-700">
              {visibility?.label ?? note.visibility}
            </span>
            {note.chefRelevant && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                Chef readiness
              </span>
            )}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{note.note}</p>
          {note.submittedByName && (
            <p className="mt-1 text-xs text-muted-foreground">From {note.submittedByName}</p>
          )}
        </div>
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="self-start text-xs text-muted-foreground hover:text-destructive"
          >
            Delete
          </button>
        )}
      </div>
    </li>
  )
}

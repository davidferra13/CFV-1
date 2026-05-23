'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Bell, Eye, FileText, Printer, Save, Shield, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  getDinnerCircleArrivalGuide,
  saveDinnerCircleArrivalGuide,
} from '@/lib/dinner-circles/arrival-guide-actions'
import { DINNER_CIRCLE_ARRIVAL_GUIDE_SECTIONS } from '@/lib/dinner-circles/arrival-guide'
import type {
  DinnerCircleArrivalGuide,
  DinnerCircleArrivalGuideSection,
  DinnerCircleArrivalGuideSectionKey,
  DinnerCircleArrivalGuideVisibility,
} from '@/lib/dinner-circles/types'

type DinnerCircleArrivalGuideProps = {
  circleId: string
  isHost: boolean
}

type DraftSection = {
  key: DinnerCircleArrivalGuideSectionKey
  body: string
  visibility: DinnerCircleArrivalGuideVisibility
  chefRelevant: boolean
  sensitive: boolean
  expiresAt: string
}

const VISIBILITY_OPTIONS: Array<{
  id: DinnerCircleArrivalGuideVisibility
  label: string
  description: string
}> = [
  {
    id: 'attendee_visible',
    label: 'Attendees',
    description: 'Visible to attendees, hosts, and reminder views.',
  },
  {
    id: 'host_and_chef',
    label: 'Host and chef',
    description: 'Visible to hosts and the chef for setup coordination.',
  },
  {
    id: 'chef_only',
    label: 'Chef only',
    description: 'Visible only to the chef for service access.',
  },
  {
    id: 'host_only',
    label: 'Host only',
    description: 'Visible only to hosts.',
  },
]

function emptyGuide(): DinnerCircleArrivalGuide {
  return { status: 'draft', sections: {} }
}

function sectionList(guide: DinnerCircleArrivalGuide | null): DinnerCircleArrivalGuideSection[] {
  if (!guide) return []
  return DINNER_CIRCLE_ARRIVAL_GUIDE_SECTIONS.map(
    (definition) => guide.sections[definition.key]
  ).filter((section): section is DinnerCircleArrivalGuideSection => Boolean(section))
}

function formatDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function toDatetimeLocal(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

function fromDatetimeLocal(value: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function buildDrafts(guide: DinnerCircleArrivalGuide): DraftSection[] {
  return DINNER_CIRCLE_ARRIVAL_GUIDE_SECTIONS.map((definition) => {
    const section = guide.sections[definition.key]
    return {
      key: definition.key,
      body: section?.body ?? '',
      visibility: section?.visibility ?? definition.defaultVisibility,
      chefRelevant: section?.chefRelevant ?? definition.chefRelevant,
      sensitive: section?.sensitive ?? definition.sensitive,
      expiresAt: toDatetimeLocal(section?.expiresAt),
    }
  })
}

export function DinnerCircleArrivalGuide({ circleId, isHost }: DinnerCircleArrivalGuideProps) {
  const [isPending, startTransition] = useTransition()
  const [guide, setGuide] = useState<DinnerCircleArrivalGuide>(emptyGuide)
  const [safeShareGuide, setSafeShareGuide] = useState<DinnerCircleArrivalGuide>(emptyGuide)
  const [loaded, setLoaded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [printSafe, setPrintSafe] = useState(false)
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [notifyAttendees, setNotifyAttendees] = useState(false)
  const [drafts, setDrafts] = useState<DraftSection[]>([])

  useEffect(() => {
    let active = true
    startTransition(() => {
      void (async () => {
        try {
          const result = await getDinnerCircleArrivalGuide({ circleId })
          if (!active) return
          setGuide(result.guide)
          setSafeShareGuide(result.safeShareGuide)
          setStatus(result.guide.status)
          setLoaded(true)
        } catch (error: unknown) {
          if (!active) return
          setLoaded(true)
          toast.error(error instanceof Error ? error.message : 'Failed to load arrival guide')
        }
      })()
    })

    return () => {
      active = false
    }
  }, [circleId])

  const activeGuide = printSafe ? safeShareGuide : guide
  const visibleSections = useMemo(() => sectionList(activeGuide), [activeGuide])
  const lastUpdated = formatDate(guide.updatedAt)
  const publishedAt = formatDate(guide.publishedAt)

  function beginEditing() {
    setDrafts(buildDrafts(guide))
    setStatus(guide.status)
    setNotifyAttendees(false)
    setEditing(true)
  }

  function updateDraft(key: DinnerCircleArrivalGuideSectionKey, patch: Partial<DraftSection>) {
    setDrafts((current) =>
      current.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft))
    )
  }

  function saveDrafts() {
    startTransition(() => {
      void (async () => {
        try {
          const result = await saveDinnerCircleArrivalGuide({
            circleId,
            status,
            notifyAttendees,
            sections: drafts.map((draft) => ({
              key: draft.key,
              body: draft.body,
              visibility: draft.visibility,
              chefRelevant: draft.chefRelevant,
              sensitive: draft.sensitive,
              expiresAt: fromDatetimeLocal(draft.expiresAt),
            })),
          })
          const refreshed = await getDinnerCircleArrivalGuide({ circleId })
          setGuide(refreshed.guide ?? result.guide)
          setSafeShareGuide(refreshed.safeShareGuide)
          setStatus(refreshed.guide.status)
          setEditing(false)
          setNotifyAttendees(false)
          toast.success(
            notifyAttendees ? 'Arrival guide saved and attendees notified' : 'Arrival guide saved'
          )
        } catch (error: unknown) {
          toast.error(error instanceof Error ? error.message : 'Failed to save arrival guide')
        }
      })()
    })
  }

  function printGuide() {
    setPrintSafe(true)
    window.setTimeout(() => window.print(), 50)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">Arrival guide</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                guide.status === 'published'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {guide.status === 'published' ? 'Published' : 'Draft'}
            </span>
            {printSafe && (
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800">
                Print-safe
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Address, parking, building access, arrival timing, accessibility, dropoff, and house
            rules for this Dinner Circle.
          </p>
          {(publishedAt || lastUpdated) && (
            <p className="mt-2 text-xs text-muted-foreground">
              {publishedAt ? `Published ${publishedAt}` : null}
              {publishedAt && lastUpdated ? ' · ' : null}
              {lastUpdated ? `Updated ${lastUpdated}` : null}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPrintSafe((current) => !current)}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            {printSafe ? 'Full view' : 'Safe view'}
          </button>
          <button
            type="button"
            onClick={printGuide}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            Print
          </button>
          {isHost && (
            <button
              type="button"
              onClick={editing ? () => setEditing(false) : beginEditing}
              disabled={isPending || !loaded}
              className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {editing ? (
                <X className="h-4 w-4" aria-hidden="true" />
              ) : (
                <FileText className="h-4 w-4" aria-hidden="true" />
              )}
              {editing ? 'Cancel' : 'Edit guide'}
            </button>
          )}
        </div>
      </div>

      {editing && (
        <section
          className="space-y-4 rounded-xl border bg-card p-4"
          aria-label="Arrival guide editor"
        >
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Publishing state</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as 'draft' | 'published')}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={notifyAttendees}
                onChange={(event) => setNotifyAttendees(event.target.checked)}
              />
              <Bell className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Notify attendees
            </label>
          </div>

          <div className="space-y-4">
            {drafts.map((draft) => {
              const definition = DINNER_CIRCLE_ARRIVAL_GUIDE_SECTIONS.find(
                (section) => section.key === draft.key
              )
              return (
                <div key={draft.key} className="space-y-3 rounded-lg border p-3">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="space-y-1">
                      <label htmlFor={`arrival-${draft.key}`} className="text-sm font-medium">
                        {definition?.label}
                      </label>
                      <p className="text-xs leading-5 text-muted-foreground">
                        {definition?.prompt}
                      </p>
                    </div>
                    <label className="space-y-1 text-sm">
                      <span className="text-xs font-medium text-muted-foreground">Visibility</span>
                      <select
                        value={draft.visibility}
                        onChange={(event) =>
                          updateDraft(draft.key, {
                            visibility: event.target.value as DinnerCircleArrivalGuideVisibility,
                          })
                        }
                        className="w-full rounded-md border px-3 py-2 text-sm"
                      >
                        {VISIBILITY_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <textarea
                    id={`arrival-${draft.key}`}
                    value={draft.body}
                    onChange={(event) => updateDraft(draft.key, { body: event.target.value })}
                    rows={3}
                    maxLength={2400}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="Add host-authored instructions."
                  />

                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={draft.chefRelevant}
                          onChange={(event) =>
                            updateDraft(draft.key, { chefRelevant: event.target.checked })
                          }
                        />
                        Chef-relevant
                      </label>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={draft.sensitive}
                          onChange={(event) =>
                            updateDraft(draft.key, { sensitive: event.target.checked })
                          }
                        />
                        Sensitive or private
                      </label>
                    </div>
                    <label className="space-y-1 text-xs text-muted-foreground">
                      <span>Hide after</span>
                      <input
                        type="datetime-local"
                        value={draft.expiresAt}
                        onChange={(event) =>
                          updateDraft(draft.key, { expiresAt: event.target.value })
                        }
                        className="w-full rounded-md border px-3 py-2 text-sm text-foreground"
                      />
                    </label>
                  </div>
                </div>
              )
            })}
          </div>

          <button
            type="button"
            onClick={saveDrafts}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            Save guide
          </button>
        </section>
      )}

      {visibleSections.length === 0 ? (
        <div className="rounded-xl border bg-muted/30 p-5">
          <p className="text-sm text-muted-foreground">
            {loaded
              ? 'No arrival instructions are visible yet.'
              : 'Loading arrival instructions...'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visibleSections.map((section) => (
            <section key={section.key} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-semibold">{section.label}</h4>
                {section.sensitive && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                    <Shield className="h-3 w-3" aria-hidden="true" />
                    Sensitive
                  </span>
                )}
                {section.chefRelevant && (
                  <span className="rounded-full bg-brand-600/10 px-2 py-0.5 text-xs text-brand-700">
                    Chef access
                  </span>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{section.body}</p>
              {section.expiresAt && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Hidden after {formatDate(section.expiresAt)}
                </p>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

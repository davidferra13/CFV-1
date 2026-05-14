'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, CalendarDays, LinkIcon, Loader2, Unlink } from 'lucide-react'
import * as circleDetailActions from '@/lib/hub/circle-detail-actions'
import type { CircleDetail, CircleEventLink } from '@/lib/hub/circle-detail-actions'

type ActionResult = { success: boolean; error?: string }

export type ChefCircleAvailableEvent = {
  event_id: string
  event_title: string
  event_date: string | null
  event_status: string
  guest_count: number | null
}

type RawAvailableEvent =
  | ChefCircleAvailableEvent
  | {
      id: string
      title: string
      event_date: string | null
      status: string
      guest_count?: number | null
    }

type CircleDetailActionModule = typeof circleDetailActions & {
  getEventsNotInCircle?: (circleId: string) => Promise<RawAvailableEvent[]>
  linkEventToCircle: (circleId: string, eventId: string) => Promise<ActionResult | void>
  unlinkEventFromCircle: (circleId: string, eventId: string) => Promise<ActionResult | void>
}

type ChefCircleEventLinkerProps = {
  circle: Pick<CircleDetail, 'id'> & { events: CircleEventLink[] }
  className?: string
  onEventsChange?: (events: CircleEventLink[]) => void
}

const statusStyles: Record<string, string> = {
  draft: 'bg-stone-700 text-stone-300',
  proposed: 'bg-blue-500/15 text-blue-300',
  accepted: 'bg-emerald-500/15 text-emerald-300',
  paid: 'bg-green-500/15 text-green-300',
  confirmed: 'bg-green-600/15 text-green-200',
  in_progress: 'bg-amber-500/15 text-amber-300',
  completed: 'bg-stone-700 text-stone-400',
  cancelled: 'bg-red-500/15 text-red-300',
}

export function ChefCircleEventLinker({
  circle,
  className = '',
  onEventsChange,
}: ChefCircleEventLinkerProps) {
  const [linkedEvents, setLinkedEvents] = useState(circle.events)
  const [availableEvents, setAvailableEvents] = useState<ChefCircleAvailableEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingEventId, setPendingEventId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    setLinkedEvents(circle.events)
  }, [circle.events])

  useEffect(() => {
    let cancelled = false

    async function loadAvailableEvents() {
      setLoading(true)
      setError(null)

      try {
        const getEventsNotInCircle = (circleDetailActions as unknown as CircleDetailActionModule)
          .getEventsNotInCircle

        if (typeof getEventsNotInCircle !== 'function') {
          throw new Error('Available events action is not available yet.')
        }

        const events = await getEventsNotInCircle(circle.id)
        if (!cancelled) {
          setAvailableEvents(events.map(normalizeAvailableEvent).filter(isAvailableEvent))
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load available events.')
          setAvailableEvents([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadAvailableEvents()

    return () => {
      cancelled = true
    }
  }, [circle.id])

  const linkedEventIds = useMemo(
    () => new Set(linkedEvents.map((event) => event.event_id)),
    [linkedEvents]
  )

  const visibleAvailableEvents = useMemo(
    () => availableEvents.filter((event) => !linkedEventIds.has(event.event_id)),
    [availableEvents, linkedEventIds]
  )

  function commitLinkedEvents(events: CircleEventLink[]) {
    setLinkedEvents(events)
    onEventsChange?.(events)
  }

  function linkEvent(event: ChefCircleAvailableEvent) {
    setError(null)
    setPendingEventId(event.event_id)

    startTransition(async () => {
      try {
        const result = await (
          circleDetailActions as unknown as CircleDetailActionModule
        ).linkEventToCircle(circle.id, event.event_id)

        if (result && result.success === false) {
          throw new Error(result.error ?? 'Failed to link event.')
        }

        commitLinkedEvents([
          {
            event_id: event.event_id,
            event_title: event.event_title,
            event_date: event.event_date,
            event_status: event.event_status,
            guest_count: event.guest_count,
            linked_at: new Date().toISOString(),
          },
          ...linkedEvents,
        ])
        setAvailableEvents((events) => events.filter((item) => item.event_id !== event.event_id))
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to link event.')
      } finally {
        setPendingEventId(null)
      }
    })
  }

  function unlinkEvent(event: CircleEventLink) {
    setError(null)
    setPendingEventId(event.event_id)

    startTransition(async () => {
      try {
        const result = await (
          circleDetailActions as unknown as CircleDetailActionModule
        ).unlinkEventFromCircle(circle.id, event.event_id)

        if (result && result.success === false) {
          throw new Error(result.error ?? 'Failed to unlink event.')
        }

        commitLinkedEvents(linkedEvents.filter((item) => item.event_id !== event.event_id))
        setAvailableEvents((events) => [
          {
            event_id: event.event_id,
            event_title: event.event_title,
            event_date: event.event_date,
            event_status: event.event_status,
            guest_count: event.guest_count,
          },
          ...events,
        ])
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to unlink event.')
      } finally {
        setPendingEventId(null)
      }
    })
  }

  return (
    <section
      className={`space-y-5 rounded-xl border border-stone-700 bg-stone-900/80 p-5 shadow-sm ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-stone-100">Linked events</h2>
          <p className="mt-1 text-xs text-stone-500">
            Attach this circle to upcoming or past event workspaces.
          </p>
        </div>
        {isPending ? (
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-stone-800 px-2.5 py-1 text-xs font-medium text-stone-300">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Updating
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-2 text-xs text-red-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Current links
        </h3>
        {linkedEvents.length > 0 ? (
          <div className="space-y-2">
            {linkedEvents.map((event) => (
              <EventRow
                key={event.event_id}
                event={event}
                actionLabel="Unlink"
                actionIcon="unlink"
                pending={pendingEventId === event.event_id}
                disabled={pendingEventId !== null || loading}
                onAction={() => unlinkEvent(event)}
              />
            ))}
          </div>
        ) : (
          <EmptyState text="No events are linked to this circle yet." />
        )}
      </div>

      <div className="space-y-2 border-t border-stone-800 pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Available events
        </h3>
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-stone-800 bg-stone-950/50 px-4 py-8 text-sm text-stone-400">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading events...
          </div>
        ) : visibleAvailableEvents.length > 0 ? (
          <div className="space-y-2">
            {visibleAvailableEvents.map((event) => (
              <EventRow
                key={event.event_id}
                event={event}
                actionLabel="Link"
                actionIcon="link"
                pending={pendingEventId === event.event_id}
                disabled={pendingEventId !== null}
                onAction={() => linkEvent(event)}
              />
            ))}
          </div>
        ) : (
          <EmptyState text="No unlinked events are available." />
        )}
      </div>
    </section>
  )
}

function EventRow({
  event,
  actionLabel,
  actionIcon,
  pending,
  disabled,
  onAction,
}: {
  event: CircleEventLink | ChefCircleAvailableEvent
  actionLabel: string
  actionIcon: 'link' | 'unlink'
  pending: boolean
  disabled: boolean
  onAction: () => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-stone-800 bg-stone-950/50 p-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-stone-800 text-stone-400">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <Link
            href={`/events/${event.event_id}`}
            className="block truncate text-sm font-medium text-stone-100 hover:text-brand-300"
          >
            {event.event_title}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {event.event_date ? (
              <span className="text-xs text-stone-500">{formatDate(event.event_date)}</span>
            ) : null}
            <StatusBadge status={event.event_status} />
            {typeof event.guest_count === 'number' ? (
              <span className="text-xs text-stone-500">{event.guest_count} guests</span>
            ) : null}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onAction}
        disabled={disabled}
        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-xs font-medium text-stone-200 transition hover:border-brand-500/60 hover:text-brand-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : actionIcon === 'link' ? (
          <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Unlink className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {actionLabel}
      </button>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-stone-800 bg-stone-950/50 px-4 py-8 text-center text-sm text-stone-500">
      {text}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        statusStyles[status] ?? 'bg-stone-700 text-stone-300'
      }`}
    >
      {status.replace('_', ' ')}
    </span>
  )
}

function normalizeAvailableEvent(event: RawAvailableEvent): ChefCircleAvailableEvent | null {
  if ('event_id' in event) {
    return {
      event_id: event.event_id,
      event_title: event.event_title,
      event_date: event.event_date,
      event_status: event.event_status,
      guest_count: event.guest_count,
    }
  }

  return {
    event_id: event.id,
    event_title: event.title,
    event_date: event.event_date,
    event_status: event.status,
    guest_count: event.guest_count ?? null,
  }
}

function isAvailableEvent(
  event: ChefCircleAvailableEvent | null
): event is ChefCircleAvailableEvent {
  return Boolean(event?.event_id && event.event_title)
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString()
}

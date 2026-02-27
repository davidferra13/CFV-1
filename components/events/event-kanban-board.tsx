// Event Kanban Board — drag-drop board with FSM-validated column transitions
'use client'

import { useState, useTransition, useEffect } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { toast } from 'sonner'
import { EventKanbanColumn } from './event-kanban-column'
import { EventKanbanCardOverlay } from './event-kanban-card'
import { transitionEvent } from '@/lib/events/transitions'
import type { EventStatus } from '@/lib/events/transitions'
import { Badge } from '@/components/ui/badge'
import { trackAction } from '@/lib/ai/remy-activity-tracker'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KanbanEvent {
  id: string
  status: string
  occasion: string
  client_name: string
  event_date: string
  guest_count: number
  quoted_price_cents: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  proposed: 'Proposed',
  accepted: 'Accepted',
  paid: 'Paid',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
}

const ACTIVE_COLUMNS = [
  'draft',
  'proposed',
  'accepted',
  'paid',
  'confirmed',
  'in_progress',
] as const

// Top border color per column
const COLUMN_COLORS: Record<string, string> = {
  draft: 'border-t-stone-400',
  proposed: 'border-t-amber-400',
  accepted: 'border-t-blue-400',
  paid: 'border-t-green-400',
  confirmed: 'border-t-emerald-500',
  in_progress: 'border-t-brand-500',
}

// Only adjacent forward transitions are allowed via drag.
// Cancelled requires close-out; completed requires close-out wizard.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ['proposed'],
  proposed: ['accepted'],
  accepted: ['paid'],
  paid: ['confirmed'],
  confirmed: ['in_progress'],
  in_progress: [], // completed requires close-out wizard
}

// ─── Component ────────────────────────────────────────────────────────────────

interface EventKanbanBoardProps {
  events: KanbanEvent[]
}

export function EventKanbanBoard({ events: initialEvents }: EventKanbanBoardProps) {
  const [events, setEvents] = useState<KanbanEvent[]>(initialEvents)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Re-sync local state when server data changes (revalidation, navigation)
  useEffect(() => {
    setEvents(initialEvents)
  }, [initialEvents])
  const [isPending, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts (avoids accidental drags on click)
      },
    })
  )

  // The card currently being dragged (used for DragOverlay)
  const activeEvent = activeId ? (events.find((e) => e.id === activeId) ?? null) : null

  // Split events by status
  function eventsForStatus(status: string): KanbanEvent[] {
    return events.filter((e) => e.status === status)
  }

  // Terminal status counts (read-only summary)
  const completedCount = events.filter((e) => e.status === 'completed').length
  const cancelledCount = events.filter((e) => e.status === 'cancelled').length

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)

    const { active, over } = event

    if (!over) return // Dropped outside any column

    const draggedId = active.id as string
    const targetStatus = over.id as string

    const draggedEvent = events.find((e) => e.id === draggedId)
    if (!draggedEvent) return

    const fromStatus = draggedEvent.status

    // No-op: dropped back into same column
    if (fromStatus === targetStatus) return

    // Validate transition
    const allowed = ALLOWED_TRANSITIONS[fromStatus] ?? []
    if (!allowed.includes(targetStatus)) {
      // Give contextual feedback
      const isBackwards =
        ACTIVE_COLUMNS.indexOf(targetStatus as (typeof ACTIVE_COLUMNS)[number]) <
        ACTIVE_COLUMNS.indexOf(fromStatus as (typeof ACTIVE_COLUMNS)[number])

      if (isBackwards) {
        toast.error('Cannot move events backwards in the pipeline.')
      } else if (targetStatus === 'in_progress' && fromStatus !== 'confirmed') {
        toast.error('Event must be confirmed before it can be started.')
      } else if (!ACTIVE_COLUMNS.includes(targetStatus as (typeof ACTIVE_COLUMNS)[number])) {
        toast.error('Cannot drop events into terminal columns from the board.')
      } else {
        toast.error(
          `Transition from ${STATUS_LABELS[fromStatus] ?? fromStatus} to ${STATUS_LABELS[targetStatus] ?? targetStatus} is not allowed. Events must move one step at a time.`
        )
      }
      return
    }

    // Optimistic update — move card immediately
    setEvents((prev) => prev.map((e) => (e.id === draggedId ? { ...e, status: targetStatus } : e)))

    // Call server action inside transition
    startTransition(async () => {
      try {
        await transitionEvent({
          eventId: draggedId,
          toStatus: targetStatus as EventStatus,
          metadata: { source: 'kanban_drag' },
        })

        trackAction(
          `Moved event to ${STATUS_LABELS[targetStatus] ?? targetStatus}`,
          `${draggedEvent.occasion} (${draggedEvent.client_name})`
        )
        toast.success(
          `"${draggedEvent.occasion}" moved to ${STATUS_LABELS[targetStatus] ?? targetStatus}`
        )
      } catch (err: unknown) {
        // Revert optimistic update
        setEvents((prev) =>
          prev.map((e) => (e.id === draggedId ? { ...e, status: fromStatus } : e))
        )

        const message = err instanceof Error ? err.message : 'Failed to update event status.'
        toast.error(message)
      }
    })
  }

  return (
    <div className="relative">
      {/* Loading overlay */}
      {isPending && (
        <div className="absolute inset-0 bg-stone-900/50 z-10 rounded-xl pointer-events-none" />
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Active columns — horizontal scroll on small screens */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {ACTIVE_COLUMNS.map((status) => (
            <EventKanbanColumn
              key={status}
              status={status}
              label={STATUS_LABELS[status]}
              colorClass={COLUMN_COLORS[status]}
              events={eventsForStatus(status)}
              activeId={activeId}
            />
          ))}
        </div>

        {/* DragOverlay renders a floating ghost card while dragging */}
        <DragOverlay>
          {activeEvent ? <EventKanbanCardOverlay event={activeEvent} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Terminal status summary row */}
      <div className="mt-6 flex gap-4">
        <TerminalStatusPill label="Completed" count={completedCount} variant="success" />
        <TerminalStatusPill label="Cancelled" count={cancelledCount} variant="error" />
      </div>
    </div>
  )
}

// ─── Terminal Status Pill ─────────────────────────────────────────────────────

function TerminalStatusPill({
  label,
  count,
  variant,
}: {
  label: string
  count: number
  variant: 'success' | 'error'
}) {
  return (
    <div className="flex items-center gap-2 bg-stone-900 border border-stone-700 rounded-lg px-4 py-2 shadow-sm">
      <span className="text-sm text-stone-400 font-medium">{label}</span>
      <Badge variant={variant}>{count}</Badge>
    </div>
  )
}

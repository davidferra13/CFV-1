// Event Kanban Card — single draggable event card
'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { formatCurrency } from '@/lib/utils/currency'
import type { KanbanEvent } from './event-kanban-board'

interface EventKanbanCardProps {
  event: KanbanEvent
  isDragging?: boolean
}

export function EventKanbanCard({ event, isDragging = false }: EventKanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: event.id,
    data: { event },
  })

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={[
        'bg-white rounded-lg border border-stone-200 p-3 cursor-grab active:cursor-grabbing select-none',
        'transition-shadow duration-150',
        isDragging
          ? 'shadow-xl opacity-80 ring-2 ring-brand-400'
          : 'shadow-sm hover:shadow-md',
      ].join(' ')}
    >
      {/* Occasion / title */}
      <div className="mb-1.5">
        <Link
          href={`/events/${event.id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-sm font-semibold text-stone-900 hover:text-brand-600 hover:underline leading-snug line-clamp-2"
        >
          {event.occasion}
        </Link>
      </div>

      {/* Client name */}
      <p className="text-xs text-stone-500 mb-2 truncate">{event.client_name}</p>

      {/* Meta row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs text-stone-600">
          {format(parseISO(event.event_date), 'MMM d, yyyy')}
        </span>
        <span className="text-xs text-stone-600">
          {event.guest_count} guests
        </span>
      </div>

      {/* Price */}
      {event.quoted_price_cents > 0 && (
        <div className="mt-1.5 text-xs font-medium text-emerald-700">
          {formatCurrency(event.quoted_price_cents)}
        </div>
      )}
    </div>
  )
}

/** Ghost overlay card shown while dragging */
export function EventKanbanCardOverlay({ event }: { event: KanbanEvent }) {
  return (
    <div className="bg-white rounded-lg border border-brand-300 p-3 shadow-2xl ring-2 ring-brand-400 rotate-1 opacity-95 w-64">
      <p className="text-sm font-semibold text-stone-900 line-clamp-2">{event.occasion}</p>
      <p className="text-xs text-stone-500 mt-1 truncate">{event.client_name}</p>
      <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
        <span className="text-xs text-stone-600">
          {format(parseISO(event.event_date), 'MMM d, yyyy')}
        </span>
        <span className="text-xs text-stone-600">{event.guest_count} guests</span>
      </div>
      {event.quoted_price_cents > 0 && (
        <div className="mt-1.5 text-xs font-medium text-emerald-700">
          {formatCurrency(event.quoted_price_cents)}
        </div>
      )}
    </div>
  )
}

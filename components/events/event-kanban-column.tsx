// Event Kanban Column — droppable column for a single FSM status
'use client'

import { useDroppable } from '@dnd-kit/core'
import { EventKanbanCard } from './event-kanban-card'
import { Badge } from '@/components/ui/badge'
import type { KanbanEvent } from './event-kanban-board'

interface EventKanbanColumnProps {
  status: string
  label: string
  colorClass: string // Tailwind class for the top border, e.g. 'border-stone-400'
  events: KanbanEvent[]
  activeId: string | null
}

export function EventKanbanColumn({
  status,
  label,
  colorClass,
  events,
  activeId,
}: EventKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="flex flex-col min-w-[220px] w-64 flex-shrink-0">
      {/* Column header */}
      <div
        className={[
          'bg-stone-900 rounded-t-xl border border-stone-700 border-t-4 px-3 py-2.5 flex items-center justify-between',
          colorClass,
        ].join(' ')}
      >
        <span className="text-sm font-semibold text-stone-200">{label}</span>
        <Badge variant="default">{events.length}</Badge>
      </div>

      {/* Drop zone / card list */}
      <div
        ref={setNodeRef}
        className={[
          'flex-1 rounded-b-xl border border-t-0 border-stone-700 p-2 space-y-2 min-h-[120px] max-h-[calc(100vh-320px)] overflow-y-auto transition-colors duration-150',
          isOver ? 'bg-brand-950 border-brand-600' : 'bg-stone-800',
        ].join(' ')}
      >
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-20">
            <p className="text-xs text-stone-400 select-none">No events</p>
          </div>
        ) : (
          events.map((event) => (
            <EventKanbanCard key={event.id} event={event} isDragging={activeId === event.id} />
          ))
        )}

        {/* Visual drop target hint when over */}
        {isOver && <div className="h-1 rounded-full bg-brand-800 animate-pulse" />}
      </div>
    </div>
  )
}

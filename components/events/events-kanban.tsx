'use client'

// Events Kanban View
// Displays events grouped into FSM-state columns.
// Read-only — cards link to the event detail page.

import Link from 'next/link'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils/currency'
import { EventStatusBadge } from '@/components/events/event-status-badge'
import type { getEvents } from '@/lib/events/actions'

type Event = Awaited<ReturnType<typeof getEvents>>[number]

type KanbanColumn = {
  key: string
  label: string
  statuses: string[]
  headerClass: string
}

const COLUMNS: KanbanColumn[] = [
  { key: 'draft',       label: 'Draft',       statuses: ['draft'],                      headerClass: 'bg-stone-100 text-stone-700' },
  { key: 'proposed',    label: 'Proposed',    statuses: ['proposed'],                   headerClass: 'bg-violet-100 text-violet-700' },
  { key: 'accepted',    label: 'Accepted',    statuses: ['accepted'],                   headerClass: 'bg-blue-100 text-blue-700' },
  { key: 'paid',        label: 'Paid',        statuses: ['paid'],                       headerClass: 'bg-indigo-100 text-indigo-700' },
  { key: 'confirmed',   label: 'Confirmed',   statuses: ['confirmed'],                  headerClass: 'bg-teal-100 text-teal-700' },
  { key: 'in_progress', label: 'In Progress', statuses: ['in_progress'],                headerClass: 'bg-amber-100 text-amber-700' },
  { key: 'done',        label: 'Done',        statuses: ['completed', 'cancelled'],     headerClass: 'bg-stone-100 text-stone-500' },
]

interface EventsKanbanProps {
  events: Event[]
}

export function EventsKanban({ events }: EventsKanbanProps) {
  const byStatus = new Map<string, Event[]>()
  for (const e of events) {
    const s = e.status
    if (!byStatus.has(s)) byStatus.set(s, [])
    byStatus.get(s)!.push(e)
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3 min-w-max">
        {COLUMNS.map(col => {
          const colEvents = col.statuses.flatMap(s => byStatus.get(s) ?? [])
          // Sort by event date ascending within each column
          colEvents.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())

          return (
            <div key={col.key} className="w-60 flex flex-col gap-2">
              {/* Column header */}
              <div className={`flex items-center justify-between rounded-md px-3 py-2 ${col.headerClass}`}>
                <span className="text-xs font-semibold uppercase tracking-wide">{col.label}</span>
                <span className="text-xs font-medium opacity-70">{colEvents.length}</span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 min-h-[80px]">
                {colEvents.map(event => (
                  <KanbanCard key={event.id} event={event} />
                ))}
                {colEvents.length === 0 && (
                  <div className="rounded-md border border-dashed border-stone-200 px-3 py-4 text-center">
                    <p className="text-xs text-stone-400">Empty</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function KanbanCard({ event }: { event: Event }) {
  const isPast = new Date(event.event_date) < new Date()
  const isTerminal = event.status === 'completed' || event.status === 'cancelled'

  return (
    <Link
      href={`/events/${event.id}`}
      className={`block rounded-lg border bg-white p-3 hover:shadow-md transition-shadow ${
        isTerminal ? 'opacity-60' : ''
      } ${event.status === 'in_progress' ? 'border-amber-300 ring-1 ring-amber-200' : 'border-stone-200'}`}
    >
      <p className="text-xs font-semibold text-stone-900 truncate leading-snug">
        {event.occasion || 'Untitled Event'}
      </p>
      {event.client?.full_name && (
        <p className="text-xs text-stone-500 truncate mt-0.5">{event.client.full_name}</p>
      )}
      <div className="flex items-center justify-between mt-2 gap-1">
        <span className={`text-[10px] font-medium ${isPast && !isTerminal ? 'text-red-500' : 'text-stone-400'}`}>
          {format(new Date(event.event_date), 'MMM d')}
        </span>
        {event.quoted_price_cents != null && event.quoted_price_cents > 0 && (
          <span className="text-[10px] font-medium text-stone-600">
            {formatCurrency(event.quoted_price_cents)}
          </span>
        )}
      </div>
    </Link>
  )
}

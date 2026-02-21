// Event Board Page — Kanban view of all events by FSM status
// Server component: fetches data, hands off to client board component.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEvents } from '@/lib/events/actions'
import { EventKanbanBoard } from '@/components/events/event-kanban-board'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Event Board - ChefFlow' }

export default async function EventBoardPage() {
  await requireChef()
  const events = await getEvents()

  // Map to lean KanbanEvent shape — only fields the board needs
  const boardEvents = events.map((e) => ({
    id: e.id,
    status: e.status,
    occasion: e.occasion ?? 'Untitled Event',
    client_name: (e.client as { full_name?: string } | null)?.full_name ?? 'Unknown',
    event_date: e.event_date,
    guest_count: e.guest_count,
    quoted_price_cents: e.quoted_price_cents ?? 0,
  }))

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Event Board</h1>
          <p className="text-stone-500 mt-1 text-sm">
            Drag events between stages to advance them through the pipeline
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/events">
            <Button variant="secondary">List View</Button>
          </Link>
          <Link href="/events/new">
            <Button>+ New Event</Button>
          </Link>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-2">
        <Link href="/events">
          <Button size="sm" variant="secondary">
            ☰ List
          </Button>
        </Link>
        <Button size="sm" variant="primary" disabled>
          ⊞ Board
        </Button>
      </div>

      {/* Kanban board (client component) */}
      <EventKanbanBoard events={boardEvents} />
    </div>
  )
}

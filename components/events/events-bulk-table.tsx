'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { BulkSelectTable, type BulkAction } from '@/components/ui/bulk-select-table'
import { EventStatusBadge } from '@/components/events/event-status-badge'
import { formatCurrency } from '@/lib/utils/currency'
import { bulkArchiveEvents, bulkDeleteDraftEvents } from '@/lib/events/bulk-actions'

type EventItem = {
  id: string
  occasion: string | null
  event_date: string
  status: string
  quoted_price_cents: number | null
  client: { full_name: string } | null
  weather?: {
    emoji: string
    description: string
    tempMinF: number
    tempMaxF: number
  } | null
}

interface EventsBulkTableProps {
  events: EventItem[]
}

export function EventsBulkTable({ events }: EventsBulkTableProps) {
  const [search, setSearch] = useState('')

  const filteredEvents = useMemo(() => {
    if (!search.trim()) return events
    const q = search.toLowerCase().trim()
    return events.filter(
      (e) =>
        (e.occasion ?? '').toLowerCase().includes(q) ||
        (e.client?.full_name ?? '').toLowerCase().includes(q) ||
        e.event_date.includes(q) ||
        e.status.toLowerCase().includes(q)
    )
  }, [events, search])

  const bulkActions: BulkAction[] = [
    {
      label: 'Archive',
      variant: 'secondary',
      onClick: async (selectedIds) => {
        try {
          const result = await bulkArchiveEvents(selectedIds)
          toast.success(`Archived ${result.count} event${result.count === 1 ? '' : 's'}`)
        } catch (err) {
          toast.error('Failed to archive events')
        }
      },
    },
    {
      label: 'Delete Drafts',
      variant: 'danger',
      confirmMessage:
        'This will delete all selected events that are in draft status. Events in other statuses will be skipped. This cannot be undone.',
      onClick: async (selectedIds) => {
        try {
          const result = await bulkDeleteDraftEvents(selectedIds)
          toast.success(`Deleted ${result.count} draft event${result.count === 1 ? '' : 's'}`)
        } catch (err) {
          toast.error('Failed to delete draft events')
        }
      },
    },
  ]

  return (
    <div className="space-y-3">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx={11} cy={11} r={8} />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events by occasion, client, date..."
          className="w-full bg-stone-800 border border-stone-700 rounded-lg pl-9 pr-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
        />
        {search && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <span className="text-xs text-stone-500">
              {filteredEvents.length} of {events.length}
            </span>
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearch('')}
              className="text-stone-500 hover:text-stone-300"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
      <BulkSelectTable
        items={filteredEvents}
        bulkActions={bulkActions}
        renderHeader={() => (
          <>
            <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider">
              Occasion
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider">
              Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider">
              Client
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider">
              Quoted Price
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider">
              Actions
            </th>
          </>
        )}
        renderRow={(event) => (
          <>
            <td className="px-4 py-3 font-medium">
              <Link
                href={`/events/${event.id}`}
                className="text-brand-600 hover:text-brand-300 hover:underline"
              >
                {event.occasion || 'Untitled Event'}
              </Link>
            </td>
            <td className="px-4 py-3">
              <span>{format(new Date(event.event_date), 'MMM d, yyyy')}</span>
              {event.weather && (
                <span
                  className="ml-1.5 text-xs text-stone-400"
                  title={`${event.weather.description} — ${event.weather.tempMinF}\u00B0\u2013${event.weather.tempMaxF}\u00B0F`}
                >
                  {event.weather.emoji} {event.weather.tempMinF}&deg;&ndash;
                  {event.weather.tempMaxF}&deg;
                </span>
              )}
            </td>
            <td className="px-4 py-3">{event.client?.full_name || 'Unknown'}</td>
            <td className="px-4 py-3">
              <EventStatusBadge
                status={
                  event.status as import('@/components/events/event-status-badge').EventStatus
                }
              />
            </td>
            <td className="px-4 py-3">{formatCurrency(event.quoted_price_cents ?? 0)}</td>
            <td className="px-4 py-3">
              <div className="flex gap-2">
                <Link href={`/events/${event.id}`}>
                  <Button size="sm" variant="secondary">
                    View
                  </Button>
                </Link>
                {event.status === 'draft' && (
                  <Link href={`/events/${event.id}/edit`}>
                    <Button size="sm" variant="secondary">
                      Edit
                    </Button>
                  </Link>
                )}
              </div>
            </td>
          </>
        )}
      />
    </div>
  )
}

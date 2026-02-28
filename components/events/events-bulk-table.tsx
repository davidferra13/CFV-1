'use client'

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
    <BulkSelectTable
      items={events}
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
            <EventStatusBadge status={event.status} />
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
  )
}

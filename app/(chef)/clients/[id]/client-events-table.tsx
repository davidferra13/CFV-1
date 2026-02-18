'use client'

import { useState, useMemo } from 'react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import Link from 'next/link'
type EventRow = {
  id: string
  occasion: string | null
  event_date: string
  guest_count: number
  status: string
  quoted_price_cents: number | null
}

interface ClientEventsTableProps {
  events: EventRow[]
}

export function ClientEventsTable({ events }: ClientEventsTableProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Filter events by status
  const filteredEvents = useMemo(() => {
    if (statusFilter === 'all') {
      return events
    }
    return events.filter(event => event.status === statusFilter)
  }, [events, statusFilter])

  function getStatusBadgeVariant(status: string) {
    switch (status) {
      case 'completed':
        return 'success'
      case 'cancelled':
        return 'error'
      case 'confirmed':
      case 'paid':
        return 'info'
      case 'draft':
        return 'default'
      default:
        return 'warning'
    }
  }

  // Get unique statuses for filter
  const uniqueStatuses = Array.from(new Set(events.map(e => e.status)))

  return (
    <div className="space-y-4">
      {/* Status Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-stone-700">Filter by status:</span>
        <Button
          variant={statusFilter === 'all' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setStatusFilter('all')}
        >
          All ({events.length})
        </Button>
        {uniqueStatuses.map(status => {
          const count = events.filter(e => e.status === status).length
          return (
            <Button
              key={status}
              variant={statusFilter === status ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} ({count})
            </Button>
          )
        })}
      </div>

      {/* Events Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Event Title</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Guests</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total Amount</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredEvents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-stone-500 py-8">
                No events found for this status
              </TableCell>
            </TableRow>
          ) : (
            filteredEvents.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="font-medium">{event.occasion || 'Untitled Event'}</TableCell>
                <TableCell className="text-stone-600">
                  {format(new Date(event.event_date), 'PPP')}
                </TableCell>
                <TableCell className="text-stone-600">{event.guest_count}</TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(event.status)}>
                    {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(event.quoted_price_cents ?? 0)}
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/events/${event.id}`}>
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <p className="text-sm text-stone-500 text-center">
        Showing {filteredEvents.length} of {events.length} events
      </p>
    </div>
  )
}

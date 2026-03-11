import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEvents } from '@/lib/events/actions'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'

export const metadata: Metadata = { title: 'Event History - ChefFlow' }

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-900 text-green-200',
  cancelled: 'bg-stone-700 text-stone-500',
  in_progress: 'bg-blue-900 text-blue-200',
  confirmed: 'bg-teal-900 text-teal-200',
  paid: 'bg-emerald-900 text-emerald-200',
  accepted: 'bg-sky-900 text-sky-200',
  proposed: 'bg-amber-900 text-amber-200',
  draft: 'bg-stone-800 text-stone-400',
}

export default async function EventHistoryPage() {
  await requireChef()
  const events = await getEvents()

  const pastEvents = events
    .filter((e: any) => new Date(e.event_date) < new Date())
    .sort((a: any, b: any) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())

  const completedEvents = pastEvents.filter((e: any) => e.status === 'completed')
  const totalRevenue = completedEvents.reduce(
    (sum: any, e: any) => sum + (e.quoted_price_cents ?? 0),
    0
  )

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clients/history" className="text-sm text-stone-500 hover:text-stone-300">
          ← Client History
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Event History</h1>
          <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
            {pastEvents.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">
          Complete timeline of all past events across every client
        </p>
      </div>

      {pastEvents.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-2xl font-bold text-stone-100">{pastEvents.length}</p>
            <p className="text-sm text-stone-500 mt-1">Past events</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-green-200">{completedEvents.length}</p>
            <p className="text-sm text-stone-500 mt-1">Completed</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-amber-200">{formatCurrency(totalRevenue)}</p>
            <p className="text-sm text-stone-500 mt-1">Revenue from completed</p>
          </Card>
        </div>
      )}

      {pastEvents.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium mb-1">No past events yet</p>
          <p className="text-stone-400 text-sm">Completed events will appear here</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Occasion</TableHead>
                <TableHead>Guests</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pastEvents.map((event: any) => (
                <TableRow key={event.id}>
                  <TableCell className="text-stone-400 text-sm whitespace-nowrap">
                    {format(new Date(event.event_date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="font-medium">
                    {event.client ? (
                      <Link
                        href={`/clients/${event.client.id}`}
                        className="text-brand-600 hover:text-brand-300 hover:underline"
                      >
                        {event.client.full_name}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm capitalize">
                    {event.occasion?.replace(/_/g, ' ') ?? '—'}
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm">
                    {event.guest_count ?? '—'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[event.status] ?? 'bg-stone-800 text-stone-400'}`}
                    >
                      {event.status.replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm">
                    {event.quoted_price_cents != null
                      ? formatCurrency(event.quoted_price_cents)
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Link href={`/events/${event.id}`}>
                      <span className="text-xs text-brand-600 hover:underline cursor-pointer">
                        View
                      </span>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

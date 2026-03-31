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

export const metadata: Metadata = { title: 'Revenue by Event' }

export default async function RevenueByEventPage() {
  await requireChef()
  const events = await getEvents()

  const revenueEvents = events
    .filter((e: any) => (e.quoted_price_cents ?? 0) > 0)
    .sort((a: any, b: any) => (b.quoted_price_cents ?? 0) - (a.quoted_price_cents ?? 0))

  const totalRevenue = revenueEvents.reduce((s: any, e: any) => s + (e.quoted_price_cents ?? 0), 0)
  const completedRevenue = revenueEvents
    .filter((e: any) => e.status === 'completed')
    .reduce((s: any, e: any) => s + (e.quoted_price_cents ?? 0), 0)

  const avgRevenue = revenueEvents.length > 0 ? Math.round(totalRevenue / revenueEvents.length) : 0

  const STATUS_COLORS: Record<string, string> = {
    completed: 'bg-stone-800 text-stone-400',
    in_progress: 'bg-brand-900 text-brand-700',
    confirmed: 'bg-emerald-900 text-emerald-700',
    paid: 'bg-green-900 text-green-700',
    accepted: 'bg-amber-900 text-amber-700',
    proposed: 'bg-stone-800 text-stone-500',
    draft: 'bg-stone-800 text-stone-400',
    cancelled: 'bg-red-900 text-red-500',
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/reporting" className="text-sm text-stone-500 hover:text-stone-300">
          ← Reporting
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Revenue by Event</h1>
        <p className="text-stone-500 mt-1">
          All events with a quoted price, ranked by invoice value
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-700">{formatCurrency(totalRevenue)}</p>
          <p className="text-sm text-stone-500 mt-1">Total invoice value</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{formatCurrency(completedRevenue)}</p>
          <p className="text-sm text-stone-500 mt-1">Completed events</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-400">{formatCurrency(avgRevenue)}</p>
          <p className="text-sm text-stone-500 mt-1">Average event value</p>
        </Card>
      </div>

      {revenueEvents.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No events with quoted prices</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Event Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Occasion</TableHead>
                <TableHead>Guests</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revenueEvents.map((event: any, idx: any) => (
                <TableRow key={event.id}>
                  <TableCell className="text-stone-400 text-sm">{idx + 1}</TableCell>
                  <TableCell className="text-stone-400 text-sm">
                    {format(new Date(event.event_date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="font-medium">
                    {event.client ? (
                      <Link
                        href={`/clients/${event.client.id}`}
                        className="text-brand-600 hover:underline"
                      >
                        {event.client.full_name}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm capitalize">
                    {event.occasion?.replace(/_/g, ' ') ?? '-'}
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm">
                    {event.guest_count ?? '-'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[event.status] ?? 'bg-stone-800 text-stone-400'}`}
                    >
                      {event.status.replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="text-stone-100 font-semibold text-sm">
                    <Link href={`/events/${event.id}`} className="hover:underline">
                      {formatCurrency(event.quoted_price_cents ?? 0)}
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

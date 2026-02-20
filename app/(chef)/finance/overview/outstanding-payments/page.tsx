import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEvents } from '@/lib/events/actions'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'
import { format, differenceInDays } from 'date-fns'

export const metadata: Metadata = { title: 'Outstanding Payments - ChefFlow' }

export default async function OutstandingPaymentsPage() {
  await requireChef()
  const events = await getEvents()

  const now = new Date()
  const outstanding = events
    .filter(e =>
      new Date(e.event_date) < now &&
      !['completed', 'cancelled'].includes(e.status) &&
      (e.quoted_price_cents ?? 0) > 0
    )
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())

  const totalOutstanding = outstanding.reduce((sum, e) => sum + (e.quoted_price_cents ?? 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/overview" className="text-sm text-stone-500 hover:text-stone-700">← Overview</Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-900">Outstanding Payments</h1>
          <span className={`text-sm px-2 py-0.5 rounded-full ${outstanding.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600'}`}>
            {outstanding.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">Past events that haven&apos;t been marked as completed or cancelled</p>
      </div>

      {outstanding.length > 0 && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <p className="text-2xl font-bold text-amber-900">{formatCurrency(totalOutstanding)}</p>
          <p className="text-sm text-amber-700 mt-1">Total outstanding across {outstanding.length} events</p>
        </Card>
      )}

      {outstanding.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-600 font-medium">No outstanding payments</p>
          <p className="text-stone-400 text-sm mt-1">All past events are resolved</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Date</TableHead>
                <TableHead>Days Overdue</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Occasion</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outstanding.map(event => {
                const daysOver = differenceInDays(now, new Date(event.event_date))
                return (
                  <TableRow key={event.id}>
                    <TableCell className="text-stone-600 text-sm">{format(new Date(event.event_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className={`text-sm font-semibold ${daysOver > 30 ? 'text-red-600' : 'text-amber-700'}`}>
                      {daysOver}d
                    </TableCell>
                    <TableCell className="font-medium">
                      {event.client ? (
                        <Link href={`/clients/${event.client.id}`} className="text-brand-600 hover:underline">{event.client.full_name}</Link>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-stone-600 text-sm capitalize">{event.occasion?.replace(/_/g, ' ') ?? '—'}</TableCell>
                    <TableCell>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 capitalize">
                        {event.status.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="text-stone-900 font-semibold text-sm">
                      {event.quoted_price_cents != null ? formatCurrency(event.quoted_price_cents) : '—'}
                    </TableCell>
                    <TableCell>
                      <Link href={`/events/${event.id}`}>
                        <span className="text-xs text-brand-600 hover:underline cursor-pointer">View</span>
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

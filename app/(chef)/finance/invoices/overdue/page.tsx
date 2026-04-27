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
import { format, differenceInDays } from 'date-fns'

export const metadata: Metadata = { title: 'Overdue Invoices' }

export default async function OverdueInvoicesPage() {
  await requireChef()
  const events = await getEvents()

  const now = new Date()
  // Compare date strings only (YYYY-MM-DD) to avoid timezone issues where
  // today's event shows as overdue because new Date('2026-04-17') is midnight UTC
  // but new Date() is local time ahead of UTC.
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const overdue = events
    .filter(
      (e: any) => (e.event_date ?? '') < todayStr && !['completed', 'cancelled'].includes(e.status)
    )
    .sort((a: any, b: any) => (a.event_date ?? '').localeCompare(b.event_date ?? ''))

  const totalValue = overdue.reduce((s: any, e: any) => s + (e.quoted_price_cents ?? 0), 0)
  const criticalCount = overdue.filter(
    (e: any) => differenceInDays(now, new Date(e.event_date)) > 30
  ).length

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/invoices" className="text-sm text-stone-500 hover:text-stone-300">
          ← Invoices
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Overdue Invoices</h1>
          <span
            className={`text-sm px-2 py-0.5 rounded-full ${overdue.length > 0 ? 'bg-red-900 text-red-600' : 'bg-stone-800 text-stone-400'}`}
          >
            {overdue.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">Past events that haven&apos;t been resolved</p>
      </div>

      {overdue.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="p-4 bg-red-950 border-red-200">
            <p className="text-2xl font-bold text-red-900">{formatCurrency(totalValue)}</p>
            <p className="text-sm text-red-700 mt-1">Total overdue value</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-amber-700">{overdue.length}</p>
            <p className="text-sm text-stone-500 mt-1">Overdue events</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
            <p className="text-sm text-stone-500 mt-1">Critical (&gt;30 days)</p>
          </Card>
        </div>
      )}

      {overdue.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No overdue invoices</p>
          <p className="text-stone-400 text-sm mt-1">All past events have been resolved</p>
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
                <TableHead>Value</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overdue.map((event: any) => {
                const daysOver = differenceInDays(now, new Date(event.event_date))
                return (
                  <TableRow key={event.id}>
                    <TableCell className="text-stone-400 text-sm">
                      {format(new Date(event.event_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell
                      className={`text-sm font-semibold ${daysOver > 30 ? 'text-red-600' : 'text-amber-700'}`}
                    >
                      {daysOver}d
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
                    <TableCell>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 capitalize">
                        {event.status.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="text-stone-100 font-semibold text-sm">
                      {event.quoted_price_cents != null
                        ? formatCurrency(event.quoted_price_cents)
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Link href={`/events/${event.id}`}>
                        <span className="text-xs text-brand-600 hover:underline cursor-pointer">
                          View
                        </span>
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

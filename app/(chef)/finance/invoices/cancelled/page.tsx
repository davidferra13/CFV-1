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

export const metadata: Metadata = { title: 'Cancelled Invoices' }

export default async function CancelledInvoicesPage() {
  await requireChef()
  const events = await getEvents()

  const cancelled = events
    .filter((e: any) => e.status === 'cancelled')
    .sort((a: any, b: any) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())

  const totalLost = cancelled.reduce((s: any, e: any) => s + (e.quoted_price_cents ?? 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/invoices" className="text-sm text-stone-500 hover:text-stone-300">
          ← Invoices
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Cancelled Invoices</h1>
          <span className="bg-stone-700 text-stone-500 text-sm px-2 py-0.5 rounded-full">
            {cancelled.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">Events that were cancelled before completion</p>
      </div>

      {cancelled.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <p className="text-2xl font-bold text-stone-500">{cancelled.length}</p>
            <p className="text-sm text-stone-500 mt-1">Cancelled events</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-stone-500">{formatCurrency(totalLost)}</p>
            <p className="text-sm text-stone-500 mt-1">Lost invoice value</p>
          </Card>
        </div>
      )}

      {cancelled.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No cancelled invoices</p>
          <p className="text-stone-400 text-sm mt-1">Cancelled events will appear here</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Occasion</TableHead>
                <TableHead>Guests</TableHead>
                <TableHead>Invoice Value</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cancelled.map((event: any) => (
                <TableRow key={event.id} className="opacity-75">
                  <TableCell className="text-stone-500 text-sm">
                    {format(new Date(event.event_date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="font-medium text-stone-400">
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
                  <TableCell className="text-stone-500 text-sm capitalize">
                    {event.occasion?.replace(/_/g, ' ') ?? '-'}
                  </TableCell>
                  <TableCell className="text-stone-500 text-sm">
                    {event.guest_count ?? '-'}
                  </TableCell>
                  <TableCell className="text-stone-500 font-semibold text-sm line-through">
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
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

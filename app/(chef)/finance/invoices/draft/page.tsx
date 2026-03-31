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

export const metadata: Metadata = { title: 'Draft Invoices' }

export default async function DraftInvoicesPage() {
  await requireChef()
  const events = await getEvents()

  const drafts = events
    .filter((e: any) => ['draft', 'proposed'].includes(e.status))
    .sort((a: any, b: any) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())

  const totalValue = drafts.reduce((s: any, e: any) => s + (e.quoted_price_cents ?? 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/invoices" className="text-sm text-stone-500 hover:text-stone-300">
          ← Invoices
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Draft Invoices</h1>
          <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
            {drafts.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">Events not yet sent to the client</p>
      </div>

      {drafts.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <p className="text-2xl font-bold text-stone-100">{drafts.length}</p>
            <p className="text-sm text-stone-500 mt-1">Draft invoices</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-stone-300">{formatCurrency(totalValue)}</p>
            <p className="text-sm text-stone-500 mt-1">Potential value</p>
          </Card>
        </div>
      )}

      {drafts.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No draft invoices</p>
          <p className="text-stone-400 text-sm mt-1">
            Events in draft or proposed state will appear here
          </p>
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
                <TableHead>Status</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drafts.map((event: any) => (
                <TableRow key={event.id}>
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
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

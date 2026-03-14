import type { Metadata } from 'next'
import Link from 'next/link'
import { format } from 'date-fns'
import { requireChef } from '@/lib/auth/get-user'
import { getEvents } from '@/lib/events/actions'
import { listInvoicePaymentStatusSummaries } from '@/lib/finance/invoice-payment-link-actions'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'
import { InvoicePaymentLinkButton } from '@/components/finance/invoice-payment-link-button'

export const metadata: Metadata = { title: 'Sent Invoices - ChefFlow' }

function paymentStatusBadgeVariant(status: string): 'default' | 'warning' | 'success' | 'error' {
  if (status === 'paid') return 'success'
  if (status === 'partially_paid' || status === 'deposit_paid') return 'warning'
  if (status === 'overdue') return 'error'
  return 'default'
}

function paymentStatusLabel(status: string) {
  return status.replace(/_/g, ' ')
}

export default async function SentInvoicesPage() {
  await requireChef()
  const events = await getEvents()

  const sent = events
    .filter((e: any) => e.status === 'accepted')
    .sort((a: any, b: any) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())

  const totalValue = sent.reduce(
    (sum: number, event: any) => sum + (event.quoted_price_cents ?? 0),
    0
  )
  const paymentStatuses = await listInvoicePaymentStatusSummaries(
    sent.map((event: any) => String(event.id))
  )

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/invoices" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Invoices
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Sent Invoices</h1>
          <span className="bg-amber-900 text-amber-700 text-sm px-2 py-0.5 rounded-full">
            {sent.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">Awaiting client acceptance and payment</p>
      </div>

      {sent.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <p className="text-2xl font-bold text-amber-700">{sent.length}</p>
            <p className="text-sm text-stone-500 mt-1">Awaiting acceptance</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-stone-100">{formatCurrency(totalValue)}</p>
            <p className="text-sm text-stone-500 mt-1">Total value pending</p>
          </Card>
        </div>
      )}

      {sent.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No sent invoices awaiting acceptance</p>
          <p className="text-stone-400 text-sm mt-1">Events in accepted state will appear here</p>
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
                <TableHead>Payment Status</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sent.map((event: any) => {
                const summary = paymentStatuses[String(event.id)] ?? null
                const paymentStatus = summary?.paymentStatus ?? 'unpaid'
                const outstandingCents =
                  summary?.outstandingBalanceCents ?? event.quoted_price_cents ?? 0

                return (
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
                    <TableCell className="text-stone-100 font-semibold text-sm">
                      {event.quoted_price_cents != null
                        ? formatCurrency(event.quoted_price_cents)
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={paymentStatusBadgeVariant(paymentStatus)}>
                        {paymentStatusLabel(paymentStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm">
                      {formatCurrency(outstandingCents)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <InvoicePaymentLinkButton eventId={String(event.id)} />
                        <Link href={`/events/${event.id}`}>
                          <span className="text-xs text-brand-600 hover:underline cursor-pointer">
                            View
                          </span>
                        </Link>
                      </div>
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

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEvents } from '@/lib/events/actions'
import { getLedgerEntries } from '@/lib/ledger/actions'
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

export const metadata: Metadata = { title: 'Refunded Invoices' }

export default async function RefundedInvoicesPage() {
  await requireChef()
  const [events, refundEntries] = await Promise.all([
    getEvents(),
    getLedgerEntries({ entryType: 'refund' }),
  ])

  const refundMap = new Map<string, number>()
  for (const entry of refundEntries) {
    if (entry.event_id) {
      refundMap.set(entry.event_id, (refundMap.get(entry.event_id) ?? 0) + entry.amount_cents)
    }
  }

  const refunded = events
    .filter((e: any) => refundMap.has(e.id))
    .sort((a: any, b: any) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())

  const totalRefunded = Array.from(refundMap.values()).reduce((s, v) => s + v, 0)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/invoices" className="text-sm text-stone-500 hover:text-stone-300">
          ← Invoices
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Refunded Invoices</h1>
          <span className="bg-purple-900 text-purple-700 text-sm px-2 py-0.5 rounded-full">
            {refunded.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">Events with at least one refund ledger entry</p>
      </div>

      {refunded.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <p className="text-2xl font-bold text-purple-700">{refunded.length}</p>
            <p className="text-sm text-stone-500 mt-1">Events with refunds</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalRefunded)}</p>
            <p className="text-sm text-stone-500 mt-1">Total refunded</p>
          </Card>
        </div>
      )}

      {refunded.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No refunded invoices</p>
          <p className="text-stone-400 text-sm mt-1">Events with refund entries will appear here</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Occasion</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invoice Value</TableHead>
                <TableHead>Refund Amount</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {refunded.map((event: any) => (
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
                  <TableCell className="text-red-600 font-semibold text-sm">
                    −{formatCurrency(refundMap.get(event.id) ?? 0)}
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

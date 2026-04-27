import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
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

export const metadata: Metadata = { title: 'Refunds' }

export default async function RefundsPage() {
  await requireChef()
  const refunds = await getLedgerEntries({ entryType: 'refund' })

  const totalRefunded = refunds.reduce((s: any, e: any) => s + e.amount_cents, 0)

  // Count unique events with refunds
  const uniqueEvents = new Set(refunds.map((e: any) => e.event_id).filter(Boolean)).size

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/payments" className="text-sm text-stone-500 hover:text-stone-300">
          ← Payments
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Refunds</h1>
          <span
            className={`text-sm px-2 py-0.5 rounded-full ${refunds.length > 0 ? 'bg-red-900 text-red-600' : 'bg-stone-800 text-stone-400'}`}
          >
            {refunds.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">Payments returned to clients</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalRefunded)}</p>
          <p className="text-sm text-stone-500 mt-1">Total refunded</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{refunds.length}</p>
          <p className="text-sm text-stone-500 mt-1">Refund entries</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-400">{uniqueEvents}</p>
          <p className="text-sm text-stone-500 mt-1">Events with refunds</p>
        </Card>
      </div>

      {refunds.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No refunds recorded</p>
          <p className="text-stone-400 text-sm mt-1">
            Refund entries will appear here when processed
          </p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {refunds.map((entry: any) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-stone-500 text-sm">
                    {format(new Date(entry.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm">
                    {entry.event ? (
                      <Link
                        href={`/events/${entry.event.id}`}
                        className="text-brand-600 hover:underline capitalize"
                      >
                        {entry.event.occasion?.replace(/_/g, ' ') ?? 'Event'}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm">{entry.description}</TableCell>
                  <TableCell className="text-red-600 font-semibold text-sm">
                    −{formatCurrency(entry.amount_cents)}
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

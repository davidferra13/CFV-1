import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getLedgerEntries } from '@/lib/ledger/actions'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'

export const metadata: Metadata = { title: 'Manual Payments - ChefFlow' }

// Manual payments are ledger entries with description containing offline method keywords,
// or all payment-type entries that weren't processed via Stripe (tip-off: no stripe metadata)
// We surface all payment + deposit + final_payment types here as a complete record
const MANUAL_ENTRY_TYPES = ['payment', 'deposit', 'installment', 'final_payment'] as const

export default async function ManualPaymentsPage() {
  await requireChef()

  const [payments, deposits, installments, finalPayments] = await Promise.all([
    getLedgerEntries({ entryType: 'payment' }),
    getLedgerEntries({ entryType: 'deposit' }),
    getLedgerEntries({ entryType: 'installment' }),
    getLedgerEntries({ entryType: 'final_payment' }),
  ])

  const allEntries = [...payments, ...deposits, ...installments, ...finalPayments].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const totalReceived = allEntries.reduce((s, e) => s + e.amount_cents, 0)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/payouts" className="text-sm text-stone-500 hover:text-stone-700">← Payouts</Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-900">Manual Payments</h1>
          <span className="bg-green-100 text-green-700 text-sm px-2 py-0.5 rounded-full">{allEntries.length}</span>
        </div>
        <p className="text-stone-500 mt-1">All recorded payment ledger entries — cash, Venmo, Zelle, card, and other methods</p>
      </div>

      <Card className="p-4 bg-sky-50 border-sky-200">
        <p className="text-sm text-sky-800 font-medium">About this view</p>
        <p className="text-sm text-sky-700 mt-1">
          This shows all inbound payment ledger entries. Offline payments (cash, Venmo, Zelle) recorded via the
          &quot;Record Payment&quot; button on event pages appear here alongside Stripe-processed payments.
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-700">{formatCurrency(totalReceived)}</p>
          <p className="text-sm text-stone-500 mt-1">Total received</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-900">{allEntries.length}</p>
          <p className="text-sm text-stone-500 mt-1">Payment entries</p>
        </Card>
      </div>

      {allEntries.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-600 font-medium">No payment entries recorded</p>
          <p className="text-stone-400 text-sm mt-1">Use &quot;Record Payment&quot; on any event to log a manual payment</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allEntries.map(entry => (
                <TableRow key={entry.id}>
                  <TableCell className="text-stone-500 text-sm">{format(new Date(entry.created_at), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 capitalize">
                      {entry.entry_type.replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="text-stone-600 text-sm">
                    {entry.event ? (
                      <Link href={`/events/${entry.event.id}`} className="text-brand-600 hover:underline capitalize">
                        {entry.event.occasion?.replace(/_/g, ' ') ?? 'Event'}
                      </Link>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-stone-600 text-sm">{entry.description}</TableCell>
                  <TableCell className="text-green-700 font-semibold text-sm">+{formatCurrency(entry.amount_cents)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

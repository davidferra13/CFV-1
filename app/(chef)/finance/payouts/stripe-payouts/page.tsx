import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getLedgerEntries } from '@/lib/ledger/actions'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'

export const metadata: Metadata = { title: 'Stripe Payouts - ChefFlow' }

export default async function StripePayoutsPage() {
  await requireChef()

  // All inbound payment entries represent Stripe-processed revenue
  const [payments, deposits, finalPayments] = await Promise.all([
    getLedgerEntries({ entryType: 'payment' }),
    getLedgerEntries({ entryType: 'deposit' }),
    getLedgerEntries({ entryType: 'final_payment' }),
  ])

  const allEntries = [...payments, ...deposits, ...finalPayments].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const totalProcessed = allEntries.reduce((s, e) => s + e.amount_cents, 0)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/payouts" className="text-sm text-stone-500 hover:text-stone-700">← Payouts</Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-900">Stripe Payouts</h1>
          <span className="bg-violet-100 text-violet-700 text-sm px-2 py-0.5 rounded-full">{allEntries.length}</span>
        </div>
        <p className="text-stone-500 mt-1">Payment entries recorded in the ledger via Stripe or manual recording</p>
      </div>

      <Card className="p-4 bg-violet-50 border-violet-200">
        <p className="text-sm text-violet-800 font-medium">Stripe Connect payout schedule</p>
        <p className="text-sm text-violet-700 mt-1">
          Stripe typically transfers funds to your bank account on a rolling basis (usually T+2 business days
          after each charge). For the exact payout schedule and detailed transfer history, visit your{' '}
          <strong>Stripe Dashboard → Payouts</strong>. The entries below reflect payments recorded in ChefFlow.
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-700">{formatCurrency(totalProcessed)}</p>
          <p className="text-sm text-stone-500 mt-1">Total payment entries</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-900">{allEntries.length}</p>
          <p className="text-sm text-stone-500 mt-1">Payment records</p>
        </Card>
      </div>

      {allEntries.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-600 font-medium">No payment entries recorded</p>
          <p className="text-stone-400 text-sm mt-1">Payments appear here once clients pay their event invoices</p>
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
                    <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 capitalize">
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

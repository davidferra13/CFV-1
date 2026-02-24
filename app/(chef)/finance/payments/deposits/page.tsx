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

export const metadata: Metadata = { title: 'Deposits - ChefFlow' }

export default async function DepositsPage() {
  await requireChef()
  const deposits = await getLedgerEntries({ entryType: 'deposit' })

  const totalDeposits = deposits.reduce((s, e) => s + e.amount_cents, 0)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/payments" className="text-sm text-stone-500 hover:text-stone-300">
          ← Payments
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Deposits</h1>
          <span className="bg-green-900 text-green-700 text-sm px-2 py-0.5 rounded-full">
            {deposits.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">Deposit payments received from clients</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-700">{formatCurrency(totalDeposits)}</p>
          <p className="text-sm text-stone-500 mt-1">Total deposits received</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{deposits.length}</p>
          <p className="text-sm text-stone-500 mt-1">Deposit payments</p>
        </Card>
      </div>

      {deposits.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No deposit payments recorded</p>
          <p className="text-stone-400 text-sm mt-1">
            Deposits appear in the ledger when clients pay
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
              {deposits.map((entry) => (
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
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm">{entry.description}</TableCell>
                  <TableCell className="text-green-700 font-semibold text-sm">
                    +{formatCurrency(entry.amount_cents)}
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

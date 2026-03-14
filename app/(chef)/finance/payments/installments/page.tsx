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

export const metadata: Metadata = { title: 'Installments - ChefFlow' }

const INSTALLMENT_TYPES = ['installment', 'final_payment'] as const

export default async function InstallmentsPage() {
  await requireChef()

  const [installments, finalPayments] = await Promise.all([
    getLedgerEntries({ entryType: 'installment' }),
    getLedgerEntries({ entryType: 'final_payment' }),
  ])

  const allEntries = [...installments, ...finalPayments].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const totalInstallments = installments.reduce((s: any, e: any) => s + e.amount_cents, 0)
  const totalFinal = finalPayments.reduce((s: any, e: any) => s + e.amount_cents, 0)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/payments" className="text-sm text-stone-500 hover:text-stone-300">
          ← Payments
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Installments</h1>
          <span className="bg-blue-900 text-blue-700 text-sm px-2 py-0.5 rounded-full">
            {allEntries.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">Installment and final payment entries</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-700">
            {formatCurrency(totalInstallments + totalFinal)}
          </p>
          <p className="text-sm text-stone-500 mt-1">Total received</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalInstallments)}</p>
          <p className="text-sm text-stone-500 mt-1">Installments ({installments.length})</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-emerald-700">{formatCurrency(totalFinal)}</p>
          <p className="text-sm text-stone-500 mt-1">Final payments ({finalPayments.length})</p>
        </Card>
      </div>

      {allEntries.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No installment payments recorded</p>
          <p className="text-stone-400 text-sm mt-1">
            Installment and final payment entries will appear here
          </p>
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
              {allEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-stone-500 text-sm">
                    {format(new Date(entry.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full capitalize ${entry.entry_type === 'final_payment' ? 'bg-emerald-900 text-emerald-700' : 'bg-blue-900 text-blue-700'}`}
                    >
                      {entry.entry_type.replace(/_/g, ' ')}
                    </span>
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

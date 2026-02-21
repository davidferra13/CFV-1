import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getLedgerEntries } from '@/lib/ledger/actions'
import { exportLedgerEntriesCSV } from '@/lib/finance/export-actions'
import { CSVDownloadButton } from '@/components/exports/csv-download-button'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'

export const metadata: Metadata = { title: 'Transaction Log - ChefFlow' }

const ENTRY_TYPE_STYLES: Record<string, string> = {
  payment: 'bg-green-100 text-green-700',
  deposit: 'bg-emerald-100 text-emerald-700',
  installment: 'bg-teal-100 text-teal-700',
  final_payment: 'bg-green-100 text-green-800',
  add_on: 'bg-blue-100 text-blue-700',
  credit: 'bg-sky-100 text-sky-700',
  tip: 'bg-amber-100 text-amber-700',
  refund: 'bg-red-100 text-red-700',
}

export default async function TransactionLogPage() {
  await requireChef()
  const entries = await getLedgerEntries()

  const totalIn = entries.filter(e => !e.is_refund && e.entry_type !== 'refund').reduce((s, e) => s + e.amount_cents, 0)
  const totalOut = entries.filter(e => e.is_refund || e.entry_type === 'refund').reduce((s, e) => s + Math.abs(e.amount_cents), 0)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/ledger" className="text-sm text-stone-500 hover:text-stone-700">← Ledger</Link>
        <div className="flex items-start justify-between mt-1">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-stone-900">Transaction Log</h1>
              <span className="bg-stone-100 text-stone-600 text-sm px-2 py-0.5 rounded-full">{entries.length}</span>
            </div>
            <p className="text-stone-500 mt-1">Complete chronological record of all financial transactions</p>
          </div>
          <CSVDownloadButton action={exportLedgerEntriesCSV} label="Export CSV" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-900">{entries.length}</p>
          <p className="text-sm text-stone-500 mt-1">Total entries</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-700">{formatCurrency(totalIn)}</p>
          <p className="text-sm text-stone-500 mt-1">Total collected</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalOut)}</p>
          <p className="text-sm text-stone-500 mt-1">Total refunded</p>
        </Card>
      </div>

      {entries.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-600 font-medium">No transactions yet</p>
          <p className="text-stone-400 text-sm mt-1">Ledger entries appear here as payments are recorded</p>
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
                <TableHead>Method</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map(entry => (
                <TableRow key={entry.id}>
                  <TableCell className="text-stone-500 text-sm whitespace-nowrap">
                    {format(new Date(entry.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${ENTRY_TYPE_STYLES[entry.entry_type] ?? 'bg-stone-100 text-stone-600'}`}>
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
                  <TableCell className="text-stone-600 text-sm max-w-xs truncate">{entry.description}</TableCell>
                  <TableCell className="text-stone-500 text-sm capitalize">{entry.payment_method?.replace(/_/g, ' ') ?? '—'}</TableCell>
                  <TableCell className={`text-sm font-semibold ${entry.is_refund ? 'text-red-600' : 'text-green-700'}`}>
                    {entry.is_refund ? '−' : '+'}{formatCurrency(Math.abs(entry.amount_cents))}
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

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getLedgerEntries } from '@/lib/ledger/actions'
import { exportLedgerEntriesCSV } from '@/lib/finance/export-actions'
import { CSVDownloadButton } from '@/components/exports/csv-download-button'
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

export const metadata: Metadata = { title: 'Transaction Log' }

const ENTRY_TYPE_STYLES: Record<string, string> = {
  payment: 'bg-green-900 text-green-700',
  deposit: 'bg-emerald-900 text-emerald-700',
  installment: 'bg-teal-900 text-teal-700',
  final_payment: 'bg-green-900 text-green-800',
  add_on: 'bg-brand-900 text-brand-700',
  credit: 'bg-brand-900 text-brand-700',
  tip: 'bg-amber-900 text-amber-700',
  refund: 'bg-red-900 text-red-700',
}

export default async function TransactionLogPage({
  searchParams,
}: {
  searchParams: { eventId?: string }
}) {
  await requireChef()
  const filters: { eventId?: string } = {}
  if (searchParams.eventId) {
    filters.eventId = searchParams.eventId
  }
  const entries = await getLedgerEntries(filters)

  // When filtered by event, grab the event name from the first entry (all share the same event)
  const filteredEventName =
    searchParams.eventId && entries.length > 0
      ? ((entries[0] as any).event?.occasion?.replace(/_/g, ' ') ?? 'Event')
      : null

  const totalIn = entries
    .filter((e: any) => !e.is_refund && e.entry_type !== 'refund')
    .reduce((s: any, e: any) => s + e.amount_cents, 0)
  const totalOut = entries
    .filter((e: any) => e.is_refund || e.entry_type === 'refund')
    .reduce((s: any, e: any) => s + Math.abs(e.amount_cents), 0)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/ledger" className="text-sm text-stone-500 hover:text-stone-300">
          ← Ledger
        </Link>
        <div className="flex items-start justify-between mt-1">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-stone-100">Transaction Log</h1>
              <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
                {entries.length}
              </span>
            </div>
            <p className="text-stone-500 mt-1">
              Complete chronological record of all financial transactions
            </p>
          </div>
          <CSVDownloadButton action={exportLedgerEntriesCSV} label="Export CSV" />
        </div>
      </div>

      {/* Event filter banner */}
      {searchParams.eventId && (
        <div className="rounded-lg border border-brand-700 bg-brand-950/40 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-brand-300">
              Filtered to event:{' '}
              <span className="font-semibold capitalize">{filteredEventName}</span>
            </span>
            <Link
              href={`/events/${searchParams.eventId}/billing`}
              className="text-xs text-brand-500 hover:underline ml-2"
            >
              View event billing
            </Link>
          </div>
          <Link
            href="/finance/ledger/transaction-log"
            className="text-xs text-stone-400 hover:text-stone-200"
          >
            Clear filter
          </Link>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{entries.length}</p>
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
          <p className="text-stone-400 font-medium">No transactions yet</p>
          <p className="text-stone-400 text-sm mt-1">
            Ledger entries appear here as payments are recorded
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
                <TableHead>Method</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry: any) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-stone-500 text-sm whitespace-nowrap">
                    {format(new Date(entry.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${ENTRY_TYPE_STYLES[entry.entry_type] ?? 'bg-stone-800 text-stone-400'}`}
                    >
                      {entry.entry_type.replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm">
                    {entry.event ? (
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/events/${entry.event.id}/billing`}
                          className="text-brand-600 hover:underline capitalize"
                        >
                          {entry.event.occasion?.replace(/_/g, ' ') ?? 'Event'}
                        </Link>
                        {entry.event.event_date && (
                          <span className="text-xs text-stone-500">
                            {format(new Date(entry.event.event_date), 'MMM d')}
                          </span>
                        )}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm max-w-xs truncate">
                    {entry.description}
                  </TableCell>
                  <TableCell className="text-stone-500 text-sm capitalize">
                    {entry.payment_method?.replace(/_/g, ' ') ?? '-'}
                  </TableCell>
                  <TableCell
                    className={`text-sm font-semibold ${entry.is_refund ? 'text-red-600' : 'text-green-700'}`}
                  >
                    {entry.is_refund ? '−' : '+'}
                    {formatCurrency(Math.abs(entry.amount_cents))}
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

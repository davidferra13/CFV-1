import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getLedgerEntries } from '@/lib/ledger/actions'
import { exportLedgerEntriesCSV } from '@/lib/finance/export-actions'
import { CSVDownloadButton } from '@/components/exports/csv-download-button'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { TransactionTable } from './transaction-table'

export const metadata: Metadata = { title: 'Transaction Log - ChefFlow' }

export default async function TransactionLogPage() {
  await requireChef()
  const entries = await getLedgerEntries()

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

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{entries.length}</p>
          <p className="text-sm text-stone-500 mt-1">Total entries</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-200">{formatCurrency(totalIn)}</p>
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
        <TransactionTable entries={entries as any} />
      )}
    </div>
  )
}

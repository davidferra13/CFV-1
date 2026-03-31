// Inventory Transaction Ledger Page
// Append-only transaction log with type/date/ingredient filters.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getTransactionHistory } from '@/lib/inventory/transaction-actions'
import { TransactionLedgerClient } from './transaction-ledger-client'

export const metadata: Metadata = { title: 'Transaction Ledger' }

export default async function TransactionsPage() {
  await requireChef()

  const result = await getTransactionHistory({}).catch(() => ({ transactions: [], total: 0 }))
  const data = result as { transactions: any[]; total: number }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/inventory" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Inventory
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Transaction Ledger</h1>
        <p className="text-stone-500 mt-1">
          Every inventory movement - receiving, deductions, waste, transfers, adjustments - all in
          one append-only log.
        </p>
      </div>

      <TransactionLedgerClient initialTransactions={data.transactions} initialTotal={data.total} />
    </div>
  )
}

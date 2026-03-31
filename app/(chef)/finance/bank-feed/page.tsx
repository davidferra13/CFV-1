import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import {
  getBankConnections,
  getBankTransactions,
  getReconciliationSummary,
} from '@/lib/finance/bank-feed-actions'
import { BankFeedPanel } from '@/components/finance/bank-feed-panel'
import { AddManualTransactionForm } from '@/components/finance/add-manual-transaction-form'

export const metadata: Metadata = { title: 'Bank Feed' }

export default async function BankFeedPage() {
  await requireChef()

  const [connections, transactions, summaryResult] = await Promise.all([
    getBankConnections().catch(() => null),
    getBankTransactions({ status: 'pending' }).catch(() => null),
    getReconciliationSummary().catch(() => null),
  ])

  if (!summaryResult) {
    return (
      <div className="space-y-6">
        <div>
          <Link href="/finance" className="text-sm text-stone-500 hover:text-stone-300">
            &larr; Finance
          </Link>
          <div className="flex items-center justify-between mt-1">
            <h1 className="text-3xl font-bold text-stone-100">Bank Feed</h1>
            <AddManualTransactionForm />
          </div>
          <p className="text-stone-500 mt-1">
            Connect bank accounts, match transactions, and reconcile your books
          </p>
        </div>
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-8 text-center">
          <p className="text-stone-500 text-sm">
            Bank feed data is not available at this time. Use the button above to add transactions
            manually.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Finance
        </Link>
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Bank Feed</h1>
          <AddManualTransactionForm />
        </div>
        <p className="text-stone-500 mt-1">
          Connect bank accounts, match transactions, and reconcile your books
        </p>
      </div>

      <BankFeedPanel
        connections={connections ?? []}
        initialTransactions={transactions ?? []}
        summary={summaryResult}
      />
    </div>
  )
}

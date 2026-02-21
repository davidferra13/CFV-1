import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getBankConnections, getBankTransactions, getReconciliationSummary } from '@/lib/finance/bank-feed-actions'
import { BankFeedPanel } from '@/components/finance/bank-feed-panel'

export const metadata: Metadata = { title: 'Bank Feed - ChefFlow' }

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
          <Link href="/finance" className="text-sm text-stone-500 hover:text-stone-700">&larr; Finance</Link>
          <h1 className="text-3xl font-bold text-stone-900 mt-1">Bank Feed</h1>
          <p className="text-stone-500 mt-1">Connect bank accounts, match transactions, and reconcile your books</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-8 text-center">
          <p className="text-stone-500 text-sm">Bank feed data is not available at this time.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance" className="text-sm text-stone-500 hover:text-stone-700">&larr; Finance</Link>
        <h1 className="text-3xl font-bold text-stone-900 mt-1">Bank Feed</h1>
        <p className="text-stone-500 mt-1">Connect bank accounts, match transactions, and reconcile your books</p>
      </div>

      <BankFeedPanel
        connections={connections ?? []}
        initialTransactions={transactions ?? []}
        summary={summaryResult}
      />
    </div>
  )
}

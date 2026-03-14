import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getLedgerEntries } from '@/lib/ledger/actions'
import { getTenantFinancialSummary } from '@/lib/ledger/compute'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'

export const metadata: Metadata = { title: 'Ledger - ChefFlow' }

const VIEWS = [
  {
    href: '/finance/ledger/transaction-log',
    label: 'Transaction Log',
    icon: '📋',
    description: 'Complete chronological record of all ledger entries',
  },
  {
    href: '/finance/ledger/adjustments',
    label: 'Adjustments',
    icon: '🔧',
    description: 'Credits, add-ons, and manual adjustments',
  },
]

export default async function LedgerPage() {
  await requireChef()
  const [entries, summary] = await Promise.all([getLedgerEntries(), getTenantFinancialSummary()])

  const recent = entries.slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance" className="text-sm text-stone-500 hover:text-stone-300">
          ← Finance
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Ledger</h1>
        <p className="text-stone-500 mt-1">
          Immutable, append-only financial record — the source of truth for all balances
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{entries.length}</p>
          <p className="text-sm text-stone-500 mt-1">Total ledger entries</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-700">
            {formatCurrency(summary.totalRevenueCents)}
          </p>
          <p className="text-sm text-stone-500 mt-1">Revenue recorded</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(summary.totalRefundsCents)}
          </p>
          <p className="text-sm text-stone-500 mt-1">Refunds recorded</p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {VIEWS.map((v) => (
          <Link key={v.href} href={v.href}>
            <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
              <div className="text-2xl mb-2">{v.icon}</div>
              <h2 className="font-semibold text-stone-100">{v.label}</h2>
              <p className="text-sm text-stone-500 mt-1">{v.description}</p>
            </Card>
          </Link>
        ))}
      </div>

      {recent.length > 0 && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-stone-300 mb-3">Recent Entries</h2>
          <div className="space-y-2">
            {recent.map((entry: any) => (
              <div
                key={entry.id}
                className="flex items-center justify-between py-1.5 border-b border-stone-50 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-stone-100 capitalize">
                    {entry.entry_type.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-stone-400">{entry.description}</p>
                </div>
                <span
                  className={`text-sm font-semibold ${entry.is_refund ? 'text-red-600' : 'text-green-700'}`}
                >
                  {entry.is_refund ? '−' : '+'}
                  {formatCurrency(Math.abs(entry.amount_cents))}
                </span>
              </div>
            ))}
          </div>
          <Link
            href="/finance/ledger/transaction-log"
            className="text-xs text-brand-600 hover:underline mt-3 block"
          >
            View all entries →
          </Link>
        </Card>
      )}
    </div>
  )
}

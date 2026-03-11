import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getLedgerEntries } from '@/lib/ledger/actions'
import { getTenantFinancialSummary } from '@/lib/ledger/compute'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'

export const metadata: Metadata = { title: 'Payouts - ChefFlow' }

const VIEWS = [
  {
    href: '/finance/payouts/stripe-payouts',
    label: 'Stripe Payouts',
    icon: '💳',
    description: 'Automated payouts via Stripe Connect',
  },
  {
    href: '/finance/payouts/manual-payments',
    label: 'Manual Payments',
    icon: '💵',
    description: 'Cash, Venmo, Zelle, and other offline payments',
  },
  {
    href: '/finance/payouts/reconciliation',
    label: 'Reconciliation',
    icon: '⚖️',
    description: 'Compare events vs recorded ledger payments',
  },
]

export default async function PayoutsPage() {
  await requireChef()
  const [summary, allPayments] = await Promise.all([
    getTenantFinancialSummary(),
    getLedgerEntries({ entryType: 'payment' }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance" className="text-sm text-stone-500 hover:text-stone-300">
          ← Finance
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Payouts</h1>
        <p className="text-stone-500 mt-1">
          How you actually receive your money — Stripe automatic transfers and manual offline
          payments
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-200">
            {formatCurrency(summary.totalRevenueCents)}
          </p>
          <p className="text-sm text-stone-500 mt-1">Gross revenue</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(summary.totalRefundsCents)}
          </p>
          <p className="text-sm text-stone-500 mt-1">Total refunds</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">
            {formatCurrency(summary.netRevenueCents)}
          </p>
          <p className="text-sm text-stone-500 mt-1">Net (after refunds)</p>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {VIEWS.map((view) => (
          <Link key={view.href} href={view.href}>
            <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
              <div className="text-2xl mb-2">{view.icon}</div>
              <h2 className="font-semibold text-stone-100">{view.label}</h2>
              <p className="text-sm text-stone-500 mt-1">{view.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

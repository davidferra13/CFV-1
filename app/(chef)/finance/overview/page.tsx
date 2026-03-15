import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getTenantFinancialSummary } from '@/lib/ledger/compute'
import { getEvents } from '@/lib/events/actions'
import { getExpenses } from '@/lib/expenses/actions'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { ErrorState } from '@/components/ui/error-state'
import { FadeIn } from '@/components/ui/fade-in'

export const metadata: Metadata = { title: 'Finance Overview - ChefFlow' }

const VIEWS = [
  {
    href: '/finance/overview/revenue-summary',
    label: 'Revenue Summary',
    icon: '💵',
    description: 'Completed events and revenue per client',
  },
  {
    href: '/finance/overview/outstanding-payments',
    label: 'Outstanding Payments',
    icon: '⏳',
    description: 'Events with unpaid balances',
  },
  {
    href: '/finance/overview/cash-flow',
    label: 'Cash Flow',
    icon: '📉',
    description: 'Revenue vs. expenses by month',
  },
]

export default async function FinanceOverviewPage() {
  await requireChef()

  let summary, events, expenses
  try {
    ;[summary, events, expenses] = await Promise.all([
      getTenantFinancialSummary(),
      getEvents(),
      getExpenses(),
    ])
  } catch (err) {
    console.error('[FinanceOverview] Failed to load financial data:', err)
    return (
      <div className="space-y-6">
        <div>
          <Link href="/finance" className="text-sm text-stone-500 hover:text-stone-300">
            ← Finance
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">Overview</h1>
        </div>
        <ErrorState
          title="Could not load financial data"
          description="Revenue, expenses, and event data failed to load. Try refreshing the page."
          size="lg"
        />
      </div>
    )
  }

  const totalExpenses = expenses.reduce((sum: any, e: any) => sum + e.amount_cents, 0)
  const completedEvents = events.filter((e: any) => e.status === 'completed')
  const completedRevenue = completedEvents.reduce(
    (sum: any, e: any) => sum + (e.quoted_price_cents ?? 0),
    0
  )
  const now = new Date()
  const outstandingEvents = events.filter(
    (e: any) => !['completed', 'cancelled'].includes(e.status) && new Date(e.event_date) < now
  )

  return (
    <FadeIn as="div" className="space-y-6">
      <div>
        <Link href="/finance" className="text-sm text-stone-500 hover:text-stone-300">
          ← Finance
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Overview</h1>
        <p className="text-stone-500 mt-1">High-level financial health at a glance</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">
            Total Revenue Collected
          </p>
          <p className="text-3xl font-bold text-stone-100">
            {formatCurrency(summary.totalRevenueCents)}
          </p>
          <p className="text-sm text-stone-500 mt-1">
            Net: {formatCurrency(summary.netRevenueCents)} after refunds
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">
            Total Business Expenses
          </p>
          <p className="text-3xl font-bold text-red-700">{formatCurrency(totalExpenses)}</p>
          <p className="text-sm text-stone-500 mt-1">{expenses.length} expense records</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">
            Completed Event Revenue
          </p>
          <p className="text-2xl font-bold text-green-700">{formatCurrency(completedRevenue)}</p>
          <p className="text-sm text-stone-500 mt-1">{completedEvents.length} completed events</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">
            Outstanding Balances
          </p>
          <p className="text-2xl font-bold text-amber-700">{outstandingEvents.length}</p>
          <p className="text-sm text-stone-500 mt-1">past events with unpaid balance</p>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
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
    </FadeIn>
  )
}

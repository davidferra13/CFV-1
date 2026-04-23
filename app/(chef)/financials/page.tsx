// Chef Financials Hub Page
// Hub tiles render immediately. Dashboard streams in via Suspense.

import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getTenantFinancialSummary } from '@/lib/ledger/compute'
import { getLedgerEntries } from '@/lib/ledger/actions'
import { getMonthlyFinancialSummary } from '@/lib/expenses/actions'
import { getOutstandingPayments } from '@/lib/dashboard/actions'
import { getRevenueGoalSnapshot } from '@/lib/revenue-goals/actions'
import { getMarketIncomeSummary } from '@/lib/calendar/entry-actions'
import { FinancialsClient } from './financials-client'
import { Card, CardContent } from '@/components/ui/card'
import { getFinanceSurfaceAvailability } from '@/lib/finance/surface-availability'

export const metadata: Metadata = { title: 'Finance' }

const sections = [
  {
    heading: 'Money In',
    items: [
      {
        href: '/finance/invoices',
        label: 'Invoices',
        description: 'Sent, paid, overdue, and recurring invoices',
        icon: '🧾',
      },
      {
        href: '/finance/payments/deposits',
        label: 'Deposits',
        description: 'Deposits received and deposit schedules',
        icon: '💵',
      },
      {
        href: '/finance/retainers',
        label: 'Retainers',
        description: 'Retainer agreements and balances',
        icon: '🔒',
      },
    ],
  },
  {
    heading: 'Money Out',
    items: [
      {
        href: '/expenses',
        label: 'Expenses',
        description: 'Log and categorize business expenses',
        icon: '💳',
      },
      {
        href: '/receipts',
        label: 'Receipt Library',
        description: 'Uploaded receipts sorted by category',
        icon: '🗂️',
      },
      {
        href: '/finance/payouts/stripe-payouts',
        label: 'Payouts',
        description: 'Stripe payouts and bank feed',
        icon: '🏦',
      },
    ],
  },
  {
    heading: 'Reports',
    items: [
      {
        href: '/finance/reporting/profit-loss',
        label: 'Profit and Loss',
        description: 'Revenue vs expenses summary',
        icon: '📊',
      },
      {
        href: '/finance/reporting/revenue-by-month',
        label: 'Revenue by Month',
        description: 'Monthly revenue trends',
        icon: '📈',
      },
      {
        href: '/finance/reporting/profit-by-event',
        label: 'Profit by Event',
        description: 'Per-event margin breakdown',
        icon: '🎯',
      },
      {
        href: '/finance/tax/quarterly',
        label: 'Tax Center',
        description: 'Quarterly estimates, year-end package, and tax summary',
        icon: '🏛️',
      },
      {
        href: '/finance/ledger/transaction-log',
        label: 'Transaction Ledger',
        description: 'Full append-only ledger of every financial entry',
        icon: '📒',
      },
      {
        href: '/finance/cash-flow',
        label: 'Cash Flow',
        description: 'Monthly view of revenue, expenses, and upcoming installments',
        icon: '📅',
      },
    ],
  },
]

async function FinancialsDashboard() {
  const now = new Date()
  const [financials, ledgerEntries, monthlySummary, outstanding, revenueGoal, marketIncome] =
    await Promise.all([
      getTenantFinancialSummary(),
      getLedgerEntries(),
      getMonthlyFinancialSummary(now.getFullYear(), now.getMonth() + 1),
      getOutstandingPayments(),
      getRevenueGoalSnapshot(),
      getMarketIncomeSummary(now.getFullYear()),
    ])

  return (
    <FinancialsClient
      financials={financials}
      ledgerEntries={ledgerEntries}
      pendingPaymentsCents={outstanding.totalOutstandingCents}
      monthlySummary={monthlySummary}
      revenueGoal={revenueGoal}
      marketIncome={marketIncome}
    />
  )
}

export default async function FinancialsPage() {
  await requireChef()

  const surfaceAvailability = await getFinanceSurfaceAvailability().catch(() => null)

  // Remove tiles that are degraded and should not be primary-promoted
  const visibleSections = sections.map((section) => ({
    ...section,
    items: section.items.filter((tile) => {
      if (tile.href === '/finance/cash-flow')
        return surfaceAvailability?.cashFlow.showAsPrimary ?? false
      return true
    }),
  }))

  return (
    <div className="space-y-10">
      {/* Compatibility notice */}
      <div className="rounded-xl border border-stone-700/50 bg-stone-900/40 px-4 py-3 flex items-center gap-3">
        <span className="text-stone-400 text-sm">
          Finance now starts at{' '}
          <Link href="/finance" className="text-brand-400 hover:underline font-medium">
            /finance
          </Link>
          . This workspace remains available for legacy summary views.
        </span>
      </div>

      {/* Nav tiles render immediately */}
      {visibleSections.map((section) => (
        <div key={section.heading}>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">
            {section.heading}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {section.items.map((tile) => (
              <Link key={tile.href} href={tile.href} className="group block">
                <Card className="h-full transition-colors group-hover:border-brand-700/60 group-hover:bg-stone-800/60">
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl leading-none mt-0.5 flex-shrink-0">
                        {tile.icon}
                      </span>
                      <div>
                        <p className="font-semibold text-stone-100 group-hover:text-brand-400 transition-colors">
                          {tile.label}
                        </p>
                        <p className="text-sm text-stone-500 mt-0.5">{tile.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* Dashboard streams in separately */}
      <Suspense
        fallback={
          <Card className="p-8 text-center">
            <p className="text-stone-500 text-sm">Loading financial summary...</p>
          </Card>
        }
      >
        <FinancialsDashboard />
      </Suspense>
    </div>
  )
}

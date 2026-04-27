import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import { requireChef } from '@/lib/auth/get-user'
import { getTenantFinancialSummary, getYtdCarryForwardSavings } from '@/lib/ledger/compute'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/format'
import { getRegionalSettings } from '@/lib/chef/actions'
import { FinanceHealthBar } from '@/components/intelligence/finance-health-bar'
import { PricingIntelligenceBar } from '@/components/intelligence/pricing-intelligence-bar'
import { getProfitAndLossReport } from '@/lib/finance/profit-loss-report-actions'
import { getFinanceSurfaceAvailability } from '@/lib/finance/surface-availability'
import { format, startOfMonth, endOfMonth } from 'date-fns'

/** Inline P&L snapshot for the current month */
async function MonthlyPLSnapshot() {
  const now = new Date()
  const startDate = format(startOfMonth(now), 'yyyy-MM-dd')
  const endDate = format(endOfMonth(now), 'yyyy-MM-dd')
  const monthLabel = format(now, 'MMMM yyyy')

  const [report, regional] = await Promise.all([
    getProfitAndLossReport(startDate, endDate),
    getRegionalSettings(),
  ])
  const { revenue, operatingExpenses, cogs, totals } = report
  const totalExpenses = operatingExpenses.totalOperatingExpensesCents + cogs.purchaseOrdersCents
  const isProfit = totals.netProfitLossCents >= 0
  const currOpts = { locale: regional.locale, currency: regional.currencyCode }
  const fmt = (cents: number) => formatCurrency(cents, currOpts)

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-stone-300">P&amp;L Snapshot: {monthLabel}</h3>
        <Link href="/finance/reporting" className="text-xs text-brand-600 hover:underline">
          Full report →
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <p className="text-lg font-bold text-stone-100">{fmt(revenue.totalRevenueCents)}</p>
          <p className="text-xs text-stone-500">Revenue</p>
        </div>
        <div>
          <p className="text-lg font-bold text-red-400">{fmt(totalExpenses)}</p>
          <p className="text-xs text-stone-500">Expenses</p>
        </div>
        <div>
          <p className={`text-lg font-bold ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
            {isProfit ? '' : '-'}
            {fmt(Math.abs(totals.netProfitLossCents))}
          </p>
          <p className="text-xs text-stone-500">Net {isProfit ? 'Profit' : 'Loss'}</p>
        </div>
        <div>
          <p
            className={`text-lg font-bold ${totals.profitMarginPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
          >
            {totals.profitMarginPercent.toFixed(1)}%
          </p>
          <p className="text-xs text-stone-500">Margin</p>
        </div>
      </div>
    </Card>
  )
}

export const metadata: Metadata = { title: 'Finance' }

const SECTIONS = [
  {
    href: '/finance/overview',
    label: 'Overview',
    description: 'Revenue summary, outstanding payments, and cash flow',
    icon: '📊',
  },
  {
    href: '/finance/cash-flow',
    label: 'Cash Flow Calendar',
    description: 'Monthly view of revenue, expenses, and upcoming payment plan installments',
    icon: '📅',
  },
  {
    href: '/finance/invoices',
    label: 'Invoices',
    description: 'Track invoices by status - draft, sent, paid, overdue',
    icon: '🧾',
  },
  {
    href: '/finance/expenses',
    label: 'Expenses',
    description: 'All business expenses broken down by category',
    icon: '💳',
  },
  {
    href: '/finance/ledger',
    label: 'Ledger',
    description: 'Immutable transaction log and adjustment history',
    icon: '📒',
  },
  {
    href: '/finance/payments',
    label: 'Payments',
    description: 'Deposits, installments, refunds, and failed payments',
    icon: '💰',
  },
  {
    href: '/finance/payouts',
    label: 'Payouts',
    description: 'Stripe payouts, manual payments, and reconciliation',
    icon: '🏦',
  },
  {
    href: '/finance/reporting',
    label: 'Reporting',
    description: 'Revenue by month, client, event, tax summary, and year-to-date',
    icon: '📈',
  },
  {
    href: '/finance/tax',
    label: 'Tax Center',
    description: 'Mileage log, quarterly estimates, and accountant export',
    icon: '🗓️',
  },
  {
    href: '/finance/goals',
    label: 'Revenue Goals',
    description: 'Annual target, YTD progress, and gap-closing strategies',
    icon: '🎯',
  },
  {
    href: '/finance/bank-feed',
    label: 'Bank Feed',
    description: 'Log and reconcile bank transactions manually',
    icon: '🏦',
  },
  {
    href: '/finance/recurring',
    label: 'Recurring Invoices',
    description: 'Automated billing for repeat clients and retainers',
    icon: '🔄',
  },
  {
    href: '/finance/disputes',
    label: 'Payment Disputes',
    description: 'Track and manage Stripe payment disputes with evidence',
    icon: '🛡️',
  },
  {
    href: '/finance/contractors',
    label: '1099 Contractors',
    description: 'Staff payments, YTD tracking, and 1099 filing alerts',
    icon: '👷',
  },
  {
    href: '/finance/retainers',
    label: 'Retainers',
    description: 'Recurring service agreements - monthly billing, event tracking',
    icon: '🔁',
  },
  {
    href: '/finance/plate-costs',
    label: 'Plate Costs',
    description: 'True cost-per-plate across events with ingredient, labor, and overhead breakdown',
    icon: '🍽️',
  },
]

export default async function FinancePage() {
  await requireChef()
  const [summary, carryForwardSavings, surfaceAvailability, regional] = await Promise.all([
    getTenantFinancialSummary().catch(() => null),
    getYtdCarryForwardSavings().catch(() => null),
    getFinanceSurfaceAvailability().catch(() => null),
    getRegionalSettings(),
  ])

  // Filter tiles that are degraded and should not be primary-promoted
  const VISIBLE_SECTIONS = SECTIONS.filter((s) => {
    if (s.href === '/finance/bank-feed') return surfaceAvailability?.bankFeed.showAsPrimary ?? false
    if (s.href === '/finance/cash-flow') return surfaceAvailability?.cashFlow.showAsPrimary ?? false
    return true
  })

  const currOpts = { locale: regional.locale, currency: regional.currencyCode }
  const fmt = (cents: number) => formatCurrency(cents, currOpts)

  if (!summary) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Finance</h1>
          <p className="text-stone-500 mt-1">
            Complete financial management - invoices, expenses, ledger, and reporting
          </p>
        </div>
        <div className="rounded-xl border border-red-800 bg-red-950 p-6 text-center">
          <p className="text-sm text-red-400">
            Could not load financial data. Please refresh the page or try again later.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Finance</h1>
        <p className="text-stone-500 mt-1">
          Complete financial management - invoices, expenses, ledger, and reporting
        </p>
      </div>

      {summary.totalRevenueCents === 0 && summary.totalRefundsCents === 0 && (
        <div className="rounded-xl border border-dashed border-stone-600 bg-stone-800 p-6 text-center">
          <p className="text-sm text-stone-400">
            No financial activity yet. Once you record your first payment or expense, your numbers
            will appear here.
          </p>
        </div>
      )}

      {summary.truncated === true && (
        <div className="rounded-xl border border-amber-700 bg-amber-950 px-4 py-3">
          <p className="text-sm text-amber-300">
            Financial data may be incomplete. Contact support if you have over 50,000 transactions.
          </p>
        </div>
      )}

      {/* Financial Intelligence */}
      <WidgetErrorBoundary name="Finance Health" compact>
        <Suspense fallback={null}>
          <FinanceHealthBar />
        </Suspense>
      </WidgetErrorBoundary>

      {/* Pricing Intelligence */}
      <WidgetErrorBoundary name="Pricing Intelligence" compact>
        <Suspense fallback={null}>
          <PricingIntelligenceBar />
        </Suspense>
      </WidgetErrorBoundary>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-grid">
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{fmt(summary.totalRevenueCents)}</p>
          <p className="text-sm text-stone-500 mt-1">Total revenue collected</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-700">{fmt(summary.netRevenueCents)}</p>
          <p className="text-sm text-stone-500 mt-1">Net revenue (after refunds)</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-red-600">{fmt(summary.totalRefundsCents)}</p>
          <p className="text-sm text-stone-500 mt-1">Total refunds issued</p>
        </Card>
        <Card className="p-4 border-emerald-200 bg-emerald-950">
          <p className="text-2xl font-bold text-emerald-700">
            {carryForwardSavings === null ? '--' : fmt(carryForwardSavings)}
          </p>
          <p className="text-sm text-emerald-600 mt-1">Leftover credit applied YTD</p>
        </Card>
      </div>

      {/* Monthly P&L Snapshot */}
      <WidgetErrorBoundary name="Monthly P&L" compact>
        <Suspense
          fallback={
            <Card className="p-4 animate-pulse">
              <div className="h-6 bg-stone-800 rounded w-1/3 mb-3" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="h-16 bg-stone-800 rounded" />
                <div className="h-16 bg-stone-800 rounded" />
                <div className="h-16 bg-stone-800 rounded" />
                <div className="h-16 bg-stone-800 rounded" />
              </div>
            </Card>
          }
        >
          <MonthlyPLSnapshot />
        </Suspense>
      </WidgetErrorBoundary>

      <div className="grid grid-cols-2 gap-4 stagger-grid">
        {VISIBLE_SECTIONS.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{section.icon}</span>
                <div>
                  <h2 className="font-semibold text-stone-100">{section.label}</h2>
                  <p className="text-sm text-stone-500 mt-0.5">{section.description}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="text-sm text-stone-400 flex items-center gap-2">
        <Link href="/goals" className="text-brand-600 hover:underline">
          Revenue Goals
        </Link>
      </div>
    </div>
  )
}

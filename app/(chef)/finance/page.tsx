import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import { requireChef } from '@/lib/auth/get-user'
import { getEvents } from '@/lib/events/actions'
import { getTenantFinancialSummary, getYtdCarryForwardSavings } from '@/lib/ledger/compute'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/format'
import { getRegionalSettings } from '@/lib/chef/actions'
import { FinanceHealthBar } from '@/components/intelligence/finance-health-bar'
import { PricingIntelligenceBar } from '@/components/intelligence/pricing-intelligence-bar'
import { getProfitAndLossReport } from '@/lib/finance/profit-loss-report-actions'
import { getFinanceSurfaceAvailability } from '@/lib/finance/surface-availability'
import { FinanceAlertBanner } from '@/components/finance/finance-alerts'
import { format, startOfMonth, endOfMonth } from 'date-fns'

/** Recent events with financial data, linking to billing */
async function RecentEventsList() {
  const [events, regional] = await Promise.all([getEvents(), getRegionalSettings()])
  const currOpts = { locale: regional.locale, currency: regional.currencyCode }
  const fmt = (cents: number) => formatCurrency(cents, currOpts)

  const recent = events
    .filter((e: any) => (e.quoted_price_cents ?? 0) > 0)
    .sort((a: any, b: any) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
    .slice(0, 8)

  if (recent.length === 0) return null

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-stone-300">Recent Events</h3>
        <Link
          href="/finance/reporting/revenue-by-event"
          className="text-xs text-brand-600 hover:underline"
        >
          All events →
        </Link>
      </div>
      <div className="space-y-2">
        {recent.map((event: any) => (
          <Link
            key={event.id}
            href={`/events/${event.id}/financial`}
            className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-stone-800 transition-colors group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs text-stone-500 shrink-0">
                {format(new Date(event.event_date), 'MMM d')}
              </span>
              <span className="text-sm text-stone-200 truncate">
                {event.client?.full_name ?? 'No client'}
              </span>
              <span className="text-xs text-stone-500 capitalize truncate hidden sm:inline">
                {event.occasion?.replace(/_/g, ' ') ?? ''}
              </span>
            </div>
            <span className="text-sm font-semibold text-stone-100 shrink-0 ml-2">
              {fmt(event.quoted_price_cents ?? 0)}
            </span>
          </Link>
        ))}
      </div>
    </Card>
  )
}

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
        <div className="flex items-center gap-3">
          <Link
            href="/finance/reporting/profit-by-event"
            className="text-xs text-brand-600 hover:underline"
          >
            See by event
          </Link>
          <span className="text-stone-700">|</span>
          <Link href="/finance/reporting" className="text-xs text-brand-600 hover:underline">
            Full report →
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
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

function FinanceBarSkeleton() {
  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/70 p-4">
      <div className="h-4 w-40 animate-pulse rounded bg-stone-800" />
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-10 animate-pulse rounded bg-stone-800/80" />
        ))}
      </div>
    </div>
  )
}

function RecentEventsSkeleton() {
  return (
    <Card className="p-4">
      <div className="mb-3 h-4 w-32 animate-pulse rounded bg-stone-800" />
      <div className="space-y-2">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="flex items-center justify-between gap-3 py-1.5">
            <div className="h-4 w-48 animate-pulse rounded bg-stone-800" />
            <div className="h-4 w-16 animate-pulse rounded bg-stone-800" />
          </div>
        ))}
      </div>
    </Card>
  )
}

const SECTIONS: Array<{
  href: string
  label: string
  description: string
  icon: string
  secondaryHref?: string
  secondaryLabel?: string
}> = [
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
    secondaryHref: '/documents',
    secondaryLabel: 'View Contracts',
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
    secondaryHref: '/analytics',
    secondaryLabel: 'View Analytics',
  },
  {
    href: '/finance/tax',
    label: 'Tax Center',
    description: 'Mileage log, quarterly estimates, and accountant export',
    icon: '🗓️',
    secondaryHref: '/documents?phase=closeout',
    secondaryLabel: 'Tax Documents',
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

      {/* Finance Alerts (overdue invoices, unusual expenses) */}
      <WidgetErrorBoundary name="Finance Alerts" compact>
        <FinanceAlertBanner />
      </WidgetErrorBoundary>

      {/* Financial Intelligence */}
      <WidgetErrorBoundary name="Finance Health" compact>
        <Suspense fallback={<FinanceBarSkeleton />}>
          <FinanceHealthBar />
        </Suspense>
      </WidgetErrorBoundary>

      {/* Pricing Intelligence */}
      <WidgetErrorBoundary name="Pricing Intelligence" compact>
        <Suspense fallback={<FinanceBarSkeleton />}>
          <PricingIntelligenceBar />
        </Suspense>
      </WidgetErrorBoundary>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/finance/reporting/revenue-by-month">
          <Card className="p-4 hover:border-amber-700/50 transition-colors cursor-pointer h-full">
            <p className="text-2xl font-bold text-stone-100">{fmt(summary.totalRevenueCents)}</p>
            <p className="text-sm text-stone-500 mt-1">Total revenue collected</p>
          </Card>
        </Link>
        <Link href="/finance/reporting/profit-loss">
          <Card className="p-4 hover:border-amber-700/50 transition-colors cursor-pointer h-full">
            <p className="text-2xl font-bold text-green-700">{fmt(summary.netRevenueCents)}</p>
            <p className="text-sm text-stone-500 mt-1">Net revenue (after refunds)</p>
          </Card>
        </Link>
        <Link href="/finance/payments/refunds">
          <Card className="p-4 hover:border-amber-700/50 transition-colors cursor-pointer h-full">
            <p className="text-2xl font-bold text-red-600">{fmt(summary.totalRefundsCents)}</p>
            <p className="text-sm text-stone-500 mt-1">Total refunds issued</p>
          </Card>
        </Link>
        <Link href="/finance/overview">
          <Card className="p-4 border-emerald-200 bg-emerald-950 hover:border-amber-700/50 transition-colors cursor-pointer h-full">
            <p className="text-2xl font-bold text-emerald-700">
              {carryForwardSavings === null ? '--' : fmt(carryForwardSavings)}
            </p>
            <p className="text-sm text-emerald-600 mt-1">Leftover credit applied YTD</p>
          </Card>
        </Link>
      </div>

      {/* Recent Events with Financial Data */}
      <WidgetErrorBoundary name="Recent Events" compact>
        <Suspense fallback={<RecentEventsSkeleton />}>
          <RecentEventsList />
        </Suspense>
      </WidgetErrorBoundary>

      {/* Monthly P&L Snapshot */}
      <WidgetErrorBoundary name="Monthly P&L" compact>
        <Suspense
          fallback={
            <Card className="p-4 animate-pulse">
              <div className="h-6 bg-stone-800 rounded w-1/3 mb-3" />
              <div className="grid grid-cols-4 gap-4">
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

      <div className="grid grid-cols-2 gap-4">
        {VISIBLE_SECTIONS.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{section.icon}</span>
                <div>
                  <h2 className="font-semibold text-stone-100">{section.label}</h2>
                  <p className="text-sm text-stone-500 mt-0.5">{section.description}</p>
                  {section.secondaryHref && (
                    <Link
                      href={section.secondaryHref}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-brand-600 hover:underline mt-1.5 inline-block"
                    >
                      {section.secondaryLabel} →
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="text-sm text-stone-400 flex items-center gap-2">
        <Link href="/analytics/goals" className="text-brand-600 hover:underline">
          Revenue Goals
        </Link>
      </div>
    </div>
  )
}

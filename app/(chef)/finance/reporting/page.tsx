import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getTenantFinancialSummary } from '@/lib/ledger/compute'
import { getDashboardEventCounts, getCurrentMonthExpenseSummary } from '@/lib/dashboard/actions'
import { getStageConversionData } from '@/lib/analytics/stage-conversion'
import { StageConversionFunnel } from '@/components/analytics/stage-conversion-funnel'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'

export const metadata: Metadata = { title: 'Reporting' }

const REPORTS = [
  {
    href: '/finance/reporting/year-to-date-summary',
    label: 'Year-to-Date Summary',
    icon: '📊',
    description: 'Revenue, expenses, and profit for the current year',
  },
  {
    href: '/finance/reporting/revenue-by-month',
    label: 'Revenue by Month',
    icon: '📅',
    description: '12-month rolling revenue trend - export CSV',
  },
  {
    href: '/finance/reporting/revenue-by-event',
    label: 'Revenue by Event',
    icon: '🍽️',
    description: 'All events ranked by invoice value',
  },
  {
    href: '/finance/reporting/revenue-by-client',
    label: 'Revenue by Client',
    icon: '👤',
    description: 'Lifetime value and revenue per client - export CSV',
  },
  {
    href: '/finance/reporting/profit-by-event',
    label: 'Profit by Event',
    icon: '💰',
    description: 'Event revenue minus direct expenses',
  },
  {
    href: '/finance/reporting/expense-by-category',
    label: 'Expense by Category',
    icon: '📂',
    description: 'Spend breakdown across all expense categories',
  },
  {
    href: '/finance/reporting/tax-summary',
    label: 'Tax Summary',
    icon: '🧾',
    description: 'Business expense totals and income summary for tax prep',
  },
  {
    href: '/finance/reporting/profit-loss',
    label: 'Profit & Loss Statement',
    icon: '📈',
    description: 'Full P&L with revenue, expenses, and net profit',
  },
  {
    href: '/finance/year-end',
    label: 'Year-End Summary',
    icon: '🎯',
    description: 'Complete annual summary for tax preparation',
  },
]

export default async function ReportingPage() {
  await requireChef()

  const [summary, eventCounts, expenses, conversionData] = await Promise.all([
    getTenantFinancialSummary().catch(() => null),
    getDashboardEventCounts().catch(() => null),
    getCurrentMonthExpenseSummary().catch(() => null),
    getStageConversionData().catch(() => null),
  ])

  const ytdRevenue = summary?.netRevenueCents ?? 0
  const ytdEvents = eventCounts?.ytd ?? 0
  const monthExpenses = expenses?.businessCents ?? 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Link href="/finance" className="text-sm text-stone-500 hover:text-stone-300">
            ← Finance
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">Reporting</h1>
          <p className="text-stone-500 mt-1">
            Financial reports and summaries - export-ready insights for your business
          </p>
        </div>
        <a
          href={`/finance/export?year=${new Date().getFullYear()}`}
          className="inline-flex items-center justify-center px-3 py-2 border border-stone-600 text-stone-300 rounded-lg hover:bg-stone-800 transition-colors font-medium text-sm shrink-0"
        >
          Export Financials CSV
        </a>
      </div>

      {/* YTD KPI snapshot */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-700">{formatCurrency(ytdRevenue)}</p>
          <p className="text-sm text-stone-500 mt-1">YTD net revenue</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{ytdEvents}</p>
          <p className="text-sm text-stone-500 mt-1">Events this year</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{formatCurrency(monthExpenses)}</p>
          <p className="text-sm text-stone-500 mt-1">Business expenses this month</p>
        </Card>
      </div>

      {/* Stage Conversion Funnel */}
      {conversionData && (
        <Card className="p-5">
          <h2 className="font-semibold text-stone-100 mb-4">Pipeline Conversion Funnel</h2>
          <StageConversionFunnel data={conversionData} />
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4">
        {REPORTS.map((report) => (
          <Link key={report.href} href={report.href}>
            <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{report.icon}</span>
                <h2 className="font-semibold text-stone-100">{report.label}</h2>
              </div>
              <p className="text-sm text-stone-500">{report.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

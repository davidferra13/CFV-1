import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { generatePnL, getPnLTrend } from '@/lib/finance/pnl-actions'
import { PnLStatement } from '@/components/finance/pnl-statement'

export const metadata: Metadata = {
  title: 'Profit & Loss Statement - ChefFlow',
}

export default async function PnLPage() {
  await requireChef()

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const [initialStatement, initialTrend] = await Promise.all([
    generatePnL('monthly', currentYear, currentMonth).catch(() => ({
      period: 'monthly' as const,
      year: currentYear,
      month: currentMonth,
      quarter: undefined,
      startDate: `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`,
      endDate: `${currentYear}-${String(currentMonth).padStart(2, '0')}-28`,
      revenue: {
        label: 'Revenue',
        items: [],
        totalCents: 0,
        totalPercentOfRevenue: 100,
      },
      cogs: {
        label: 'Cost of Goods Sold',
        items: [],
        totalCents: 0,
        totalPercentOfRevenue: 0,
      },
      grossProfitCents: 0,
      grossMarginPercent: 0,
      operatingExpenses: {
        label: 'Operating Expenses',
        items: [],
        totalCents: 0,
        totalPercentOfRevenue: 0,
      },
      netIncomeCents: 0,
      netMarginPercent: 0,
      refundsCents: 0,
      tipsCents: 0,
    })),
    getPnLTrend(12).catch(() => []),
  ])

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/reporting" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Reporting
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Profit &amp; Loss Statement</h1>
        <p className="text-stone-500 mt-1">
          Revenue, cost of goods sold, operating expenses, and net income. Monthly, quarterly, or
          annual.
        </p>
      </div>

      <PnLStatement initialStatement={initialStatement} initialTrend={initialTrend} />
    </div>
  )
}

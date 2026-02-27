import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import {
  getDefaultProfitLossWindow,
  getProfitAndLossReport,
} from '@/lib/finance/profit-loss-report-actions'
import { ProfitAndLossReport } from '@/components/finance/ProfitAndLossReport'

export const metadata: Metadata = { title: 'Profit & Loss Statement - ChefFlow' }

export default async function ProfitLossPage() {
  await requireChef()

  const window = getDefaultProfitLossWindow()
  const report = await getProfitAndLossReport(window.startDate, window.endDate).catch(() => ({
    startDate: window.startDate,
    endDate: window.endDate,
    revenue: {
      billingRevenueCents: 0,
      commerceRevenueCents: 0,
      salesRevenueCents: 0,
      totalRevenueCents: 0,
    },
    cogs: {
      purchaseOrdersCents: 0,
    },
    operatingExpenses: {
      expenseTableCents: 0,
      laborFromPayrollCents: 0,
      totalOperatingExpensesCents: 0,
    },
    totals: {
      grossProfitCents: 0,
      netProfitLossCents: 0,
      profitMarginPercent: 0,
    },
  }))

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/reporting" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Reporting
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Profit &amp; Loss Statement</h1>
        <p className="text-stone-500 mt-1">
          Consolidated top-level P&amp;L from billing, commerce, procurement, expenses, and labor.
        </p>
      </div>

      <ProfitAndLossReport initialData={report} />
    </div>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { computeProfitAndLoss } from '@/lib/ledger/compute'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'
import { ProfitLossClientControls } from './profit-loss-client'

export const metadata: Metadata = { title: 'Profit & Loss Statement - ChefFlow' }

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export default async function ProfitLossPage({
  searchParams,
}: {
  searchParams: { year?: string }
}) {
  await requireChef()

  const currentYear = new Date().getFullYear()
  const selectedYear = searchParams.year ? parseInt(searchParams.year, 10) : currentYear
  const validYear = isNaN(selectedYear) ? currentYear : selectedYear

  const yearOptions = [currentYear, currentYear - 1, currentYear - 2]

  const pl = await computeProfitAndLoss(validYear)

  // Build monthly revenue array for all 12 months
  const monthlyData = MONTH_NAMES.map((name, i) => {
    const key = `${validYear}-${String(i + 1).padStart(2, '0')}`
    return { month: name, key, revenueCents: pl.monthlyRevenue[key] ?? 0 }
  })
  const maxMonthlyRevenue = Math.max(...monthlyData.map((m) => m.revenueCents), 1)

  // Expenses by category sorted by amount descending
  const expenseRows = Object.entries(pl.expensesByCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/finance/reporting" className="text-sm text-stone-500 hover:text-stone-300">
          ← Reporting
        </Link>
        <div className="flex items-center justify-between mt-1">
          <div>
            <h1 className="text-3xl font-bold text-stone-100">Profit &amp; Loss Statement</h1>
            <p className="text-stone-500 mt-1">
              Full revenue, expenses, and net profit for {validYear}
            </p>
          </div>
          <ProfitLossClientControls yearOptions={yearOptions} selectedYear={validYear} pl={pl} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-5">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">
            Total Revenue
          </p>
          <p className="text-2xl font-bold text-green-700">{formatCurrency(pl.netRevenueCents)}</p>
          {pl.totalRefundsCents > 0 && (
            <p className="text-xs text-stone-400 mt-1">
              Gross {formatCurrency(pl.totalRevenueCents)} &minus;{' '}
              {formatCurrency(pl.totalRefundsCents)} refunds
            </p>
          )}
        </Card>

        <Card className="p-5">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">
            Total Expenses
          </p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(pl.totalExpensesCents)}</p>
          <p className="text-xs text-stone-400 mt-1">
            {expenseRows.length} {expenseRows.length === 1 ? 'category' : 'categories'}
          </p>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">
            Net Profit
          </p>
          <p
            className={`text-2xl font-bold ${pl.netProfitCents >= 0 ? 'text-stone-100' : 'text-red-600'}`}
          >
            {formatCurrency(pl.netProfitCents)}
          </p>
          <p className="text-xs text-stone-400 mt-1">Revenue minus all expenses</p>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">
            Profit Margin
          </p>
          <p
            className={`text-2xl font-bold ${pl.profitMarginPercent >= 0 ? 'text-stone-100' : 'text-red-600'}`}
          >
            {pl.profitMarginPercent}%
          </p>
          {pl.totalTipsCents > 0 && (
            <p className="text-xs text-stone-400 mt-1">Tips: {formatCurrency(pl.totalTipsCents)}</p>
          )}
        </Card>
      </div>

      {/* Monthly Revenue */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wide mb-4">
          Monthly Revenue — {validYear}
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead className="w-64">Bar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthlyData.map((row) => (
              <TableRow key={row.key}>
                <TableCell className="text-stone-300 font-medium text-sm">{row.month}</TableCell>
                <TableCell className="text-stone-100 font-semibold text-sm">
                  {row.revenueCents > 0 ? (
                    formatCurrency(row.revenueCents)
                  ) : (
                    <span className="text-stone-300">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="w-full bg-stone-800 rounded-full h-2.5">
                    <div
                      className="bg-green-500 h-2.5 rounded-full"
                      style={{
                        width: `${Math.round((row.revenueCents / maxMonthlyRevenue) * 100)}%`,
                      }}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Expenses by Category */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wide mb-4">
          Expenses by Category
        </h2>
        {expenseRows.length === 0 ? (
          <p className="text-stone-400 text-sm text-center py-6">
            No expenses recorded for {validYear}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>% of Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenseRows.map((row) => (
                <TableRow key={row.category}>
                  <TableCell className="text-stone-300 font-medium text-sm capitalize">
                    {row.category.replace(/_/g, ' ')}
                  </TableCell>
                  <TableCell className="text-red-600 font-semibold text-sm">
                    {formatCurrency(row.amount)}
                  </TableCell>
                  <TableCell className="text-stone-500 text-sm">
                    {pl.netRevenueCents > 0
                      ? `${Math.round((row.amount / pl.netRevenueCents) * 100)}%`
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-bold text-stone-100 text-sm">Total</TableCell>
                <TableCell className="font-bold text-red-700 text-sm">
                  {formatCurrency(pl.totalExpensesCents)}
                </TableCell>
                <TableCell className="text-stone-500 text-sm">
                  {pl.netRevenueCents > 0
                    ? `${Math.round((pl.totalExpensesCents / pl.netRevenueCents) * 100)}%`
                    : '—'}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </Card>

      {/* P&L Summary */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wide mb-4">
          P&amp;L Summary — {validYear}
        </h2>
        <div className="space-y-2 max-w-sm">
          <div className="flex justify-between">
            <span className="text-sm text-stone-400">Gross revenue</span>
            <span className="text-sm font-semibold text-green-700">
              {formatCurrency(pl.totalRevenueCents)}
            </span>
          </div>
          {pl.totalRefundsCents > 0 && (
            <div className="flex justify-between">
              <span className="text-sm text-stone-400">Refunds</span>
              <span className="text-sm font-semibold text-red-500">
                &minus;{formatCurrency(pl.totalRefundsCents)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-sm font-semibold text-stone-300">Net revenue</span>
            <span className="text-sm font-bold text-stone-100">
              {formatCurrency(pl.netRevenueCents)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-stone-400">Total expenses</span>
            <span className="text-sm font-semibold text-red-500">
              &minus;{formatCurrency(pl.totalExpensesCents)}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-stone-700">
            <span className="text-sm font-bold text-stone-100">Net profit</span>
            <span
              className={`text-sm font-bold ${pl.netProfitCents >= 0 ? 'text-green-700' : 'text-red-600'}`}
            >
              {formatCurrency(pl.netProfitCents)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-stone-400">Profit margin</span>
            <span
              className={`text-sm font-semibold ${pl.profitMarginPercent >= 0 ? 'text-stone-300' : 'text-red-600'}`}
            >
              {pl.profitMarginPercent}%
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}

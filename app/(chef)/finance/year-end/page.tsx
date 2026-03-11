import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { computeProfitAndLoss } from '@/lib/ledger/compute'
import { createServerClient } from '@/lib/supabase/server'
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
import { YearEndClientControls } from './year-end-client'

export const metadata: Metadata = { title: 'Year-End Summary - ChefFlow' }

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export default async function YearEndPage({ searchParams }: { searchParams: { year?: string } }) {
  const user = await requireChef()

  const currentYear = new Date().getFullYear()
  const selectedYear = searchParams.year ? parseInt(searchParams.year, 10) : currentYear
  const validYear = isNaN(selectedYear) ? currentYear : selectedYear

  const yearOptions = [currentYear, currentYear - 1, currentYear - 2]

  // Run P&L compute and events query in parallel
  const supabase: any = createServerClient()
  const startDate = `${validYear}-01-01`
  const endDate = `${validYear}-12-31`

  const [pl, eventsResult] = await Promise.all([
    computeProfitAndLoss(validYear),
    supabase
      .from('events')
      .select('id, occasion, event_date, status')
      .eq('tenant_id', user.tenantId!)
      .gte('event_date', startDate)
      .lte('event_date', endDate)
      .order('event_date', { ascending: true }),
  ])

  const events = eventsResult.data || []
  const completedEvents = events.filter((e: any) => e.status === 'completed')
  const cancelledEvents = events.filter((e: any) => e.status === 'cancelled')
  const totalEvents = events.length

  // Monthly revenue data — fill all 12 months
  const monthlyData = MONTH_NAMES.map((name, i) => {
    const key = `${validYear}-${String(i + 1).padStart(2, '0')}`
    return {
      month: name,
      shortMonth: name.slice(0, 3),
      key,
      revenueCents: pl.monthlyRevenue[key] ?? 0,
    }
  }).filter((m) => m.revenueCents > 0)

  // Top 3 revenue months
  const topMonths = [...monthlyData].sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 3)

  // Expenses by category sorted descending
  const expenseRows = Object.entries(pl.expensesByCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)

  // Avg revenue per completed event
  const avgRevenuePerEvent =
    completedEvents.length > 0 ? Math.round(pl.netRevenueCents / completedEvents.length) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/finance" className="text-sm text-stone-500 hover:text-stone-300">
          ← Finance
        </Link>
        <div className="flex items-center justify-between mt-1">
          <div>
            <h1 className="text-3xl font-bold text-stone-100">Year-End Summary</h1>
            <p className="text-stone-500 mt-1">
              Complete annual financial summary for {validYear} — ready for your accountant
            </p>
          </div>
          <YearEndClientControls
            yearOptions={yearOptions}
            selectedYear={validYear}
            pl={pl}
            completedEventsCount={completedEvents.length}
            totalEventsCount={totalEvents}
          />
        </div>
      </div>

      {/* Business Summary */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wide mb-4">
          Business Summary — {validYear}
        </h2>
        <div className="grid grid-cols-4 gap-6">
          <div>
            <p className="text-2xl font-bold text-stone-100">{totalEvents}</p>
            <p className="text-sm text-stone-500 mt-0.5">Total events</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-200">{completedEvents.length}</p>
            <p className="text-sm text-stone-500 mt-0.5">Completed</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-stone-400">{cancelledEvents.length}</p>
            <p className="text-sm text-stone-500 mt-0.5">Cancelled</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-stone-300">
              {formatCurrency(avgRevenuePerEvent)}
            </p>
            <p className="text-sm text-stone-500 mt-0.5">Avg. per event</p>
          </div>
        </div>
      </Card>

      {/* Revenue Section */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wide mb-4">
          Revenue
        </h2>
        <div className="grid grid-cols-3 gap-6 mb-5">
          <div>
            <p className="text-2xl font-bold text-green-200">
              {formatCurrency(pl.netRevenueCents)}
            </p>
            <p className="text-sm text-stone-500 mt-0.5">Net revenue</p>
            {pl.totalRefundsCents > 0 && (
              <p className="text-xs text-stone-400 mt-0.5">
                Gross {formatCurrency(pl.totalRevenueCents)} minus{' '}
                {formatCurrency(pl.totalRefundsCents)} refunds
              </p>
            )}
          </div>
          {pl.totalTipsCents > 0 && (
            <div>
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(pl.totalTipsCents)}
              </p>
              <p className="text-sm text-stone-500 mt-0.5">Total tips</p>
            </div>
          )}
          <div>
            <p className="text-2xl font-bold text-stone-300">
              {formatCurrency(pl.netRevenueCents + pl.totalTipsCents)}
            </p>
            <p className="text-sm text-stone-500 mt-0.5">Revenue incl. tips</p>
          </div>
        </div>

        {monthlyData.length > 0 && (
          <>
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
              Revenue by Month
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {monthlyData.map((row) => {
                    const maxRevenue = Math.max(...monthlyData.map((m) => m.revenueCents), 1)
                    const pct = Math.round((row.revenueCents / maxRevenue) * 100)
                    return (
                      <tr key={row.key}>
                        <td className="py-1 pr-3 text-stone-400 font-medium w-28">
                          {row.shortMonth}
                        </td>
                        <td className="py-1 pr-4 text-stone-100 font-semibold w-28 text-right">
                          {formatCurrency(row.revenueCents)}
                        </td>
                        <td className="py-1 w-full">
                          <div className="w-full bg-stone-800 rounded-full h-2">
                            <div
                              className="bg-green-400 h-2 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {topMonths.length > 0 && (
              <div className="mt-4 pt-4 border-t border-stone-800">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                  Top Months
                </p>
                <div className="flex gap-4">
                  {topMonths.map((m, i) => (
                    <div key={m.key} className="flex items-baseline gap-1">
                      <span className="text-xs text-stone-400">{i + 1}.</span>
                      <span className="text-sm font-semibold text-stone-300">{m.shortMonth}</span>
                      <span className="text-sm text-stone-500">
                        {formatCurrency(m.revenueCents)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {monthlyData.length === 0 && (
          <p className="text-stone-400 text-sm">No revenue recorded for {validYear}</p>
        )}
      </Card>

      {/* Expenses by Category */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wide mb-4">
          Expenses by Category
        </h2>
        {expenseRows.length === 0 ? (
          <p className="text-stone-400 text-sm">No expenses recorded for {validYear}</p>
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
                <TableCell className="font-bold text-stone-100 text-sm">Total Expenses</TableCell>
                <TableCell className="font-bold text-red-200 text-sm">
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

      {/* Tax Prep Section */}
      <Card className="p-5 border-l-4 border-l-amber-400">
        <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wide mb-1">
          Tax Preparation
        </h2>
        <p className="text-xs text-stone-500 mb-4">
          These are estimated figures for reference only. Consult your accountant for official tax
          filings.
        </p>
        <div className="space-y-2 max-w-sm">
          <div className="flex justify-between">
            <span className="text-sm text-stone-400">Gross business income</span>
            <span className="text-sm font-semibold text-green-200">
              {formatCurrency(pl.totalRevenueCents)}
            </span>
          </div>
          {pl.totalRefundsCents > 0 && (
            <div className="flex justify-between">
              <span className="text-sm text-stone-400">Refunds issued</span>
              <span className="text-sm font-semibold text-stone-400">
                &minus;{formatCurrency(pl.totalRefundsCents)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-sm text-stone-400">Business expenses (deductible)</span>
            <span className="text-sm font-semibold text-stone-400">
              &minus;{formatCurrency(pl.totalExpensesCents)}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-stone-700">
            <span className="text-sm font-bold text-stone-100">Estimated net income</span>
            <span
              className={`text-sm font-bold ${pl.netProfitCents >= 0 ? 'text-stone-100' : 'text-red-600'}`}
            >
              {formatCurrency(pl.netProfitCents)}
            </span>
          </div>
        </div>
        <p className="text-xs text-amber-200 bg-amber-950 rounded px-3 py-2 mt-4">
          This is the figure your accountant typically needs for Schedule C (self-employment
          income). Always verify with a licensed tax professional.
        </p>
      </Card>
    </div>
  )
}

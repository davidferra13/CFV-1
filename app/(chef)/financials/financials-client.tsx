'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import { exportLedgerCSV } from '@/lib/ledger/actions'
import { exportAllEventsCSV } from '@/lib/exports/actions'
import type { RevenueGoalSnapshot } from '@/lib/revenue-goals/types'

type FinancialSummary = {
  totalRevenueCents: number
  totalRefundsCents: number
  totalTipsCents: number
  netRevenueCents: number
  totalWithTipsCents: number
}

type LedgerEntry = {
  id: string
  entry_type: string
  amount_cents: number
  description: string
  created_at: string
  payment_method: string
  transaction_reference: string | null
  event: {
    id: string
    occasion: string | null
    event_date: string
  } | null
}

type MonthlyEventBreakdown = {
  eventId: string
  occasion: string | null
  eventDate: string
  status: string
  clientName: string
  revenueCents: number
  expensesCents: number
  profitCents: number
  profitMargin: number
}

type MonthlySummary = {
  year: number
  month: number
  totalRevenueCents: number
  totalExpensesCents: number
  totalProfitCents: number
  totalTipsCents: number
  averageFoodCostPercent: number
  eventCount: number
  targetRevenueCents: number
  revenueProgressPercent: number
  eventBreakdown: MonthlyEventBreakdown[]
}

type MarketIncomeEntry = {
  entry_type: string
  title: string
  start_date: string
  expected_revenue_cents: number | null
  actual_revenue_cents: number | null
  revenue_type: string | null
  is_completed: boolean
}

type Props = {
  financials: FinancialSummary
  ledgerEntries: LedgerEntry[]
  pendingPaymentsCents: number
  monthlySummary?: MonthlySummary
  revenueGoal?: RevenueGoalSnapshot
  marketIncome?: MarketIncomeEntry[]
}

const ENTRY_TYPE_LABELS: Record<string, string> = {
  payment: 'Payment',
  deposit: 'Deposit',
  installment: 'Installment',
  final_payment: 'Final Payment',
  tip: 'Tip',
  refund: 'Refund',
  adjustment: 'Adjustment',
  add_on: 'Add-On',
  credit: 'Credit',
}

const ENTRY_TYPE_COLORS: Record<string, string> = {
  payment: 'bg-green-900 text-green-800',
  deposit: 'bg-brand-900 text-brand-300',
  installment: 'bg-brand-900 text-brand-300',
  final_payment: 'bg-green-900 text-green-800',
  tip: 'bg-purple-900 text-purple-800',
  refund: 'bg-red-900 text-red-800',
  adjustment: 'bg-stone-800 text-stone-200',
  add_on: 'bg-orange-900 text-orange-800',
  credit: 'bg-teal-900 text-teal-800',
}

const CALENDAR_ENTRY_TYPE_LABELS: Record<string, string> = {
  market: 'Farmers Market',
  festival: 'Food Festival',
  class: 'Cooking Class',
  photo_shoot: 'Photo Shoot',
  media: 'Media / Press',
  other: 'Other',
}

export function FinancialsClient({
  financials,
  ledgerEntries,
  pendingPaymentsCents,
  monthlySummary,
  revenueGoal,
  marketIncome,
}: Props) {
  const [filterType, setFilterType] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportingAll, setExportingAll] = useState(false)

  // Filter entries
  const filteredEntries = useMemo(() => {
    let filtered = ledgerEntries

    if (filterType !== 'all') {
      filtered = filtered.filter((e) => e.entry_type === filterType)
    }

    if (startDate) {
      filtered = filtered.filter((e) => new Date(e.created_at) >= new Date(startDate))
    }

    if (endDate) {
      const endDateTime = new Date(endDate)
      endDateTime.setHours(23, 59, 59, 999)
      filtered = filtered.filter((e) => new Date(e.created_at) <= endDateTime)
    }

    return filtered
  }, [ledgerEntries, filterType, startDate, endDate])

  // Check if any filter is active
  const isFiltered = filterType !== 'all' || startDate !== '' || endDate !== ''

  // Calculate running balance
  const entriesWithBalance = useMemo(() => {
    let balance = 0
    return filteredEntries.map((entry) => {
      balance += entry.amount_cents
      return { ...entry, balance }
    })
  }, [filteredEntries])

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const csv = await exportLedgerCSV({
        entryType: filterType !== 'all' ? filterType : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      })

      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ledger-${format(new Date(), 'yyyy-MM-dd')}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
      toast.error('Failed to export CSV')
    } finally {
      setExporting(false)
    }
  }

  const handleExportAllEvents = async () => {
    setExportingAll(true)
    try {
      const year = monthlySummary?.year ?? new Date().getFullYear()
      const { csv, filename } = await exportAllEventsCSV(year)

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
      toast.error('Failed to export all events CSV')
    } finally {
      setExportingAll(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Financials</h1>
          <p className="text-stone-300 mt-1">View your financial performance and ledger</p>
        </div>
        <Button onClick={handleExportAllEvents} disabled={exportingAll} variant="secondary">
          {exportingAll ? 'Exporting...' : 'Export All Events'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-stone-500">Total Revenue</div>
            <div className="text-3xl font-bold text-emerald-600 mt-2">
              {formatCurrency(financials.totalRevenueCents)}
            </div>
            <p className="text-xs text-stone-500 mt-1">All successful payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-stone-500">Total Refunds</div>
            <div className="text-3xl font-bold text-red-600 mt-2">
              {formatCurrency(financials.totalRefundsCents)}
            </div>
            <p className="text-xs text-stone-500 mt-1">All refunds issued</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-stone-500">Net Revenue</div>
            <div className="text-3xl font-bold text-stone-100 mt-2">
              {formatCurrency(financials.netRevenueCents)}
            </div>
            <p className="text-xs text-stone-500 mt-1">Revenue minus refunds</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-stone-500">Tips</div>
            <div className="text-3xl font-bold text-purple-600 mt-2">
              {formatCurrency(financials.totalTipsCents)}
            </div>
            <p className="text-xs text-stone-500 mt-1">Total tips received</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Overview */}
      {monthlySummary && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                {format(new Date(monthlySummary.year, monthlySummary.month - 1), 'MMMM yyyy')}{' '}
                Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <p className="text-sm text-stone-500">Revenue</p>
                  <p className="text-xl font-bold text-emerald-600">
                    {formatCurrency(monthlySummary.totalRevenueCents)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-stone-500">Expenses</p>
                  <p className="text-xl font-bold text-stone-100">
                    {formatCurrency(monthlySummary.totalExpensesCents)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-stone-500">Profit</p>
                  <p
                    className={`text-xl font-bold ${monthlySummary.totalProfitCents >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                  >
                    {formatCurrency(monthlySummary.totalProfitCents)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-stone-500">Avg Food Cost</p>
                  <p className="text-xl font-bold text-stone-100">
                    {monthlySummary.averageFoodCostPercent}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-stone-500">Events</p>
                  <p className="text-xl font-bold text-stone-100">{monthlySummary.eventCount}</p>
                </div>
              </div>

              {/* Revenue Target Progress */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-stone-500">
                    Progress toward {formatCurrency(monthlySummary.targetRevenueCents)}
                  </span>
                  <span className="font-medium">{monthlySummary.revenueProgressPercent}%</span>
                </div>
                <div className="w-full bg-stone-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      monthlySummary.revenueProgressPercent >= 100
                        ? 'bg-green-500'
                        : monthlySummary.revenueProgressPercent >= 50
                          ? 'bg-brand-500'
                          : 'bg-stone-400'
                    }`}
                    style={{ width: `${Math.min(monthlySummary.revenueProgressPercent, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {revenueGoal && (
            <Card>
              <CardHeader>
                <CardTitle>Revenue Goal Program</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!revenueGoal.enabled ? (
                  <p className="text-sm text-stone-300">
                    Revenue goals are currently off. Enable them in Settings to receive booking and
                    calendar suggestions.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-stone-500">Monthly Target</p>
                        <p className="text-xl font-bold text-stone-100">
                          {formatCurrency(revenueGoal.monthly.targetCents)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-stone-500">Projected</p>
                        <p className="text-xl font-bold text-stone-100">
                          {formatCurrency(revenueGoal.monthly.projectedCents)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-stone-500">Gap</p>
                        <p
                          className={`text-xl font-bold ${revenueGoal.monthly.gapCents > 0 ? 'text-amber-600' : 'text-emerald-600'}`}
                        >
                          {formatCurrency(revenueGoal.monthly.gapCents)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-stone-500">Dinners Needed</p>
                        <p className="text-xl font-bold text-stone-100">
                          {revenueGoal.dinnersNeededThisMonth}
                        </p>
                      </div>
                    </div>

                    <div className="w-full bg-stone-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${revenueGoal.monthly.progressPercent >= 100 ? 'bg-green-500' : 'bg-brand-500'}`}
                        style={{
                          width: `${Math.min(100, Math.max(0, revenueGoal.monthly.progressPercent))}%`,
                        }}
                      />
                    </div>

                    {revenueGoal.openDatesThisMonth.length > 0 && (
                      <p className="text-sm text-stone-300">
                        Open dates this month:{' '}
                        {revenueGoal.openDatesThisMonth.slice(0, 6).join(', ')}
                        {revenueGoal.openDatesThisMonth.length > 6 ? ', ...' : ''}
                      </p>
                    )}

                    {revenueGoal.recommendations.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-stone-300">Top Recommendations</p>
                        {revenueGoal.recommendations.slice(0, 3).map((rec) => (
                          <div key={rec.id} className="rounded-md border border-stone-700 p-3">
                            <p className="text-sm font-semibold text-stone-100">{rec.title}</p>
                            <p className="text-sm text-stone-300 mt-1">{rec.description}</p>
                            <Link
                              href={rec.href}
                              className="text-sm text-brand-600 hover:text-brand-400 mt-2 inline-block"
                            >
                              Open <span aria-hidden="true">&rarr;</span>
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Per-Event Breakdown */}
          {monthlySummary.eventBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Per-Event Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-stone-800 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">
                          Event
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">
                          Client
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 uppercase">
                          Revenue
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 uppercase">
                          Expenses
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 uppercase">
                          Profit
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 uppercase">
                          Margin
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-stone-900 divide-y divide-stone-700">
                      {monthlySummary.eventBreakdown.map((evt) => (
                        <tr key={evt.eventId} className="hover:bg-stone-800">
                          <td className="px-4 py-3 text-sm">
                            <Link
                              href={`/events/${evt.eventId}`}
                              className="text-brand-600 hover:underline"
                            >
                              {evt.occasion || 'Untitled'}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm text-stone-100">
                            {format(new Date(evt.eventDate), 'MMM d')}
                          </td>
                          <td className="px-4 py-3 text-sm text-stone-300">{evt.clientName}</td>
                          <td className="px-4 py-3 text-sm text-right text-emerald-600 font-medium">
                            {formatCurrency(evt.revenueCents)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-stone-100">
                            {evt.expensesCents > 0 ? formatCurrency(evt.expensesCents) : '-'}
                          </td>
                          <td
                            className={`px-4 py-3 text-sm text-right font-medium ${evt.profitCents >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                          >
                            {evt.expensesCents > 0 ? formatCurrency(evt.profitCents) : '-'}
                          </td>
                          <td
                            className={`px-4 py-3 text-sm text-right font-medium ${
                              evt.profitMargin >= 60
                                ? 'text-emerald-600'
                                : evt.profitMargin >= 40
                                  ? 'text-yellow-600'
                                  : evt.profitMargin > 0
                                    ? 'text-red-600'
                                    : 'text-stone-300'
                            }`}
                          >
                            {evt.expensesCents > 0 ? `${Math.round(evt.profitMargin)}%` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Other Income — market/class/festival revenue */}
      {marketIncome &&
        marketIncome.length > 0 &&
        (() => {
          const incomeEntries = marketIncome.filter((e) => e.revenue_type === 'income')
          const promoEntries = marketIncome.filter((e) => e.revenue_type === 'promotional')
          const completedIncomeCents = incomeEntries
            .filter((e) => e.is_completed && e.actual_revenue_cents != null)
            .reduce((sum, e) => sum + (e.actual_revenue_cents ?? 0), 0)
          const expectedPendingCents = incomeEntries
            .filter((e) => !e.is_completed && e.expected_revenue_cents != null)
            .reduce((sum, e) => sum + (e.expected_revenue_cents ?? 0), 0)

          return (
            <Card>
              <CardHeader>
                <CardTitle>Other Income — Markets &amp; Classes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary strip */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-stone-500">Confirmed Income</p>
                    <p className="text-xl font-bold text-emerald-600">
                      {formatCurrency(completedIncomeCents)}
                    </p>
                    <p className="text-xs text-stone-300">From completed events</p>
                  </div>
                  <div>
                    <p className="text-sm text-stone-500">Expected (Upcoming)</p>
                    <p className="text-xl font-bold text-amber-600">
                      {formatCurrency(expectedPendingCents)}
                    </p>
                    <p className="text-xs text-stone-300">From planned events</p>
                  </div>
                  <div>
                    <p className="text-sm text-stone-500">Promotional Appearances</p>
                    <p className="text-xl font-bold text-stone-300">{promoEntries.length}</p>
                    <p className="text-xs text-stone-300">No direct revenue</p>
                  </div>
                </div>

                {/* Income entry table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-stone-800 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-stone-500 uppercase">
                          Date
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-stone-500 uppercase">
                          Type
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-stone-500 uppercase">
                          Title
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-stone-500 uppercase">
                          Expected
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-stone-500 uppercase">
                          Actual
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-stone-500 uppercase">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-stone-900 divide-y divide-stone-700">
                      {marketIncome.map((entry, i) => (
                        <tr key={i} className="hover:bg-stone-800">
                          <td className="px-3 py-2 text-sm text-stone-100 whitespace-nowrap">
                            {format(new Date(entry.start_date), 'MMM d, yyyy')}
                          </td>
                          <td className="px-3 py-2 text-sm text-stone-300 whitespace-nowrap">
                            {CALENDAR_ENTRY_TYPE_LABELS[entry.entry_type] ?? entry.entry_type}
                          </td>
                          <td className="px-3 py-2 text-sm text-stone-100">{entry.title}</td>
                          <td className="px-3 py-2 text-sm text-right text-stone-300">
                            {entry.revenue_type === 'income' &&
                            entry.expected_revenue_cents != null ? (
                              formatCurrency(entry.expected_revenue_cents)
                            ) : (
                              <span className="text-stone-300">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-sm text-right font-medium">
                            {entry.actual_revenue_cents != null ? (
                              <span className="text-emerald-600">
                                {formatCurrency(entry.actual_revenue_cents)}
                              </span>
                            ) : (
                              <span className="text-stone-300">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-sm">
                            {entry.revenue_type === 'promotional' ? (
                              <span className="inline-flex px-2 py-0.5 text-xs rounded bg-purple-900 text-purple-700">
                                Promotional
                              </span>
                            ) : entry.is_completed ? (
                              <span className="inline-flex px-2 py-0.5 text-xs rounded bg-green-900 text-green-700">
                                Completed
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-0.5 text-xs rounded bg-amber-900 text-amber-700">
                                Upcoming
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )
        })()}

      {/* Ledger Entries */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Ledger Entries ({filteredEntries.length})</CardTitle>
            <Button onClick={handleExportCSV} disabled={exporting} variant="secondary">
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Entry Type</label>
              <select
                className="w-full px-3 py-2 border border-stone-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                aria-label="Filter by entry type"
              >
                <option value="all">All Types</option>
                <option value="payment">Payments</option>
                <option value="deposit">Deposits</option>
                <option value="tip">Tips</option>
                <option value="refund">Refunds</option>
                <option value="adjustment">Adjustments</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Start Date</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">End Date</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {/* Filtered balance warning */}
          {isFiltered && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-950 border border-amber-200 rounded-md text-sm text-amber-800">
              <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
              Balance shown reflects filtered entries only
            </div>
          )}

          {/* Table */}
          {entriesWithBalance.length === 0 ? (
            <div className="text-center py-8 text-stone-500">No ledger entries found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-800 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Balance
                      {isFiltered && (
                        <span className="block text-[10px] font-normal normal-case text-amber-600 mt-0.5">
                          Filtered view
                        </span>
                      )}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-stone-900 divide-y divide-stone-700">
                  {entriesWithBalance.map((entry) => (
                    <tr key={entry.id} className="hover:bg-stone-800">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-stone-100">
                        {format(new Date(entry.created_at), 'MMM dd, yyyy')}
                        <br />
                        <span className="text-xs text-stone-500">
                          {format(new Date(entry.created_at), 'h:mm:ss a')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-100">
                        {entry.event?.occasion || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                            ENTRY_TYPE_COLORS[entry.entry_type] || 'bg-stone-800 text-stone-200'
                          }`}
                        >
                          {ENTRY_TYPE_LABELS[entry.entry_type] || entry.entry_type}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${
                          entry.amount_cents > 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {entry.amount_cents > 0 ? '+' : ''}
                        {formatCurrency(entry.amount_cents)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-stone-100">
                        {formatCurrency(entry.balance)}
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-300">
                        {entry.description}
                        {entry.transaction_reference && (
                          <div className="text-xs text-stone-300 mt-1">
                            Ref: {entry.transaction_reference.substring(0, 20)}...
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

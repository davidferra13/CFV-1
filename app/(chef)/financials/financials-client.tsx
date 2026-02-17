'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import { exportLedgerCSV } from '@/lib/ledger/actions'

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

type Props = {
  financials: FinancialSummary
  ledgerEntries: LedgerEntry[]
  pendingPaymentsCents: number
  monthlySummary?: MonthlySummary
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
  credit: 'Credit'
}

const ENTRY_TYPE_COLORS: Record<string, string> = {
  payment: 'bg-green-100 text-green-800',
  deposit: 'bg-brand-100 text-brand-800',
  installment: 'bg-brand-100 text-brand-800',
  final_payment: 'bg-green-100 text-green-800',
  tip: 'bg-purple-100 text-purple-800',
  refund: 'bg-red-100 text-red-800',
  adjustment: 'bg-stone-100 text-stone-800',
  add_on: 'bg-orange-100 text-orange-800',
  credit: 'bg-teal-100 text-teal-800'
}

export function FinancialsClient({
  financials,
  ledgerEntries,
  pendingPaymentsCents,
  monthlySummary
}: Props) {
  const [filterType, setFilterType] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [exporting, setExporting] = useState(false)

  // Filter entries
  const filteredEntries = useMemo(() => {
    let filtered = ledgerEntries

    if (filterType !== 'all') {
      filtered = filtered.filter(e => e.entry_type === filterType)
    }

    if (startDate) {
      filtered = filtered.filter(e => new Date(e.created_at) >= new Date(startDate))
    }

    if (endDate) {
      const endDateTime = new Date(endDate)
      endDateTime.setHours(23, 59, 59, 999)
      filtered = filtered.filter(e => new Date(e.created_at) <= endDateTime)
    }

    return filtered
  }, [ledgerEntries, filterType, startDate, endDate])

  // Calculate running balance
  const entriesWithBalance = useMemo(() => {
    let balance = 0
    return filteredEntries.map(entry => {
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
        endDate: endDate || undefined
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
      alert('Failed to export CSV')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Financials</h1>
        <p className="text-stone-600 mt-1">View your financial performance and ledger</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-stone-500">Total Revenue</div>
            <div className="text-3xl font-bold text-green-600 mt-2">
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
            <div className="text-3xl font-bold text-stone-900 mt-2">
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
                {format(new Date(monthlySummary.year, monthlySummary.month - 1), 'MMMM yyyy')} Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <p className="text-sm text-stone-500">Revenue</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(monthlySummary.totalRevenueCents)}</p>
                </div>
                <div>
                  <p className="text-sm text-stone-500">Expenses</p>
                  <p className="text-xl font-bold text-stone-900">{formatCurrency(monthlySummary.totalExpensesCents)}</p>
                </div>
                <div>
                  <p className="text-sm text-stone-500">Profit</p>
                  <p className={`text-xl font-bold ${monthlySummary.totalProfitCents >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(monthlySummary.totalProfitCents)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-stone-500">Avg Food Cost</p>
                  <p className="text-xl font-bold text-stone-900">{monthlySummary.averageFoodCostPercent}%</p>
                </div>
                <div>
                  <p className="text-sm text-stone-500">Events</p>
                  <p className="text-xl font-bold text-stone-900">{monthlySummary.eventCount}</p>
                </div>
              </div>

              {/* Revenue Target Progress */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-stone-500">Progress toward {formatCurrency(monthlySummary.targetRevenueCents)}</span>
                  <span className="font-medium">{monthlySummary.revenueProgressPercent}%</span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      monthlySummary.revenueProgressPercent >= 100 ? 'bg-green-500' :
                      monthlySummary.revenueProgressPercent >= 50 ? 'bg-brand-500' :
                      'bg-stone-400'
                    }`}
                    style={{ width: `${Math.min(monthlySummary.revenueProgressPercent, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Per-Event Breakdown */}
          {monthlySummary.eventBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Per-Event Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-stone-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">Event</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">Client</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 uppercase">Revenue</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 uppercase">Expenses</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 uppercase">Profit</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 uppercase">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-stone-200">
                      {monthlySummary.eventBreakdown.map((evt) => (
                        <tr key={evt.eventId} className="hover:bg-stone-50">
                          <td className="px-4 py-3 text-sm">
                            <Link href={`/events/${evt.eventId}`} className="text-brand-600 hover:underline">
                              {evt.occasion || 'Untitled'}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm text-stone-900">
                            {format(new Date(evt.eventDate), 'MMM d')}
                          </td>
                          <td className="px-4 py-3 text-sm text-stone-600">{evt.clientName}</td>
                          <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">
                            {formatCurrency(evt.revenueCents)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-stone-900">
                            {evt.expensesCents > 0 ? formatCurrency(evt.expensesCents) : '—'}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right font-medium ${evt.profitCents >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {evt.expensesCents > 0 ? formatCurrency(evt.profitCents) : '—'}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right font-medium ${
                            evt.profitMargin >= 60 ? 'text-green-600' :
                            evt.profitMargin >= 40 ? 'text-yellow-600' :
                            evt.profitMargin > 0 ? 'text-red-600' : 'text-stone-400'
                          }`}>
                            {evt.expensesCents > 0 ? `${Math.round(evt.profitMargin)}%` : '—'}
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
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Entry Type
              </label>
              <select
                className="w-full px-3 py-2 border border-stone-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
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
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          {entriesWithBalance.length === 0 ? (
            <div className="text-center py-8 text-stone-500">
              No ledger entries found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50 border-b">
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
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-stone-200">
                  {entriesWithBalance.map((entry) => (
                    <tr key={entry.id} className="hover:bg-stone-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-stone-900">
                        {format(new Date(entry.created_at), 'MMM dd, yyyy')}
                        <br />
                        <span className="text-xs text-stone-500">
                          {format(new Date(entry.created_at), 'HH:mm:ss')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-900">
                        {entry.event?.occasion || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                            ENTRY_TYPE_COLORS[entry.entry_type] || 'bg-stone-100 text-stone-800'
                          }`}
                        >
                          {ENTRY_TYPE_LABELS[entry.entry_type] || entry.entry_type}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${
                          entry.amount_cents > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {entry.amount_cents > 0 ? '+' : ''}
                        {formatCurrency(entry.amount_cents)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-stone-900">
                        {formatCurrency(entry.balance)}
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-600">
                        {entry.description}
                        {entry.transaction_reference && (
                          <div className="text-xs text-stone-400 mt-1">
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

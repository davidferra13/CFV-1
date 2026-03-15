'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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
import { getProfitDashboard, type ProfitDashboardData } from '@/lib/finance/margin-calculator'

export function ProfitDashboard() {
  const [data, setData] = useState<ProfitDashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getProfitDashboard()
      .then((result) => {
        if (!cancelled) {
          setData(result)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? 'Failed to load profit data')
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4 h-20" />
          ))}
        </div>
        <Card className="p-4 h-64" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card className="p-8 text-center">
        <p className="text-red-500 font-medium">
          {error ?? 'Could not load profit dashboard data'}
        </p>
        <p className="text-stone-500 text-sm mt-1">Try refreshing the page.</p>
      </Card>
    )
  }

  const changeLabel =
    data.revenueChangePercent !== null
      ? `${data.revenueChangePercent >= 0 ? '+' : ''}${data.revenueChangePercent}% vs last month`
      : 'No last month data'

  const changeColor =
    data.revenueChangePercent !== null && data.revenueChangePercent >= 0
      ? 'text-green-500'
      : 'text-red-500'

  return (
    <div className="space-y-6">
      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-700">
            {formatCurrency(data.ytdRevenueCents)}
          </p>
          <p className="text-sm text-stone-500 mt-1">YTD Revenue</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-red-600">{formatCurrency(data.ytdExpensesCents)}</p>
          <p className="text-sm text-stone-500 mt-1">YTD Expenses</p>
        </Card>
        <Card className="p-4">
          <p
            className={`text-2xl font-bold ${
              data.ytdProfitCents >= 0 ? 'text-stone-100' : 'text-red-600'
            }`}
          >
            {formatCurrency(data.ytdProfitCents)}
          </p>
          <p className="text-sm text-stone-500 mt-1">YTD Profit</p>
        </Card>
        <Card className="p-4">
          <p
            className={`text-2xl font-bold ${
              data.ytdMarginPercent >= 20 ? 'text-green-700' : 'text-yellow-500'
            }`}
          >
            {data.ytdMarginPercent}%
          </p>
          <p className="text-sm text-stone-500 mt-1">Overall Margin</p>
        </Card>
      </div>

      {/* ── Month-over-Month ── */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-stone-100 mb-2">Current Month</h3>
        <div className="flex items-baseline gap-4">
          <p className="text-xl font-bold text-stone-100">
            {formatCurrency(data.currentMonthProfitCents)} profit
          </p>
          <p className={`text-sm ${changeColor}`}>{changeLabel}</p>
        </div>
        <div className="flex gap-6 mt-2 text-sm text-stone-400">
          <span>Revenue: {formatCurrency(data.currentMonthRevenueCents)}</span>
          <span>Expenses: {formatCurrency(data.currentMonthExpensesCents)}</span>
        </div>
      </Card>

      {/* ── Monthly Trend ── */}
      {data.monthlyTrend.length > 0 && (
        <Card>
          <div className="p-4 border-b border-stone-800">
            <h3 className="text-lg font-semibold text-stone-100">Monthly Trend</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Events</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-right">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.monthlyTrend.map((m) => (
                <TableRow key={m.month}>
                  <TableCell className="font-medium">{m.label}</TableCell>
                  <TableCell className="text-right text-stone-400">{m.eventCount}</TableCell>
                  <TableCell className="text-right text-green-700">
                    {formatCurrency(m.totalRevenueCents)}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {formatCurrency(m.totalExpensesCents)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-semibold ${
                      m.profitCents >= 0 ? 'text-stone-100' : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(m.profitCents)}
                  </TableCell>
                  <TableCell
                    className={`text-right ${
                      m.marginPercent >= 20 ? 'text-stone-400' : 'text-red-500 font-semibold'
                    }`}
                  >
                    {m.marginPercent}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ── Top Clients by Revenue ── */}
      {data.topClientsByRevenue.length > 0 && (
        <Card>
          <div className="p-4 border-b border-stone-800">
            <h3 className="text-lg font-semibold text-stone-100">Top Clients by Revenue</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Events</TableHead>
                <TableHead className="text-right">Total Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topClientsByRevenue.map((c) => (
                <TableRow key={c.clientId}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/clients/${c.clientId}`}
                      className="text-brand-600 hover:underline"
                    >
                      {c.clientName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right text-stone-400">{c.eventCount}</TableCell>
                  <TableCell className="text-right text-green-700 font-semibold">
                    {formatCurrency(c.totalRevenueCents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ── Low-Margin Events ── */}
      {data.lowMarginEvents.length > 0 && (
        <Card>
          <div className="p-4 border-b border-stone-800">
            <h3 className="text-lg font-semibold text-red-500">Low-Margin Events (below 20%)</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Occasion</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.lowMarginEvents.map((e) => (
                <TableRow key={e.eventId}>
                  <TableCell className="text-stone-400 text-sm">{e.eventDate ?? '-'}</TableCell>
                  <TableCell className="font-medium">{e.clientName ?? '-'}</TableCell>
                  <TableCell className="text-stone-400 text-sm capitalize">
                    {e.occasion?.replace(/_/g, ' ') ?? '-'}
                  </TableCell>
                  <TableCell className="text-right text-green-700">
                    <Link href={`/events/${e.eventId}`} className="hover:underline">
                      {formatCurrency(e.revenueCents)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {formatCurrency(e.expensesCents)}
                  </TableCell>
                  <TableCell className="text-right text-red-500 font-bold">
                    {e.marginPercent}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {data.topClientsByRevenue.length === 0 &&
        data.lowMarginEvents.length === 0 &&
        data.monthlyTrend.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-stone-400 font-medium">No event data yet</p>
            <p className="text-stone-500 text-sm mt-1">
              Revenue and expense data will appear here as events are completed.
            </p>
          </Card>
        )}
    </div>
  )
}

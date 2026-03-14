// Commerce Reports Hub — shift reports, daily summary, product & channel breakdowns
import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { getRegisterSessionHistory } from '@/lib/commerce/register-actions'
import {
  getDailySalesReport,
  getProductReport,
  getChannelReport,
  getPaymentMixReport,
} from '@/lib/commerce/report-actions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SALE_CHANNEL_LABELS } from '@/lib/commerce/constants'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { SaleChannel } from '@/lib/commerce/constants'
import { ReportsDatePicker } from '@/components/commerce/reports-page-client'

export const metadata: Metadata = { title: 'Commerce Reports — ChefFlow' }

export default async function CommerceReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  await requireChef()
  await requirePro('commerce')

  const params = await searchParams
  const to = params.to || new Date().toISOString().split('T')[0]
  const from =
    params.from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [dailyReport, productReport, channelReport, paymentMixReport, { sessions }] =
    await Promise.all([
      getDailySalesReport(from, to),
      getProductReport(from, to),
      getChannelReport(from, to),
      getPaymentMixReport(from, to),
      getRegisterSessionHistory({ limit: 5, status: 'closed' }),
    ])

  const totalRevenue = dailyReport.reduce((sum, d) => sum + d.netRevenueCents, 0)
  const totalSales = dailyReport.reduce((sum, d) => sum + d.salesCount, 0)
  const avgOrder = totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-stone-100">Commerce Reports</h1>

      {/* Date picker + export */}
      <ReportsDatePicker defaultFrom={from} defaultTo={to} />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-stone-100">${(totalRevenue / 100).toFixed(2)}</p>
            <p className="text-xs text-stone-500 mt-1">Net Revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-stone-100">{totalSales}</p>
            <p className="text-xs text-stone-500 mt-1">Total Sales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-stone-100">${(avgOrder / 100).toFixed(2)}</p>
            <p className="text-xs text-stone-500 mt-1">Avg Order</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-stone-100">{productReport.length}</p>
            <p className="text-xs text-stone-500 mt-1">Products Sold</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily summary */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyReport.length === 0 ? (
            <p className="text-stone-500 text-sm">No sales in this period</p>
          ) : (
            <div className="space-y-2">
              {dailyReport.map((day) => (
                <div
                  key={day.date}
                  className="flex items-center justify-between py-2 border-b border-stone-800 last:border-0"
                >
                  <div>
                    <span className="text-stone-200 font-medium">
                      {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="text-stone-500 text-sm ml-3">
                      {day.salesCount} sale{day.salesCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-stone-200 font-medium">
                      ${(day.netRevenueCents / 100).toFixed(2)}
                    </span>
                    {day.refundsCents > 0 && (
                      <span className="text-red-400 text-xs ml-2">
                        (-${(day.refundsCents / 100).toFixed(2)})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top products */}
      <Card>
        <CardHeader>
          <CardTitle>Top Products</CardTitle>
        </CardHeader>
        <CardContent>
          {productReport.length === 0 ? (
            <p className="text-stone-500 text-sm">No product data</p>
          ) : (
            <div className="space-y-2">
              {productReport.slice(0, 10).map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 border-b border-stone-800 last:border-0"
                >
                  <div>
                    <span className="text-stone-200">{p.productName}</span>
                    <span className="text-stone-500 text-sm ml-2">{p.quantitySold} sold</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        p.marginPercent >= 60
                          ? 'success'
                          : p.marginPercent >= 30
                            ? 'warning'
                            : 'error'
                      }
                    >
                      {p.marginPercent}% margin
                    </Badge>
                    <span className="text-stone-200 font-medium">
                      ${(p.revenueCents / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Channel breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Sales by Channel</CardTitle>
        </CardHeader>
        <CardContent>
          {channelReport.length === 0 ? (
            <p className="text-stone-500 text-sm">No channel data</p>
          ) : (
            <div className="space-y-2">
              {channelReport.map((ch) => (
                <div
                  key={ch.channel}
                  className="flex items-center justify-between py-2 border-b border-stone-800 last:border-0"
                >
                  <div>
                    <span className="text-stone-200">
                      {SALE_CHANNEL_LABELS[ch.channel as SaleChannel] ?? ch.channel}
                    </span>
                    <span className="text-stone-500 text-sm ml-2">
                      {ch.salesCount} sale{ch.salesCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="default">{ch.percentOfTotal}%</Badge>
                    <span className="text-stone-200 font-medium">
                      ${(ch.revenueCents / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment mix */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Mix</CardTitle>
        </CardHeader>
        <CardContent>
          {paymentMixReport.rows.length === 0 ? (
            <p className="text-stone-500 text-sm">No payment data for this period</p>
          ) : (
            <div className="space-y-2">
              {paymentMixReport.rows.map((row) => (
                <div
                  key={row.method}
                  className="rounded-md border border-stone-800 bg-stone-900/40 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-stone-200 font-medium uppercase tracking-wide">
                        {row.method}
                      </p>
                      <p className="text-xs text-stone-500">
                        {row.paymentCount} tender{row.paymentCount !== 1 ? 's' : ''} • avg $
                        {(row.averageTenderCents / 100).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-stone-100 font-semibold">
                        ${(row.totalCents / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-stone-500">{row.percentOfTotal}% of total</p>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded bg-stone-800 overflow-hidden">
                    <div
                      className="h-full bg-brand-500"
                      style={{ width: `${Math.min(100, Math.max(0, row.percentOfTotal))}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-2 text-xs text-stone-500">
                Total tenders: {paymentMixReport.totals.paymentCount} • Gross $
                {(paymentMixReport.totals.grossCents / 100).toFixed(2)} • Tips $
                {(paymentMixReport.totals.tipCents / 100).toFixed(2)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent shifts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Shifts</CardTitle>
            <Link href="/commerce/reports/shifts">
              <Button variant="ghost">View All</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-stone-500 text-sm">No closed register sessions</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((sess: any) => (
                <div
                  key={sess.id}
                  className="flex items-center justify-between py-2 border-b border-stone-800 last:border-0"
                >
                  <div>
                    <span className="text-stone-200">{sess.session_name ?? 'Shift'}</span>
                    <span className="text-stone-500 text-sm ml-2">
                      {new Date(sess.opened_at).toLocaleDateString()}
                    </span>
                    <span className="text-stone-500 text-sm ml-2">
                      {sess.total_sales_count ?? 0} sales
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {(sess.cash_variance_cents ?? 0) !== 0 && (
                      <span
                        className={
                          Math.abs(sess.cash_variance_cents) > 100
                            ? 'text-amber-400 text-sm'
                            : 'text-stone-400 text-sm'
                        }
                      >
                        ${(sess.cash_variance_cents / 100).toFixed(2)} variance
                      </span>
                    )}
                    <span className="text-stone-200 font-medium">
                      ${((sess.total_revenue_cents ?? 0) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getAllSeriesFinancials } from '@/lib/events/series-financial-actions'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/format'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'

export const metadata: Metadata = { title: 'Series Financial Summary' }

export default async function SeriesFinancialReportPage() {
  await requireChef()
  const seriesFinancials = await getAllSeriesFinancials()

  const grandTotalRevenue = seriesFinancials.reduce((s, f) => s + f.totalRevenueCents, 0)
  const grandTotalExpense = seriesFinancials.reduce((s, f) => s + f.totalExpenseCents, 0)
  const grandTotalProfit = grandTotalRevenue - grandTotalExpense
  const grandTotalGuests = seriesFinancials.reduce((s, f) => s + f.totalGuests, 0)
  const grandTotalEvents = seriesFinancials.reduce((s, f) => s + f.eventCount, 0)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/reporting" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Reporting
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Series Financial Summary</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Revenue, profit, and margin aggregated across all event series.
        </p>
      </div>

      {seriesFinancials.length === 0 ? (
        <EmptyState
          title="No series with events"
          description="Create an event series and link events to see financial aggregation here."
          action={{ label: 'Event Series', href: '/events/series' }}
        />
      ) : (
        <>
          {/* Grand totals */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold">{seriesFinancials.length}</p>
                <p className="text-xs text-muted-foreground">Series</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold">{grandTotalEvents}</p>
                <p className="text-xs text-muted-foreground">Total Events</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold">{formatCurrency(grandTotalRevenue)}</p>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold">{formatCurrency(grandTotalProfit)}</p>
                <p className="text-xs text-muted-foreground">Total Profit</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold">{grandTotalGuests}</p>
                <p className="text-xs text-muted-foreground">Total Guests</p>
              </CardContent>
            </Card>
          </div>

          {/* Per-series table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Series</TableHead>
                    <TableHead className="text-right">Events</TableHead>
                    <TableHead className="text-right">Guests</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-right">Avg/Guest</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {seriesFinancials.map((series) => (
                    <TableRow key={series.seriesId}>
                      <TableCell>
                        <Link
                          href={`/events/series/${series.seriesId}`}
                          className="font-medium hover:underline"
                        >
                          {series.seriesName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">{series.eventCount}</TableCell>
                      <TableCell className="text-right">{series.totalGuests}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(series.totalRevenueCents)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(series.totalExpenseCents)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            series.totalProfitCents >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }
                        >
                          {formatCurrency(series.totalProfitCents)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {series.avgMarginPercent !== null ? (
                          <Badge
                            variant={
                              series.avgMarginPercent >= 30
                                ? 'success'
                                : series.avgMarginPercent >= 15
                                  ? 'warning'
                                  : 'error'
                            }
                          >
                            {series.avgMarginPercent}%
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {series.avgPerGuestCents !== null
                          ? formatCurrency(series.avgPerGuestCents)
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

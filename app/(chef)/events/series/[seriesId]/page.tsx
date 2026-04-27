import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { getEventSeriesDetail } from '@/lib/events/series-actions'
import { getSeriesFinancialSummary } from '@/lib/events/series-financial-actions'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/format'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

export const metadata: Metadata = { title: 'Series Detail' }

export default async function SeriesDetailPage({
  params,
}: {
  params: Promise<{ seriesId: string }>
}) {
  await requireChef()
  const { seriesId } = await params

  const [series, financials] = await Promise.all([
    getEventSeriesDetail(seriesId),
    getSeriesFinancialSummary(seriesId),
  ])

  if (!series) notFound()

  const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
    active: 'success',
    paused: 'warning',
    completed: 'default',
    cancelled: 'error',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{series.name}</h1>
            <Badge variant={statusVariant[series.status] ?? 'default'}>{series.status}</Badge>
          </div>
          {series.description && (
            <p className="mt-1 text-sm text-muted-foreground">{series.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href="/events/series">
            <Button variant="ghost">Back</Button>
          </Link>
        </div>
      </div>

      {financials && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-semibold">{financials.eventCount}</p>
              <p className="text-xs text-muted-foreground">Events</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-semibold">
                {formatCurrency(financials.totalRevenueCents)}
              </p>
              <p className="text-xs text-muted-foreground">Revenue</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-semibold">
                {formatCurrency(financials.totalProfitCents)}
              </p>
              <p className="text-xs text-muted-foreground">Profit</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-semibold">
                {financials.avgMarginPercent !== null ? `${financials.avgMarginPercent}%` : '-'}
              </p>
              <p className="text-xs text-muted-foreground">Avg Margin</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-semibold">{financials.totalGuests}</p>
              <p className="text-xs text-muted-foreground">Total Guests</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Guests</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-right">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {series.events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No events linked to this series yet.
                  </TableCell>
                </TableRow>
              ) : (
                series.events.map((event) => {
                  const fin = financials?.events.find((e) => e.id === event.id)
                  return (
                    <TableRow key={event.id}>
                      <TableCell>
                        <Link href={`/events/${event.id}`} className="font-medium hover:underline">
                          {event.occasion || 'Untitled'}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {event.event_date
                          ? new Date(event.event_date + 'T00:00:00').toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            event.status === 'completed'
                              ? 'success'
                              : event.status === 'cancelled'
                                ? 'error'
                                : 'default'
                          }
                        >
                          {event.status || 'draft'}
                        </Badge>
                      </TableCell>
                      <TableCell>{event.guest_count ?? '-'}</TableCell>
                      <TableCell className="text-right">
                        {fin ? formatCurrency(fin.revenue_cents) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {fin ? formatCurrency(fin.profit_cents) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {fin?.margin_percent !== null && fin?.margin_percent !== undefined
                          ? `${fin.margin_percent}%`
                          : '-'}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

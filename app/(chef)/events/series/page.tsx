import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEventSeriesList } from '@/lib/events/series-actions'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency } from '@/lib/utils/format'
import { getAllSeriesFinancials } from '@/lib/events/series-financial-actions'

export const metadata: Metadata = { title: 'Event Series' }

export default async function EventSeriesPage() {
  await requireChef()

  const [seriesList, financials] = await Promise.all([
    getEventSeriesList(),
    getAllSeriesFinancials(),
  ])

  const financialMap = new Map(financials.map((f) => [f.seriesId, f]))

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
          <h1 className="text-2xl font-semibold">Event Series</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Recurring dinner series, multi-event packages, and themed collections.
          </p>
        </div>
        <Link href="/events/series/new">
          <Button>New Series</Button>
        </Link>
      </div>

      {seriesList.length === 0 ? (
        <EmptyState
          title="No series yet"
          description="Group related events into a series to track performance across multiple dinners."
          action={{ label: 'Create Series', href: '/events/series/new' }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {seriesList.map((series) => {
            const fin = financialMap.get(series.id)
            return (
              <Link key={series.id} href={`/events/series/${series.id}`}>
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold leading-tight">{series.name}</h3>
                      <Badge variant={statusVariant[series.status] ?? 'default'}>
                        {series.status}
                      </Badge>
                    </div>

                    {series.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {series.description}
                      </p>
                    )}

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <p className="font-semibold text-foreground">{series.event_count ?? 0}</p>
                        <p className="text-muted-foreground">Events</p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {fin ? formatCurrency(fin.totalRevenueCents) : '-'}
                        </p>
                        <p className="text-muted-foreground">Revenue</p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {fin?.avgMarginPercent !== null && fin?.avgMarginPercent !== undefined
                            ? `${fin.avgMarginPercent}%`
                            : '-'}
                        </p>
                        <p className="text-muted-foreground">Margin</p>
                      </div>
                    </div>

                    {series.start_date && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Started {new Date(series.start_date + 'T00:00:00').toLocaleDateString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

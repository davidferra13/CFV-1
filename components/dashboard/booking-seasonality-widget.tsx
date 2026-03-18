// Booking Seasonality Widget - shows demand patterns across months

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from '@/components/ui/icons'

interface MonthSeasonality {
  month: number
  monthName: string
  shortName: string
  eventCount: number
  avgRevenueCents: number | null
}

interface UpcomingSeasonSignal {
  month: number
  monthName: string
  monthsAway: number
}

interface BookingSeasonality {
  months: MonthSeasonality[]
  peakMonths: number[]
  quietMonths: number[]
  upcomingPeak: UpcomingSeasonSignal | null
  upcomingQuiet: UpcomingSeasonSignal | null
  totalEventsAnalyzed: number
  yearsOfData: number
  hasEnoughData: boolean
}

interface Props {
  seasonality: BookingSeasonality
}

export function BookingSeasonalityWidget({ seasonality }: Props) {
  if (!seasonality.hasEnoughData) return null

  const maxCount = Math.max(...seasonality.months.map((m) => m.eventCount), 1)

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Booking Seasonality</CardTitle>
          <Link
            href="/analytics/demand"
            className="inline-flex items-center gap-1 text-sm text-brand-500 hover:text-brand-400"
          >
            Demand <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <p className="text-xs text-stone-500 mt-0.5">
          {seasonality.totalEventsAnalyzed} events across {seasonality.yearsOfData} year
          {seasonality.yearsOfData !== 1 ? 's' : ''}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mini heatmap */}
        <div className="grid grid-cols-12 gap-0.5">
          {seasonality.months.map((month) => {
            const intensity = month.eventCount / maxCount
            const isPeak = seasonality.peakMonths.includes(month.month)
            const isQuiet = seasonality.quietMonths.includes(month.month)

            return (
              <div key={month.month} className="flex flex-col items-center gap-1">
                <div
                  className={`w-full aspect-square rounded-sm ${
                    isPeak
                      ? 'bg-green-500'
                      : isQuiet
                        ? 'bg-stone-700'
                        : intensity > 0.5
                          ? 'bg-brand-500'
                          : intensity > 0
                            ? 'bg-brand-800'
                            : 'bg-stone-800'
                  }`}
                  title={`${month.monthName}: ${month.eventCount} events`}
                />
                <span className="text-2xs text-stone-600">{month.shortName}</span>
              </div>
            )
          })}
        </div>

        {/* Signals */}
        <div className="flex flex-wrap gap-2 text-xs">
          {seasonality.peakMonths.length > 0 && (
            <span className="text-green-400">
              Peak:{' '}
              {seasonality.peakMonths
                .map((m) => seasonality.months.find((mo) => mo.month === m)?.monthName)
                .join(', ')}
            </span>
          )}
          {seasonality.upcomingPeak && (
            <span className="text-brand-400">
              Next peak: {seasonality.upcomingPeak.monthName} ({seasonality.upcomingPeak.monthsAway}
              mo away)
            </span>
          )}
          {seasonality.upcomingQuiet && (
            <span className="text-stone-500">
              Quiet ahead: {seasonality.upcomingQuiet.monthName}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

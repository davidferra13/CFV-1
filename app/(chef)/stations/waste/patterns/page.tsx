// Waste Pattern Analysis - Identifies repeat offenders, day-of-week trends, and station hotspots.
// Solves: "prep errors repeat, and line absorbs the cost" by surfacing patterns that are invisible in raw logs.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getWastePatterns } from '@/lib/stations/waste-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Waste Patterns' }

const REASON_LABELS: Record<string, string> = {
  expired: 'Expired',
  damaged: 'Damaged',
  overproduced: 'Overproduced',
  dropped: 'Dropped',
  other: 'Other',
}

const REASON_COLORS: Record<string, 'error' | 'warning' | 'default'> = {
  expired: 'error',
  damaged: 'error',
  overproduced: 'warning',
  dropped: 'warning',
  other: 'default',
}

export default async function WastePatternsPage() {
  await requireChef()
  const patterns = await getWastePatterns(30)

  const maxDayCount = Math.max(...patterns.dayDistribution.map((d) => d.count), 1)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/stations" className="text-stone-500 hover:text-stone-300">
          Stations
        </Link>
        <span className="text-stone-600">/</span>
        <Link href="/stations/waste" className="text-stone-500 hover:text-stone-300">
          Waste Log
        </Link>
        <span className="text-stone-600">/</span>
        <span className="text-stone-300">Patterns</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-stone-100">Waste Patterns</h1>
        <p className="mt-1 text-sm text-stone-500">
          Last {patterns.days} days, {patterns.totalEntries} waste entries analyzed.
          {patterns.totalEntries === 0 && ' No waste logged yet.'}
        </p>
      </div>

      {patterns.totalEntries === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-500 text-sm">
              No waste data to analyze. Log waste from station clipboards to see patterns here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ============================================ */}
          {/* REPEAT OFFENDERS */}
          {/* ============================================ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Repeat Offenders
                <span className="ml-2 text-sm font-normal text-stone-500">
                  Components that waste the most
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patterns.repeatOffenders.length === 0 ? (
                <p className="text-sm text-stone-500">No repeat offenders found.</p>
              ) : (
                <div className="space-y-3">
                  {patterns.repeatOffenders.map((item, idx) => (
                    <div
                      key={item.componentId}
                      className="flex items-center justify-between rounded-lg bg-stone-800/50 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-stone-600 w-6">#{idx + 1}</span>
                        <div>
                          <p className="text-sm font-medium text-stone-200">{item.componentName}</p>
                          <p className="text-xs text-stone-500">{item.stationName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={REASON_COLORS[item.topReason] ?? 'default'}>
                          {REASON_LABELS[item.topReason] ?? item.topReason}
                        </Badge>
                        <span className="text-sm font-semibold text-stone-300">{item.count}x</span>
                        {item.totalValueCents > 0 && (
                          <span className="text-xs text-stone-500">
                            ${(item.totalValueCents / 100).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ============================================ */}
          {/* DAY OF WEEK DISTRIBUTION */}
          {/* ============================================ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Day-of-Week Distribution
                <span className="ml-2 text-sm font-normal text-stone-500">
                  When waste happens most
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {patterns.dayDistribution.map((day) => (
                  <div key={day.day} className="flex items-center gap-3">
                    <span className="text-sm text-stone-400 w-24">{day.day}</span>
                    <div className="flex-1 h-5 bg-stone-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          day.count === maxDayCount && day.count > 0 ? 'bg-red-500' : 'bg-amber-600'
                        }`}
                        style={{
                          width: `${maxDayCount > 0 ? (day.count / maxDayCount) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-mono text-stone-400 w-8 text-right">
                      {day.count}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ============================================ */}
          {/* STATION BREAKDOWN */}
          {/* ============================================ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                By Station
                <span className="ml-2 text-sm font-normal text-stone-500">
                  Where waste concentrates
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patterns.stationBreakdown.length === 0 ? (
                <p className="text-sm text-stone-500">No station data.</p>
              ) : (
                <div className="space-y-2">
                  {patterns.stationBreakdown.map((station) => (
                    <div
                      key={station.stationId}
                      className="flex items-center justify-between text-sm border-b border-stone-800 pb-2"
                    >
                      <span className="text-stone-200">{station.stationName}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-stone-400">
                          {station.count} entr{station.count !== 1 ? 'ies' : 'y'}
                        </span>
                        {station.totalValueCents > 0 && (
                          <span className="text-stone-500">
                            ${(station.totalValueCents / 100).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

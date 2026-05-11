'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { getTravelOptimizationReport } from '@/lib/intelligence/travel-optimization-actions'
import type { TravelOptimization } from '@/lib/intelligence/travel-optimization-actions'
import { EventClusterCard } from '@/components/intelligence/event-cluster-card'
import { TravelSavingsBanner } from '@/components/intelligence/travel-savings-banner'

interface TravelOptimizationClientProps {
  defaultWeekStart: string
}

export function TravelOptimizationClient({
  defaultWeekStart,
}: TravelOptimizationClientProps) {
  const [weekStart, setWeekStart] = useState(defaultWeekStart)
  const [report, setReport] = useState<TravelOptimization | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const loadReport = (start: string) => {
    startTransition(async () => {
      try {
        const result = await getTravelOptimizationReport(start)
        if (result.error) {
          setError(result.error)
          setReport(null)
        } else {
          setReport(result.data)
          setError(null)
        }
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load')
        setReport(null)
      }
    })
  }

  useEffect(() => {
    loadReport(defaultWeekStart)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const shiftWeek = (direction: number) => {
    const d = new Date(weekStart + 'T00:00:00')
    d.setDate(d.getDate() + direction * 7)
    const newStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    setWeekStart(newStart)
    loadReport(newStart)
  }

  // Format week label
  const weekLabel = (() => {
    const mon = new Date(weekStart + 'T12:00:00')
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${mon.toLocaleDateString('en-US', opts)} - ${sun.toLocaleDateString('en-US', opts)}`
  })()

  return (
    <div className="space-y-6">
      {/* Week selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => shiftWeek(-1)}
          className="px-2 py-1 text-sm text-stone-400 border border-stone-700 rounded hover:bg-stone-800 transition-colors"
        >
          &larr; Prev
        </button>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={weekStart}
            onChange={(e) => {
              setWeekStart(e.target.value)
              loadReport(e.target.value)
            }}
            className="bg-stone-900 border border-stone-700 rounded px-2 py-1 text-sm text-stone-300"
          />
          <span className="text-sm text-stone-400 font-medium">{weekLabel}</span>
        </div>
        <button
          onClick={() => shiftWeek(1)}
          className="px-2 py-1 text-sm text-stone-400 border border-stone-700 rounded hover:bg-stone-800 transition-colors"
        >
          Next &rarr;
        </button>
      </div>

      {/* Loading */}
      {isPending && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-stone-800/50 animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && !isPending && (
        <div className="rounded-lg border border-red-800/40 bg-red-950/30 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* No data */}
      {!report && !error && !isPending && (
        <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-8 text-center">
          <p className="text-sm text-stone-500">
            No upcoming events found for this week.
          </p>
        </div>
      )}

      {/* Report */}
      {report && !isPending && (
        <>
          {/* Savings banner */}
          <TravelSavingsBanner
            savings={report.mileageSaved}
            totalEvents={report.totalEvents}
          />

          {/* Suggested shopping trips */}
          {report.suggestedTrips.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-stone-200 mb-3">Suggested Shopping Trips</h2>
              <div className="space-y-3">
                {report.suggestedTrips.map((trip, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-amber-800/30 bg-amber-950/10 p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-amber-300">
                        Shop on {new Date(trip.suggestedDate + 'T12:00:00').toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </h4>
                      <span className="text-xs text-stone-500">
                        ~{trip.estimatedStops} stop(s) in {trip.area}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mb-2">{trip.rationale}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {trip.coversEvents.map((evt) => (
                        <Link
                          key={evt.eventId}
                          href={`/events/${evt.eventId}`}
                          className="inline-flex items-center gap-1 rounded bg-stone-800/80 px-2 py-0.5 text-xs text-stone-400 hover:text-stone-200 transition-colors"
                        >
                          <span className="truncate max-w-[120px]">{evt.eventName}</span>
                          <span className="text-stone-600">{evt.eventDate}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Event clusters */}
          <div>
            <h2 className="text-lg font-semibold text-stone-200 mb-3">
              Events by Area ({report.clusters.length} area{report.clusters.length !== 1 ? 's' : ''})
            </h2>
            <div className="space-y-3">
              {report.clusters.map((cluster, i) => (
                <EventClusterCard key={i} cluster={cluster} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { getWeeklyOpsReport } from '@/lib/reports/weekly-ops-actions'
import type { WeeklyOpsReport } from '@/lib/reports/weekly-ops'
import { WeekSelector } from '@/components/reports/weekly-ops/week-selector'
import { MetricComparisonCard } from '@/components/reports/weekly-ops/metric-comparison-card'
import { WeeklyEventList } from '@/components/reports/weekly-ops/weekly-event-list'
import { WeeklyExpenseBreakdown } from '@/components/reports/weekly-ops/weekly-expense-breakdown'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

export function WeeklyOpsView({ initialWeekStart }: { initialWeekStart: string }) {
  const [weekStart, setWeekStart] = useState(initialWeekStart)
  const [report, setReport] = useState<WeeklyOpsReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const loadReport = useCallback(
    (ws: string) => {
      startTransition(async () => {
        setError(null)
        try {
          const result = await getWeeklyOpsReport(ws)
          if (result.success) {
            setReport(result.report)
          } else {
            setError(result.error)
            setReport(null)
          }
        } catch (err) {
          setError('Failed to load weekly report')
          setReport(null)
        }
      })
    },
    []
  )

  useEffect(() => {
    loadReport(weekStart)
  }, [weekStart, loadReport])

  const handleWeekChange = (newWeekStart: string) => {
    setWeekStart(newWeekStart)
  }

  if (isPending && !report) {
    return (
      <div className="space-y-6">
        <WeekSelector
          weekStart={weekStart}
          weekEnd={addDays(weekStart, 6)}
          onWeekChange={handleWeekChange}
        />
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <WeekSelector
          weekStart={weekStart}
          weekEnd={addDays(weekStart, 6)}
          onWeekChange={handleWeekChange}
        />
        <Card className="border-red-800/40 bg-red-950/20">
          <CardContent className="pt-6">
            <p className="text-sm text-red-300">{error}</p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => loadReport(weekStart)}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!report) return null

  return (
    <div className={`space-y-6 ${isPending ? 'opacity-60 pointer-events-none' : ''}`}>
      {/* Print-only header */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Weekly Ops Summary</h1>
        <p className="text-sm text-stone-500">
          {format(new Date(report.weekStart + 'T12:00:00'), 'MMM d')} &ndash;{' '}
          {format(new Date(report.weekEnd + 'T12:00:00'), 'MMM d, yyyy')}
        </p>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <WeekSelector
          weekStart={report.weekStart}
          weekEnd={report.weekEnd}
          onWeekChange={handleWeekChange}
        />
        <Button
          variant="secondary"
          size="sm"
          className="print:hidden"
          onClick={() => window.print()}
        >
          Print / Export
        </Button>
      </div>

      {/* Summary metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricComparisonCard
          label="Events Completed"
          delta={{
            current: report.eventsCompletedCount,
            previous: report.revenueDelta.previous > 0 ? report.eventsCompletedCount : 0,
            deltaPercent: null,
            direction: report.eventsCompletedCount > 0 ? 'up' : 'flat',
          }}
          isCurrency={false}
        />
        <MetricComparisonCard label="Revenue" delta={report.revenueDelta} />
        <MetricComparisonCard label="Expenses" delta={report.expensesDelta} invertColors />
        <MetricComparisonCard label="Net Profit" delta={report.profitDelta} />
      </div>

      {/* Events list */}
      <WeeklyEventList events={report.eventsCompleted} />

      {/* Expense breakdown */}
      <WeeklyExpenseBreakdown
        categories={report.expensesByCategory}
        totalCents={report.totalExpensesCents}
      />

      {/* Reviews received */}
      {report.reviewsReceived.length > 0 && (
        <Card className="print:shadow-none print:border-stone-300">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base print:text-stone-900">
                Reviews Received ({report.reviewCount})
              </CardTitle>
              {report.averageRating !== null && (
                <span className="text-lg font-bold text-amber-400 print:text-amber-600">
                  {report.averageRating}/5 avg
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-stone-800 print:divide-stone-300">
              {report.reviewsReceived.map((review, i) => (
                <div key={i} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm text-stone-200 print:text-stone-800">
                      {review.clientName}
                    </p>
                    {review.eventOccasion && (
                      <p className="text-xs text-stone-500">{review.eventOccasion}</p>
                    )}
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className={
                          n <= review.rating
                            ? 'text-amber-400 print:text-amber-500'
                            : 'text-stone-600 print:text-stone-300'
                        }
                      >
                        *
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming next week preview */}
      {report.upcomingNextWeek.length > 0 && (
        <Card className="print:shadow-none print:border-stone-300">
          <CardHeader>
            <CardTitle className="text-base print:text-stone-900">
              Next Week Preview ({report.upcomingNextWeek.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-stone-800 print:divide-stone-300">
              {report.upcomingNextWeek.map((event) => (
                <div key={event.eventId} className="py-2 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-stone-200 print:text-stone-800">
                      {event.occasion || 'Event'}
                    </p>
                    <span className="text-xs text-stone-500">
                      {format(new Date(event.eventDate + 'T12:00:00'), 'EEE, MMM d')}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {event.clientName}
                    {event.guestCount != null && ` \u00b7 ${event.guestCount} guests`}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Print-only footer */}
      <div className="hidden print:block text-center mt-8 pt-4 border-t border-stone-300">
        <p className="text-xs text-stone-500">
          Generated on {format(new Date(report.generatedAt), 'MMMM d, yyyy')} at{' '}
          {format(new Date(report.generatedAt), 'h:mm a')}
        </p>
      </div>
    </div>
  )
}

// Helper
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

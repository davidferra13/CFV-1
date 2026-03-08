'use client'

// Revenue Per Hour Analysis - Full Page Client Component
// Renders date range selector, summary cards, charts, per-event table, and insight callout.

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { HoursBreakdownPie, MonthlyTrendChart } from './revenue-per-hour-charts'
import type { RevenuePerHourResult } from '@/lib/finance/revenue-per-hour-actions'

type DateRange = '30d' | '90d' | 'year' | 'all'

type Props = {
  initialData: RevenuePerHourResult
  initialRange: DateRange
  fetchAction: (range: DateRange) => Promise<RevenuePerHourResult>
}

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
]

type SortField = 'date' | 'revenue' | 'hours' | 'rate'
type SortDir = 'asc' | 'desc'

export function RevenuePerHourAnalysis({ initialData, initialRange, fetchAction }: Props) {
  const [data, setData] = useState(initialData)
  const [range, setRange] = useState<DateRange>(initialRange)
  const [isPending, startTransition] = useTransition()
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleRangeChange(newRange: DateRange) {
    if (newRange === range) return
    setRange(newRange)
    const previous = data
    startTransition(async () => {
      try {
        const result = await fetchAction(newRange)
        setData(result)
      } catch {
        setData(previous)
      }
    })
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const sortedEvents = [...data.byEvent].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    switch (sortField) {
      case 'date': return dir * a.date.localeCompare(b.date)
      case 'revenue': return dir * (a.revenueCents - b.revenueCents)
      case 'hours': return dir * (a.totalHours - b.totalHours)
      case 'rate': return dir * (a.perHourCents - b.perHourCents)
      default: return 0
    }
  })

  // Insight: what if you reduced driving by 30 min per event?
  const avgDrivingPerEvent = data.eventsWithTimeData > 0
    ? data.breakdown.driving / data.eventsWithTimeData
    : 0
  const potentialSavedHours = data.eventsWithTimeData * 0.5 // 30 min per event
  const newTotalHours = Math.max(0.1, data.totalHours - potentialSavedHours)
  const potentialRateCents = newTotalHours > 0 && data.totalRevenueCents > 0
    ? Math.round(data.totalRevenueCents / newTotalHours)
    : 0

  const sortArrow = (field: SortField) =>
    sortField === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex gap-2">
        {DATE_RANGES.map(r => (
          <button
            key={r.value}
            onClick={() => handleRangeChange(r.value)}
            disabled={isPending}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              range === r.value
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
            } ${isPending ? 'opacity-50' : ''}`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {data.eventsWithTimeData === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-lg font-medium text-stone-600">No time-tracked events found</p>
          <p className="text-sm text-stone-400 mt-2">
            Start using the timer on the Ops tab during events to see your effective hourly rate.
          </p>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-stone-900">{formatCurrency(data.totalRevenueCents)}</p>
              <p className="text-xs text-stone-400 mt-1">{data.eventsWithTimeData} events</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Total Hours</p>
              <p className="text-2xl font-bold text-stone-900">{data.totalHours.toFixed(1)}h</p>
              <p className="text-xs text-stone-400 mt-1">Across all activities</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Effective Rate</p>
              <p className="text-2xl font-bold text-emerald-700">{formatCurrency(data.revenuePerHourCents)}/hr</p>
              <p className="text-xs text-stone-400 mt-1">All time included</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Cooking-Only Rate</p>
              <p className="text-2xl font-bold text-blue-700">{formatCurrency(data.cookingOnlyPerHourCents)}/hr</p>
              <p className="text-xs text-stone-400 mt-1">{data.cookingOnlyHours.toFixed(1)}h cooking</p>
            </Card>
          </div>

          {/* Events without time data warning */}
          {data.eventsWithoutTimeData > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
              {data.eventsWithoutTimeData} completed event{data.eventsWithoutTimeData > 1 ? 's' : ''} had
              no time tracking data and {data.eventsWithoutTimeData > 1 ? 'were' : 'was'} excluded from this analysis.
            </div>
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-stone-700 mb-3">Where Your Time Goes</h3>
              <HoursBreakdownPie breakdown={data.breakdown} />
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-stone-700 mb-3">Monthly Trend</h3>
              <MonthlyTrendChart trend={data.trend} />
            </Card>
          </div>

          {/* Insight Callout */}
          {avgDrivingPerEvent > 0 && data.eventsWithTimeData >= 2 && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <p className="text-sm font-medium text-blue-900">Time Insight</p>
              <p className="text-sm text-blue-800 mt-1">
                You spend {data.nonCookingPercent}% of your time on non-cooking activities.
                {avgDrivingPerEvent > 0.5 && potentialRateCents > data.revenuePerHourCents && (
                  <> If you could reduce travel by 30 minutes per event, your effective rate would
                  increase to {formatCurrency(potentialRateCents)}/hr.</>
                )}
              </p>
            </Card>
          )}

          {/* Per-Event Table */}
          <Card className="overflow-hidden">
            <div className="px-5 py-3 border-b border-stone-100">
              <h3 className="text-sm font-semibold text-stone-700">Per-Event Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 text-left">
                    <th className="px-4 py-2 font-medium text-stone-500">Event</th>
                    <th
                      className="px-4 py-2 font-medium text-stone-500 cursor-pointer hover:text-stone-700"
                      onClick={() => toggleSort('date')}
                    >
                      Date{sortArrow('date')}
                    </th>
                    <th
                      className="px-4 py-2 font-medium text-stone-500 text-right cursor-pointer hover:text-stone-700"
                      onClick={() => toggleSort('revenue')}
                    >
                      Revenue{sortArrow('revenue')}
                    </th>
                    <th
                      className="px-4 py-2 font-medium text-stone-500 text-right cursor-pointer hover:text-stone-700"
                      onClick={() => toggleSort('hours')}
                    >
                      Hours{sortArrow('hours')}
                    </th>
                    <th
                      className="px-4 py-2 font-medium text-stone-500 text-right cursor-pointer hover:text-stone-700"
                      onClick={() => toggleSort('rate')}
                    >
                      Rate{sortArrow('rate')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEvents.map(event => (
                    <tr key={event.eventId} className="border-t border-stone-100 hover:bg-stone-50">
                      <td className="px-4 py-2">
                        <Link
                          href={`/events/${event.eventId}`}
                          className="text-brand-600 hover:underline"
                        >
                          {event.eventName}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-stone-600">
                        {new Date(event.date).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-stone-900">
                        {formatCurrency(event.revenueCents)}
                      </td>
                      <td className="px-4 py-2 text-right text-stone-600">
                        {event.totalHours.toFixed(1)}h
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className={`font-medium ${
                          event.perHourCents >= data.revenuePerHourCents
                            ? 'text-emerald-700'
                            : 'text-red-600'
                        }`}>
                          {formatCurrency(event.perHourCents)}/hr
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

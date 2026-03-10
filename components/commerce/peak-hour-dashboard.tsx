'use client'

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type {
  HourlyBreakdownRow,
  PeakHourInfo,
  WeeklyHeatmapCell,
  StaffingVsVolumeRow,
  StaffingRecommendation,
  WeeklyHourlyAverage,
} from '@/lib/commerce/peak-hour-actions'
import {
  getHourlyBreakdown,
  getPeakHours,
  getWeeklyHeatmap,
  getStaffingVsVolume,
  getWeeklyHourlyAverage,
} from '@/lib/commerce/peak-hour-actions'

// ============================================
// TYPES
// ============================================

interface PeakHourDashboardProps {
  initialDate: string
  initialHourly: HourlyBreakdownRow[]
  initialPeakHours: PeakHourInfo[]
  initialHeatmap: WeeklyHeatmapCell[]
  initialStaffing: { rows: StaffingVsVolumeRow[]; recommendations: StaffingRecommendation[] }
  initialWeeklyAvg: WeeklyHourlyAverage[]
}

// ============================================
// HELPERS
// ============================================

function formatHour(h: number): string {
  if (h === 0) return '12am'
  if (h < 12) return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

// ============================================
// COMPONENT
// ============================================

export function PeakHourDashboard({
  initialDate,
  initialHourly,
  initialPeakHours,
  initialHeatmap,
  initialStaffing,
  initialWeeklyAvg,
}: PeakHourDashboardProps) {
  const [date, setDate] = useState(initialDate)
  const [hourly, setHourly] = useState(initialHourly)
  const [peakHours, setPeakHours] = useState(initialPeakHours)
  const [heatmap, setHeatmap] = useState(initialHeatmap)
  const [staffing, setStaffing] = useState(initialStaffing)
  const [weeklyAvg, setWeeklyAvg] = useState(initialWeeklyAvg)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDateChange() {
    const previousHourly = hourly
    const previousStaffing = staffing

    startTransition(async () => {
      try {
        const [newHourly, newPeakHours, newHeatmap, newStaffingData, newWeeklyAvg] =
          await Promise.all([
            getHourlyBreakdown(date),
            getPeakHours(30),
            getWeeklyHeatmap(),
            getStaffingVsVolume(date),
            getWeeklyHourlyAverage(),
          ])
        setHourly(newHourly)
        setPeakHours(newPeakHours)
        setHeatmap(newHeatmap)
        setStaffing(newStaffingData)
        setWeeklyAvg(newWeeklyAvg)
        setError(null)
      } catch (err) {
        setHourly(previousHourly)
        setStaffing(previousStaffing)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      }
    })
  }

  // Compute stats for the bar chart
  const activeHourly = hourly.filter((h) => h.salesCount > 0)
  const maxSales = Math.max(...hourly.map((h) => h.salesCount), 1)
  const avgSales =
    activeHourly.length > 0
      ? activeHourly.reduce((s, h) => s + h.salesCount, 0) / activeHourly.length
      : 0

  // Peak hours from the 30-day data
  const peakHourNumbers = new Set(peakHours.filter((p) => p.isPeak).map((p) => p.hour))

  return (
    <div className="space-y-6">
      {/* Date picker */}
      <div className="flex items-end gap-3">
        <div>
          <label className="text-xs text-stone-500 block mb-1">Date</label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
        </div>
        <Button variant="primary" onClick={handleDateChange} disabled={isPending}>
          {isPending ? 'Loading...' : 'Apply'}
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Hourly bar chart */}
      <Card>
        <CardHeader>
          <CardTitle>Order Volume by Hour ({date})</CardTitle>
        </CardHeader>
        <CardContent>
          {activeHourly.length === 0 ? (
            <p className="text-stone-500 text-sm text-center py-8">No sales data for this date</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-end gap-1 h-48 relative">
                {/* Average line */}
                {avgSales > 0 && (
                  <div
                    className="absolute left-0 right-0 border-t border-dashed border-stone-600 z-10"
                    style={{ bottom: `${(avgSales / maxSales) * 100}%` }}
                  >
                    <span className="absolute -top-4 right-0 text-[10px] text-stone-500">
                      avg {Math.round(avgSales)}
                    </span>
                  </div>
                )}

                {hourly.map((h) => {
                  const heightPct = maxSales > 0 ? (h.salesCount / maxSales) * 100 : 0
                  const isPeak = peakHourNumbers.has(h.hour)

                  return (
                    <div
                      key={h.hour}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative"
                    >
                      {/* Tooltip */}
                      <div className="hidden group-hover:block absolute -top-10 bg-stone-800 border border-stone-700 rounded px-2 py-1 text-xs text-stone-200 z-20 whitespace-nowrap">
                        {formatHour(h.hour)}: {h.salesCount} orders, {formatCents(h.revenueCents)},{' '}
                        {h.covers} covers
                      </div>
                      {/* Bar */}
                      <div
                        className={`w-full rounded-t transition-all ${
                          isPeak ? 'bg-brand-500' : 'bg-stone-600'
                        } hover:opacity-80`}
                        style={{ height: `${Math.max(heightPct, h.salesCount > 0 ? 2 : 0)}%` }}
                      />
                      {/* Label */}
                      <span className="text-[9px] text-stone-500 mt-1">{formatHour(h.hour)}</span>
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-xs text-stone-500">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-brand-500 inline-block" /> Peak hours (1.5x+
                  avg)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-stone-600 inline-block" /> Normal
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hourly detail table */}
      <Card>
        <CardHeader>
          <CardTitle>Hourly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {activeHourly.length === 0 ? (
            <p className="text-stone-500 text-sm">No data for this date</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-stone-500 border-b border-stone-800">
                    <th className="text-left py-2 pr-4">Hour</th>
                    <th className="text-right py-2 pr-4">Orders</th>
                    <th className="text-right py-2 pr-4">Revenue</th>
                    <th className="text-right py-2 pr-4">Avg Ticket</th>
                    <th className="text-right py-2">Covers</th>
                  </tr>
                </thead>
                <tbody>
                  {hourly
                    .filter((h) => h.salesCount > 0)
                    .map((h) => (
                      <tr key={h.hour} className="border-b border-stone-800/50 last:border-0">
                        <td className="py-2 pr-4 text-stone-200">
                          {formatHour(h.hour)}
                          {peakHourNumbers.has(h.hour) && (
                            <Badge variant="warning" className="ml-2 text-[10px]">
                              Peak
                            </Badge>
                          )}
                        </td>
                        <td className="text-right py-2 pr-4 text-stone-200">{h.salesCount}</td>
                        <td className="text-right py-2 pr-4 text-stone-200">
                          {formatCents(h.revenueCents)}
                        </td>
                        <td className="text-right py-2 pr-4 text-stone-200">
                          {formatCents(h.avgTicketCents)}
                        </td>
                        <td className="text-right py-2 text-stone-200">{h.covers}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Pattern (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <WeeklyHeatmapGrid data={heatmap} />
        </CardContent>
      </Card>

      {/* Staffing vs Volume */}
      <Card>
        <CardHeader>
          <CardTitle>Staffing vs. Order Volume ({date})</CardTitle>
        </CardHeader>
        <CardContent>
          <StaffingSection rows={staffing.rows} recommendations={staffing.recommendations} />
        </CardContent>
      </Card>

      {/* Weekly hourly averages */}
      <Card>
        <CardHeader>
          <CardTitle>7-Day Hourly Averages</CardTitle>
        </CardHeader>
        <CardContent>
          <WeeklyAveragesTable data={weeklyAvg} />
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================
// SUB-COMPONENTS
// ============================================

function WeeklyHeatmapGrid({ data }: { data: WeeklyHeatmapCell[] }) {
  if (data.length === 0) {
    return <p className="text-stone-500 text-sm">No heatmap data</p>
  }

  const maxCount = Math.max(...data.map((d) => d.salesCount), 1)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Only show hours 6am-11pm for readability
  const visibleHours = Array.from({ length: 18 }, (_, i) => i + 6)

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Header row */}
        <div className="flex gap-0.5 mb-1">
          <div className="w-10 shrink-0" />
          {visibleHours.map((h) => (
            <div key={h} className="flex-1 text-center text-[9px] text-stone-500">
              {formatHour(h)}
            </div>
          ))}
        </div>

        {/* Day rows */}
        {days.map((dayLabel, dayIdx) => (
          <div key={dayIdx} className="flex gap-0.5 mb-0.5">
            <div className="w-10 shrink-0 text-xs text-stone-400 flex items-center">{dayLabel}</div>
            {visibleHours.map((h) => {
              const cell = data.find((d) => d.dayOfWeek === dayIdx && d.hour === h)
              const count = cell?.salesCount ?? 0
              const intensity = maxCount > 0 ? count / maxCount : 0

              return (
                <div
                  key={h}
                  className={`flex-1 h-6 rounded-sm transition-colors ${
                    count === 0 ? 'bg-stone-900' : cell?.isPeak ? 'bg-brand-500' : 'bg-stone-600'
                  }`}
                  style={{
                    opacity: count === 0 ? 0.3 : Math.max(0.3, intensity),
                  }}
                  title={`${dayLabel} ${formatHour(h)}: ${count} orders`}
                />
              )
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 text-xs text-stone-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-brand-500 inline-block" /> Peak
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-stone-600 inline-block" /> Active
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-stone-900 opacity-30 inline-block" /> No orders
          </span>
        </div>
      </div>
    </div>
  )
}

function StaffingSection({
  rows,
  recommendations,
}: {
  rows: StaffingVsVolumeRow[]
  recommendations: StaffingRecommendation[]
}) {
  const activeRows = rows.filter((r) => r.orderCount > 0 || r.staffCount > 0)

  if (activeRows.length === 0) {
    return <p className="text-stone-500 text-sm">No staffing or order data for this date</p>
  }

  return (
    <div className="space-y-4">
      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-2">
          {recommendations.map((rec, idx) => (
            <div
              key={idx}
              className="p-3 bg-amber-900/20 border border-amber-700/40 rounded-lg text-amber-200 text-sm"
            >
              {rec.recommendation}
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-stone-500 border-b border-stone-800">
              <th className="text-left py-2 pr-4">Hour</th>
              <th className="text-right py-2 pr-4">Orders</th>
              <th className="text-right py-2 pr-4">Staff</th>
              <th className="text-right py-2">Orders/Staff</th>
            </tr>
          </thead>
          <tbody>
            {activeRows.map((r) => (
              <tr key={r.hour} className="border-b border-stone-800/50 last:border-0">
                <td className="py-2 pr-4 text-stone-200">{formatHour(r.hour)}</td>
                <td className="text-right py-2 pr-4 text-stone-200">{r.orderCount}</td>
                <td className="text-right py-2 pr-4 text-stone-200">{r.staffCount}</td>
                <td className="text-right py-2 text-stone-200">
                  <span className={r.ordersPerStaff > 15 ? 'text-amber-400 font-medium' : ''}>
                    {r.ordersPerStaff}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function WeeklyAveragesTable({ data }: { data: WeeklyHourlyAverage[] }) {
  const active = data.filter((d) => d.avgSalesCount > 0)

  if (active.length === 0) {
    return <p className="text-stone-500 text-sm">No data from the last 7 days</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-stone-500 border-b border-stone-800">
            <th className="text-left py-2 pr-4">Hour</th>
            <th className="text-right py-2 pr-4">Avg Orders</th>
            <th className="text-right py-2 pr-4">Avg Revenue</th>
            <th className="text-right py-2">Days Active</th>
          </tr>
        </thead>
        <tbody>
          {active.map((d) => (
            <tr key={d.hour} className="border-b border-stone-800/50 last:border-0">
              <td className="py-2 pr-4 text-stone-200">{formatHour(d.hour)}</td>
              <td className="text-right py-2 pr-4 text-stone-200">{d.avgSalesCount}</td>
              <td className="text-right py-2 pr-4 text-stone-200">
                {formatCents(d.avgRevenueCents)}
              </td>
              <td className="text-right py-2 text-stone-200">{d.daysWithData}/7</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

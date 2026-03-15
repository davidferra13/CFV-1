// Channel Analytics Dashboard
// Full analytics view for booking source/channel performance
// CSS-only charts (no Recharts dependency)

'use client'

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { getChannelAnalytics } from '@/lib/analytics/channel-actions'
import type { ChannelAnalyticsData } from '@/lib/analytics/channel-actions'
import { getSourceColor, getSourceLabel } from '@/lib/constants/booking-sources'

// ============================================
// HELPERS
// ============================================

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

type DateRangePreset = 'this_month' | 'last_3_months' | 'last_year' | 'all_time'

const DATE_RANGE_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'last_year', label: 'Last Year' },
  { value: 'all_time', label: 'All Time' },
]

// ============================================
// SORTABLE TABLE
// ============================================

type SortKey =
  | 'sourceLabel'
  | 'inquiryCount'
  | 'bookedCount'
  | 'conversionRate'
  | 'totalRevenueCents'
  | 'avgRevenueCents'

function SortableHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
}: {
  label: string
  sortKey: SortKey
  currentSort: SortKey
  currentDir: 'asc' | 'desc'
  onSort: (key: SortKey) => void
}) {
  const isActive = currentSort === sortKey
  return (
    <th
      className="px-3 py-2 text-left text-xs font-medium text-stone-500 uppercase tracking-wider cursor-pointer hover:text-stone-700 select-none"
      onClick={() => onSort(sortKey)}
    >
      {label}
      {isActive && <span className="ml-1">{currentDir === 'asc' ? '\u2191' : '\u2193'}</span>}
    </th>
  )
}

// ============================================
// COMPONENT
// ============================================

export function ChannelDashboard({ initialData }: { initialData: ChannelAnalyticsData }) {
  const [data, setData] = useState<ChannelAnalyticsData>(initialData)
  const [dateRange, setDateRange] = useState<DateRangePreset>('all_time')
  const [isPending, startTransition] = useTransition()
  const [sortKey, setSortKey] = useState<SortKey>('totalRevenueCents')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function handleDateRangeChange(preset: DateRangePreset) {
    setDateRange(preset)
    const previous = data
    startTransition(async () => {
      try {
        const newData = await getChannelAnalytics(preset)
        setData(newData)
      } catch (err) {
        setData(previous)
        console.error('[ChannelDashboard] Failed to load data:', err)
      }
    })
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sortedSources = [...data.bySource].sort((a, b) => {
    const aVal = a[sortKey]
    const bVal = b[sortKey]
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }
    const numA = aVal as number
    const numB = bVal as number
    return sortDir === 'asc' ? numA - numB : numB - numA
  })

  const maxInquiries = Math.max(...data.bySource.map((s) => s.inquiryCount), 1)
  const maxRevenue = Math.max(...data.bySource.map((s) => s.totalRevenueCents), 1)

  // Best performing source
  const bestSource = data.bySource.length > 0 ? data.bySource[0] : null

  // Collect all unique sources across months for stacked bars
  const allMonthSources = new Set<string>()
  for (const entry of data.sourceOverTime) {
    for (const src of Object.keys(entry.sources)) {
      allMonthSources.add(src)
    }
  }
  const monthSourceList = Array.from(allMonthSources)

  return (
    <div className={`space-y-6 ${isPending ? 'opacity-60 pointer-events-none' : ''}`}>
      {/* Date range picker */}
      <div className="flex items-center gap-2">
        {DATE_RANGE_OPTIONS.map((opt) => (
          <button
            type="button"
            key={opt.value}
            onClick={() => handleDateRangeChange(opt.value)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              dateRange === opt.value
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-stone-500">Total Inquiries</p>
            <p className="text-3xl font-bold text-stone-900">{data.totalInquiries}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-stone-500">Total Booked</p>
            <p className="text-3xl font-bold text-stone-900">{data.totalBooked}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-stone-500">Conversion Rate</p>
            <p className="text-3xl font-bold text-stone-900">{data.overallConversionRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-stone-500">Active Sources</p>
            <p className="text-3xl font-bold text-stone-900">{data.bySource.length}</p>
            {bestSource && (
              <p className="text-xs text-stone-400 mt-1">Top: {bestSource.sourceLabel}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Source breakdown - horizontal bar chart */}
      <Card>
        <CardHeader>
          <CardTitle>Inquiries by Source</CardTitle>
        </CardHeader>
        <CardContent>
          {data.bySource.length === 0 ? (
            <p className="text-sm text-stone-400 py-8 text-center">No inquiry data yet</p>
          ) : (
            <div className="space-y-3">
              {data.bySource.map((s) => (
                <div key={s.source} className="flex items-center gap-3">
                  <span className="text-sm text-stone-600 w-28 shrink-0 truncate">
                    {s.sourceLabel}
                  </span>
                  <div className="flex-1 h-6 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(s.inquiryCount / maxInquiries) * 100}%`,
                        backgroundColor: getSourceColor(s.source),
                        minWidth: s.inquiryCount > 0 ? '8px' : '0',
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-stone-700 w-8 text-right">
                    {s.inquiryCount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversion funnel per source */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion by Source</CardTitle>
        </CardHeader>
        <CardContent>
          {data.bySource.length === 0 ? (
            <p className="text-sm text-stone-400 py-8 text-center">No data yet</p>
          ) : (
            <div className="space-y-4">
              {data.bySource.map((s) => (
                <div key={s.source} className="flex items-center gap-3">
                  <span className="text-sm text-stone-600 w-28 shrink-0 truncate">
                    {s.sourceLabel}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-4 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${s.conversionRate}%`,
                            backgroundColor: getSourceColor(s.source),
                            minWidth: s.conversionRate > 0 ? '4px' : '0',
                          }}
                        />
                      </div>
                      <span className="text-xs text-stone-500 w-12 text-right">
                        {s.conversionRate}%
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {s.bookedCount} of {s.inquiryCount} inquiries booked
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue per source table */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Source</CardTitle>
        </CardHeader>
        <CardContent>
          {data.bySource.length === 0 ? (
            <p className="text-sm text-stone-400 py-8 text-center">No revenue data yet</p>
          ) : (
            <div className="space-y-3">
              {data.bySource
                .filter((s) => s.totalRevenueCents > 0)
                .map((s) => (
                  <div key={s.source} className="flex items-center gap-3">
                    <span className="text-sm text-stone-600 w-28 shrink-0 truncate">
                      {s.sourceLabel}
                    </span>
                    <div className="flex-1 h-6 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${(s.totalRevenueCents / maxRevenue) * 100}%`,
                          backgroundColor: getSourceColor(s.source),
                          minWidth: '8px',
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-stone-700 w-20 text-right">
                      {formatCurrency(s.totalRevenueCents)}
                    </span>
                  </div>
                ))}
              {data.bySource.every((s) => s.totalRevenueCents === 0) && (
                <p className="text-sm text-stone-400 py-4 text-center">No revenue recorded yet</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly trend stacked bars */}
      {data.sourceOverTime.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Source Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-48 overflow-x-auto pb-6">
              {data.sourceOverTime.map((entry) => {
                const total = Object.values(entry.sources).reduce((s, v) => s + v, 0)
                const maxTotal = Math.max(
                  ...data.sourceOverTime.map((e) =>
                    Object.values(e.sources).reduce((s, v) => s + v, 0)
                  ),
                  1
                )
                const heightPct = (total / maxTotal) * 100

                return (
                  <div key={entry.month} className="flex flex-col items-center flex-1 min-w-[32px]">
                    <div
                      className="w-full flex flex-col-reverse rounded-t overflow-hidden"
                      style={{ height: `${heightPct}%`, minHeight: total > 0 ? '4px' : '0' }}
                    >
                      {monthSourceList.map((src) => {
                        const count = entry.sources[src] || 0
                        if (count === 0) return null
                        const segPct = total > 0 ? (count / total) * 100 : 0
                        return (
                          <div
                            key={src}
                            style={{
                              height: `${segPct}%`,
                              backgroundColor: getSourceColor(src),
                              minHeight: '2px',
                            }}
                            title={`${getSourceLabel(src)}: ${count}`}
                          />
                        )
                      })}
                    </div>
                    <span className="text-[10px] text-stone-400 mt-1 whitespace-nowrap rotate-[-45deg] origin-top-left translate-y-2">
                      {entry.month}
                    </span>
                  </div>
                )
              })}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-stone-100">
              {monthSourceList.map((src) => (
                <div key={src} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: getSourceColor(src) }}
                  />
                  <span className="text-xs text-stone-500">{getSourceLabel(src)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full comparison table */}
      <Card>
        <CardHeader>
          <CardTitle>Source Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedSources.length === 0 ? (
            <p className="text-sm text-stone-400 py-8 text-center">No data yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200">
                    <SortableHeader
                      label="Source"
                      sortKey="sourceLabel"
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Inquiries"
                      sortKey="inquiryCount"
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Bookings"
                      sortKey="bookedCount"
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Conv. %"
                      sortKey="conversionRate"
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Total Revenue"
                      sortKey="totalRevenueCents"
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Avg Revenue"
                      sortKey="avgRevenueCents"
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={handleSort}
                    />
                  </tr>
                </thead>
                <tbody>
                  {sortedSources.map((s, i) => {
                    const isBest = s.source === (bestSource?.source || '')
                    return (
                      <tr
                        key={s.source}
                        className={`border-b border-stone-100 ${
                          isBest ? 'bg-amber-50' : i % 2 === 0 ? 'bg-white' : 'bg-stone-50'
                        }`}
                      >
                        <td className="px-3 py-2 font-medium text-stone-700">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: getSourceColor(s.source) }}
                            />
                            {s.sourceLabel}
                            {isBest && (
                              <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-medium">
                                TOP
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-stone-600">{s.inquiryCount}</td>
                        <td className="px-3 py-2 text-stone-600">{s.bookedCount}</td>
                        <td className="px-3 py-2 text-stone-600">{s.conversionRate}%</td>
                        <td className="px-3 py-2 text-stone-700 font-medium">
                          {formatCurrency(s.totalRevenueCents)}
                        </td>
                        <td className="px-3 py-2 text-stone-600">
                          {formatCurrency(s.avgRevenueCents)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

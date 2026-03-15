// Channel Comparison Table
// Side-by-side metrics for all booking sources
// Sortable by any column, highlights best-performing source

'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import type { ChannelSourceStats } from '@/lib/analytics/channel-actions'
import { getSourceColor } from '@/lib/constants/booking-sources'

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

type SortKey =
  | 'sourceLabel'
  | 'inquiryCount'
  | 'bookedCount'
  | 'conversionRate'
  | 'totalRevenueCents'
  | 'avgRevenueCents'

const COLUMNS: { key: SortKey; label: string; align: 'left' | 'right' }[] = [
  { key: 'sourceLabel', label: 'Source', align: 'left' },
  { key: 'inquiryCount', label: 'Inquiries', align: 'right' },
  { key: 'bookedCount', label: 'Bookings', align: 'right' },
  { key: 'conversionRate', label: 'Conversion %', align: 'right' },
  { key: 'totalRevenueCents', label: 'Total Revenue', align: 'right' },
  { key: 'avgRevenueCents', label: 'Avg Revenue', align: 'right' },
]

// ============================================
// COMPONENT
// ============================================

export function ChannelComparison({ sources }: { sources: ChannelSourceStats[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('totalRevenueCents')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  if (sources.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Channel Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-400 py-8 text-center">No source data available</p>
        </CardContent>
      </Card>
    )
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...sources].sort((a, b) => {
    const aVal = a[sortKey]
    const bVal = b[sortKey]
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }
    return sortDir === 'asc'
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number)
  })

  // Best source by revenue
  const bestSourceKey = [...sources].sort((a, b) => b.totalRevenueCents - a.totalRevenueCents)[0]
    ?.source

  function formatCell(key: SortKey, row: ChannelSourceStats): string {
    switch (key) {
      case 'sourceLabel':
        return row.sourceLabel
      case 'inquiryCount':
        return row.inquiryCount.toString()
      case 'bookedCount':
        return row.bookedCount.toString()
      case 'conversionRate':
        return `${row.conversionRate}%`
      case 'totalRevenueCents':
        return formatCurrency(row.totalRevenueCents)
      case 'avgRevenueCents':
        return formatCurrency(row.avgRevenueCents)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Channel Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200">
                {COLUMNS.map((col) => {
                  const isActive = sortKey === col.key
                  return (
                    <th
                      key={col.key}
                      className={`px-3 py-2 text-xs font-medium text-stone-500 uppercase tracking-wider cursor-pointer hover:text-stone-700 select-none ${
                        col.align === 'right' ? 'text-right' : 'text-left'
                      }`}
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                      {isActive && (
                        <span className="ml-1">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => {
                const isBest = row.source === bestSourceKey
                return (
                  <tr
                    key={row.source}
                    className={`border-b border-stone-100 ${
                      isBest ? 'bg-amber-50' : i % 2 === 0 ? 'bg-white' : 'bg-stone-50'
                    }`}
                  >
                    {COLUMNS.map((col) => (
                      <td
                        key={col.key}
                        className={`px-3 py-2.5 ${
                          col.align === 'right' ? 'text-right' : 'text-left'
                        } ${col.key === 'totalRevenueCents' ? 'font-medium text-stone-700' : 'text-stone-600'}`}
                      >
                        {col.key === 'sourceLabel' ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: getSourceColor(row.source) }}
                            />
                            <span className="font-medium text-stone-700">{row.sourceLabel}</span>
                            {isBest && (
                              <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-medium">
                                TOP
                              </span>
                            )}
                          </div>
                        ) : (
                          formatCell(col.key, row)
                        )}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

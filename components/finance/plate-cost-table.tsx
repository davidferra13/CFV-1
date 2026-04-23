'use client'

import { Fragment, useState, useMemo } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { getMarginRating } from '@/lib/finance/plate-cost-calculator'
import type { EventPlateCostRow, PlateCostSummary } from '@/lib/finance/plate-cost-actions'
import { CostingHelpPopover } from '@/components/costing/costing-help-popover'

type SortField = 'date' | 'margin' | 'cost' | 'revenue' | 'guests'
type SortDir = 'asc' | 'desc'

interface PlateCostTableProps {
  summary: PlateCostSummary
}

export function PlateCostTable({ summary }: PlateCostTableProps) {
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null)

  const sorted = useMemo(() => {
    const rows = [...summary.events]
    rows.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'date':
          cmp = (a.eventDate ?? '').localeCompare(b.eventDate ?? '')
          break
        case 'margin':
          cmp = a.marginPercent - b.marginPercent
          break
        case 'cost':
          cmp = a.costPerPlateCents - b.costPerPlateCents
          break
        case 'revenue':
          cmp = a.revenuePerPlateCents - b.revenuePerPlateCents
          break
        case 'guests':
          cmp = a.guestCount - b.guestCount
          break
      }
      return sortDir === 'desc' ? -cmp : cmp
    })
    return rows
  }, [summary.events, sortField, sortDir])

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  function sortIndicator(field: SortField) {
    if (sortField !== field) return ''
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  if (summary.totalEvents === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-stone-400 text-sm">
          No events with guest counts found. Add guest counts to your events to see plate cost
          analysis.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">
            {formatCurrency(summary.avgCostPerPlateCents)}
          </p>
          <p className="text-xs text-stone-500 mt-1">Avg Cost / Plate</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">
            {formatCurrency(summary.avgRevenuePerPlateCents)}
          </p>
          <p className="text-xs text-stone-500 mt-1">Avg Revenue / Plate</p>
        </Card>
        <Card className="p-4">
          <p
            className={`text-2xl font-bold ${
              summary.avgMarginPercent >= 35
                ? 'text-emerald-400'
                : summary.avgMarginPercent >= 20
                  ? 'text-amber-400'
                  : 'text-red-400'
            }`}
          >
            {summary.avgMarginPercent.toFixed(1)}%
          </p>
          <div className="text-xs text-stone-500 mt-1 flex items-center gap-1">
            Avg Margin
            <CostingHelpPopover topic="contribution_margin" />
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{summary.totalEvents}</p>
          <p className="text-xs text-stone-500 mt-1">Events Analyzed</p>
        </Card>
      </div>

      {/* Best / Worst */}
      {(summary.bestEvent || summary.worstEvent) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summary.bestEvent && (
            <Card className="p-4 border-emerald-800/50">
              <p className="text-xs text-emerald-500 font-semibold mb-1">Best Margin</p>
              <p className="text-sm font-medium text-stone-200">{summary.bestEvent.eventName}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-lg font-bold text-emerald-400">
                  {summary.bestEvent.marginPercent.toFixed(1)}%
                </span>
                <span className="text-xs text-stone-500">
                  {formatCurrency(summary.bestEvent.costPerPlateCents)} cost/plate
                </span>
              </div>
            </Card>
          )}
          {summary.worstEvent && (
            <Card className="p-4 border-red-800/50">
              <p className="text-xs text-red-500 font-semibold mb-1">Lowest Margin</p>
              <p className="text-sm font-medium text-stone-200">{summary.worstEvent.eventName}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-lg font-bold text-red-400">
                  {summary.worstEvent.marginPercent.toFixed(1)}%
                </span>
                <span className="text-xs text-stone-500">
                  {formatCurrency(summary.worstEvent.costPerPlateCents)} cost/plate
                </span>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Event Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-700 text-stone-400 text-left">
                <th
                  className="px-4 py-3 cursor-pointer hover:text-stone-200 select-none"
                  onClick={() => handleSort('date')}
                >
                  Event{sortIndicator('date')}
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-stone-200 select-none text-right"
                  onClick={() => handleSort('guests')}
                >
                  Guests{sortIndicator('guests')}
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-stone-200 select-none text-right"
                  onClick={() => handleSort('cost')}
                >
                  Cost/Plate{sortIndicator('cost')}
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-stone-200 select-none text-right"
                  onClick={() => handleSort('revenue')}
                >
                  Revenue/Plate{sortIndicator('revenue')}
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-stone-200 select-none text-right"
                  onClick={() => handleSort('margin')}
                >
                  Margin{sortIndicator('margin')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => {
                const rating = getMarginRating(row.marginPercent)
                const isExpanded = expandedEvent === row.eventId
                return (
                  <Fragment key={row.eventId}>
                    <tr
                      className="border-b border-stone-800 hover:bg-stone-800/50 cursor-pointer"
                      onClick={() => setExpandedEvent(isExpanded ? null : row.eventId)}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <Link
                            href={`/events/${row.eventId}`}
                            className="text-stone-200 font-medium hover:text-brand-500"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {row.eventName}
                          </Link>
                          <div className="text-xs text-stone-500 mt-0.5">
                            {row.eventDate
                              ? new Date(row.eventDate + 'T00:00:00').toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : 'No date'}
                            {row.clientName ? ` · ${row.clientName}` : ''}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-stone-300">{row.guestCount}</td>
                      <td className="px-4 py-3 text-right text-stone-300">
                        {formatCurrency(row.costPerPlateCents)}
                      </td>
                      <td className="px-4 py-3 text-right text-stone-300">
                        {formatCurrency(row.revenuePerPlateCents)}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${rating.color}`}>
                        {row.marginPercent.toFixed(1)}%
                      </td>
                    </tr>
                    {isExpanded && row.breakdown.length > 0 && (
                      <tr className="bg-stone-900/50">
                        <td colSpan={5} className="px-6 py-3">
                          <p className="text-xs font-semibold text-stone-400 mb-2">
                            Cost Breakdown
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {row.breakdown.map((b) => (
                              <div key={b.category} className="text-xs">
                                <p className="text-stone-500">{b.category}</p>
                                <p className="text-stone-200 font-medium">
                                  {formatCurrency(b.totalCents)}
                                  <span className="text-stone-500 ml-1">
                                    ({formatCurrency(b.perPlateCents)}/plate)
                                  </span>
                                </p>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

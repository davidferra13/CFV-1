'use client'

import { useState } from 'react'
import type { MenuItemPerformance } from '@/lib/menu-performance/actions'

type SortField =
  | 'item_name'
  | 'days_on_menu'
  | 'total_sold'
  | 'avg_daily_sold'
  | 'total_revenue_cents'
  | 'food_cost_pct'
  | 'profit_per_unit_cents'
  | 'total_waste_qty'

function formatDollars(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '-'
  return `$${(cents / 100).toFixed(2)}`
}

function formatPct(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return '-'
  return `${pct.toFixed(1)}%`
}

function costColor(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return 'text-stone-400'
  if (pct < 30) return 'text-emerald-400'
  if (pct <= 35) return 'text-yellow-400'
  return 'text-red-400'
}

export function PerformanceTable({ items }: { items: MenuItemPerformance[] }) {
  const [sortField, setSortField] = useState<SortField>('total_sold')
  const [sortAsc, setSortAsc] = useState(false)

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-stone-500 text-sm">
        No sales data yet. Start logging daily sales to see performance trends.
      </div>
    )
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  const sorted = [...items].sort((a, b) => {
    const aVal = a[sortField] ?? 0
    const bVal = b[sortField] ?? 0
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }
    return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
  })

  const arrow = (field: SortField) => {
    if (sortField !== field) return ''
    return sortAsc ? ' \u25B2' : ' \u25BC'
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-stone-700">
            <SortHeader
              field="item_name"
              label="Dish"
              current={sortField}
              arrow={arrow}
              onClick={handleSort}
            />
            <SortHeader
              field="days_on_menu"
              label="Days on Menu"
              current={sortField}
              arrow={arrow}
              onClick={handleSort}
            />
            <SortHeader
              field="total_sold"
              label="Total Sold"
              current={sortField}
              arrow={arrow}
              onClick={handleSort}
            />
            <SortHeader
              field="avg_daily_sold"
              label="Avg/Day"
              current={sortField}
              arrow={arrow}
              onClick={handleSort}
            />
            <SortHeader
              field="total_revenue_cents"
              label="Revenue"
              current={sortField}
              arrow={arrow}
              onClick={handleSort}
            />
            <SortHeader
              field="food_cost_pct"
              label="Food Cost %"
              current={sortField}
              arrow={arrow}
              onClick={handleSort}
            />
            <SortHeader
              field="profit_per_unit_cents"
              label="Profit/Unit"
              current={sortField}
              arrow={arrow}
              onClick={handleSort}
            />
            <SortHeader
              field="total_waste_qty"
              label="Waste"
              current={sortField}
              arrow={arrow}
              onClick={handleSort}
            />
          </tr>
        </thead>
        <tbody>
          {sorted.map((item) => (
            <tr key={item.menu_item_id} className="border-b border-stone-800 hover:bg-stone-800/50">
              <td className="py-2.5 px-3 text-sm text-stone-200 font-medium">{item.item_name}</td>
              <td className="py-2.5 px-3 text-sm text-stone-400">{item.days_on_menu}</td>
              <td className="py-2.5 px-3 text-sm text-stone-300">{item.total_sold}</td>
              <td className="py-2.5 px-3 text-sm text-stone-400">
                {item.avg_daily_sold?.toFixed(1) ?? '-'}
              </td>
              <td className="py-2.5 px-3 text-sm text-stone-300">
                {formatDollars(item.total_revenue_cents)}
              </td>
              <td className={`py-2.5 px-3 text-sm font-medium ${costColor(item.food_cost_pct)}`}>
                {formatPct(item.food_cost_pct)}
              </td>
              <td className="py-2.5 px-3 text-sm text-stone-300">
                {formatDollars(item.profit_per_unit_cents)}
              </td>
              <td className="py-2.5 px-3 text-sm text-stone-400">{item.total_waste_qty}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SortHeader({
  field,
  label,
  current,
  arrow,
  onClick,
}: {
  field: SortField
  label: string
  current: SortField
  arrow: (f: SortField) => string
  onClick: (f: SortField) => void
}) {
  return (
    <th
      onClick={() => onClick(field)}
      className={`text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors ${
        current === field ? 'text-amber-400' : 'text-stone-400 hover:text-stone-200'
      }`}
    >
      {label}
      {arrow(field)}
    </th>
  )
}

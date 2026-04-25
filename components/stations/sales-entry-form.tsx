'use client'

import { useState, useTransition } from 'react'
import { saveDailySales } from '@/lib/menu-performance/actions'
import type { MenuItemForSalesEntry } from '@/lib/menu-performance/actions'

function formatDollars(cents: number | null): string {
  if (cents === null || cents === undefined) return '-'
  return `$${(cents / 100).toFixed(2)}`
}

type SalesRow = {
  menu_item_id: string
  quantity_sold: number
  revenue_cents: number
  waste_qty: number
}

export function SalesEntryForm({
  serviceDayId,
  items,
}: {
  serviceDayId: string
  items: MenuItemForSalesEntry[]
}) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [rows, setRows] = useState<SalesRow[]>(() =>
    items.map((item) => ({
      menu_item_id: item.id,
      quantity_sold: item.existing_sale?.quantity_sold ?? 0,
      revenue_cents:
        item.existing_sale?.revenue_cents ??
        (item.price_cents ?? 0) * (item.existing_sale?.quantity_sold ?? 0),
      waste_qty: item.existing_sale?.waste_qty ?? 0,
    }))
  )

  function updateRow(index: number, field: keyof SalesRow, value: number) {
    setRows((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      // Auto-calc revenue when qty changes
      if (field === 'quantity_sold') {
        const item = items[index]
        if (item.price_cents) {
          updated[index].revenue_cents = value * item.price_cents
        }
      }
      return updated
    })
  }

  function handleSubmit() {
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await saveDailySales(serviceDayId, rows)
        if (result.success) {
          setMessage({ type: 'success', text: 'Sales saved successfully.' })
        } else {
          setMessage({ type: 'error', text: result.error || 'Failed to save sales.' })
        }
      } catch (err: any) {
        setMessage({ type: 'error', text: err.message || 'An unexpected error occurred.' })
      }
    })
  }

  // Group items by category
  const categories = new Map<string, number[]>()
  items.forEach((item, idx) => {
    const cat = item.category || 'Uncategorized'
    if (!categories.has(cat)) categories.set(cat, [])
    categories.get(cat)!.push(idx)
  })

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-stone-500 text-sm">
        No menu items found. Add menu items first to log sales.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700'
              : 'bg-red-900/50 text-red-300 border border-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-700">
              <th className="text-left py-2 px-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Item
              </th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Price
              </th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Qty Sold
              </th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Revenue
              </th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Waste Qty
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from(categories.entries()).map(([category, indices]) => (
              <CategoryGroup
                key={category}
                category={category}
                indices={indices}
                items={items}
                rows={rows}
                onUpdate={updateRow}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 rounded-lg font-medium text-sm transition-colors"
        >
          {isPending ? 'Saving...' : 'Save Sales'}
        </button>
      </div>
    </div>
  )
}

function CategoryGroup({
  category,
  indices,
  items,
  rows,
  onUpdate,
}: {
  category: string
  indices: number[]
  items: MenuItemForSalesEntry[]
  rows: SalesRow[]
  onUpdate: (index: number, field: keyof SalesRow, value: number) => void
}) {
  return (
    <>
      <tr>
        <td colSpan={5} className="pt-4 pb-1 px-3">
          <span className="text-xs font-semibold uppercase text-stone-500 tracking-wider">
            {category}
          </span>
        </td>
      </tr>
      {indices.map((idx) => {
        const item = items[idx]
        const row = rows[idx]
        return (
          <tr key={item.id} className="border-b border-stone-800 hover:bg-stone-800/50">
            <td className="py-2 px-3 text-sm text-stone-200">{item.name}</td>
            <td className="py-2 px-3 text-sm text-stone-400">{formatDollars(item.price_cents)}</td>
            <td className="py-2 px-3">
              <input
                type="number"
                min={0}
                value={row.quantity_sold}
                onChange={(e) => onUpdate(idx, 'quantity_sold', parseInt(e.target.value) || 0)}
                className="bg-stone-800 border border-stone-700 text-stone-100 rounded-lg px-3 py-2 w-20 text-sm"
              />
            </td>
            <td className="py-2 px-3">
              <input
                type="number"
                min={0}
                step={0.01}
                value={(row.revenue_cents / 100).toFixed(2)}
                onChange={(e) =>
                  onUpdate(
                    idx,
                    'revenue_cents',
                    Math.round((parseFloat(e.target.value) || 0) * 100)
                  )
                }
                className="bg-stone-800 border border-stone-700 text-stone-100 rounded-lg px-3 py-2 w-24 text-sm"
              />
            </td>
            <td className="py-2 px-3">
              <input
                type="number"
                min={0}
                value={row.waste_qty}
                onChange={(e) => onUpdate(idx, 'waste_qty', parseInt(e.target.value) || 0)}
                className="bg-stone-800 border border-stone-700 text-stone-100 rounded-lg px-3 py-2 w-20 text-sm"
              />
            </td>
          </tr>
        )
      })}
    </>
  )
}

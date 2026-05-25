'use client'

import { useState, useTransition } from 'react'
import type { ShoppingListItem } from '@/lib/culinary/shopping-list-actions'
import { assignVendorToIngredient } from '@/lib/culinary/shopping-list-actions'
import { getVendorOrderSummary, type VendorSummary } from '@/lib/culinary/shopping-list-utils'

function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

// ── Vendor Order Summary Bar ─────────────────────────────────────────────

function VendorSummaryBar({ items }: { items: ShoppingListItem[] }) {
  const summaries = getVendorOrderSummary(items)
  if (summaries.length === 0) return null

  return (
    <div className="flex flex-wrap gap-3 rounded-lg border border-stone-700 bg-stone-900/50 px-4 py-3">
      {summaries.map((s) => (
        <div key={s.vendor} className="text-sm">
          <span className="font-medium text-stone-200">{s.vendor}</span>
          <span className="ml-2 text-stone-500">
            {s.itemCount} item{s.itemCount === 1 ? '' : 's'}
          </span>
          <span className="ml-2 text-stone-400">~{formatCurrency(s.estimatedCostCents)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Vendor Assignment Dropdown ───────────────────────────────────────────

function VendorDropdown({
  ingredientId,
  currentVendor,
  vendors,
  onAssigned,
}: {
  ingredientId: string
  currentVendor: string
  vendors: { id: string; name: string }[]
  onAssigned: (vendorName: string) => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleChange(vendorId: string) {
    if (!vendorId) return
    const vendor = vendors.find((v) => v.id === vendorId)
    if (!vendor) return

    startTransition(async () => {
      try {
        await assignVendorToIngredient(ingredientId, vendorId)
        onAssigned(vendor.name)
      } catch {
        // silently fail, list will refresh on next generate
      }
    })
  }

  return (
    <select
      title="Assign vendor"
      value=""
      onChange={(e) => handleChange(e.target.value)}
      disabled={isPending}
      className="rounded border border-stone-700 bg-stone-900 px-1.5 py-0.5 text-xs text-stone-400 max-w-[140px]"
    >
      <option value="">{isPending ? 'Saving...' : currentVendor}</option>
      {vendors
        .filter((v) => v.name !== currentVendor)
        .map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
    </select>
  )
}

// ── Collapsible Vendor Section ───────────────────────────────────────────

function VendorSection({
  vendor,
  items,
  vendors,
  onItemVendorChanged,
}: {
  vendor: string
  items: ShoppingListItem[]
  vendors: { id: string; name: string }[]
  onItemVendorChanged: (ingredientId: string, newVendor: string) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const subtotal = items.reduce((sum, i) => sum + i.estimatedCostCents, 0)

  return (
    <div className="rounded-lg border border-stone-700">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center justify-between border-b border-stone-700 px-3 py-2 text-left"
      >
        <div>
          <span className="text-sm font-semibold text-stone-200">{vendor}</span>
          <span className="ml-2 text-xs text-stone-500">
            {items.length} item{items.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-stone-400">~{formatCurrency(subtotal)}</span>
          <span className="text-stone-500 text-xs">{collapsed ? '+' : '-'}</span>
        </div>
      </button>

      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-800 text-stone-500">
                <th className="px-2 py-1.5 text-left font-medium">Ingredient</th>
                <th className="px-2 py-1.5 text-right font-medium">To Buy</th>
                <th className="px-2 py-1.5 text-right font-medium">Est. Cost</th>
                <th className="px-2 py-1.5 text-right font-medium">Vendor</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.ingredientId} className="border-b border-stone-800">
                  <td className="px-2 py-1.5 text-stone-100">
                    {item.ingredientName}
                    <span className="ml-1 text-xs text-stone-600">{item.category}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right text-stone-300">
                    {item.toBuy.toFixed(1)} {item.unit}
                  </td>
                  <td className="px-2 py-1.5 text-right text-stone-300">
                    {item.estimatedCostCents > 0 ? formatCurrency(item.estimatedCostCents) : '-'}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <VendorDropdown
                      ingredientId={item.ingredientId}
                      currentVendor={item.supplier}
                      vendors={vendors}
                      onAssigned={(name) => onItemVendorChanged(item.ingredientId, name)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Main Vendor Sublist View ─────────────────────────────────────────────

type VendorSublistProps = {
  items: ShoppingListItem[]
  vendors: { id: string; name: string }[]
  onItemVendorChanged: (ingredientId: string, newVendor: string) => void
}

export function VendorSublist({ items, vendors, onItemVendorChanged }: VendorSublistProps) {
  // Group by vendor
  const vendorMap = new Map<string, ShoppingListItem[]>()
  for (const item of items) {
    const v = item.supplier || 'Unassigned'
    const list = vendorMap.get(v) ?? []
    list.push(item)
    vendorMap.set(v, list)
  }

  // Sort: alphabetical, Unassigned last
  const sortedVendors = [...vendorMap.keys()].sort((a, b) => {
    if (a === 'Unassigned') return 1
    if (b === 'Unassigned') return -1
    return a.localeCompare(b)
  })

  return (
    <div className="space-y-4">
      <VendorSummaryBar items={items} />

      {sortedVendors.map((vendor) => (
        <VendorSection
          key={vendor}
          vendor={vendor}
          items={vendorMap.get(vendor)!}
          vendors={vendors}
          onItemVendorChanged={onItemVendorChanged}
        />
      ))}
    </div>
  )
}

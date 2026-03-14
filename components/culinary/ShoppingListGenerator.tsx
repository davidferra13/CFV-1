'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  generateShoppingList,
  createPurchaseOrderFromShoppingList,
  type ShoppingListResult,
} from '@/lib/culinary/shopping-list-actions'

function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

type Props = {
  initialResult: ShoppingListResult
  initialEventIds?: string[]
}

export function ShoppingListGenerator({ initialResult, initialEventIds }: Props) {
  const router = useRouter()
  const [result, setResult] = useState(initialResult)
  const [startDate, setStartDate] = useState(initialResult.startDate)
  const [endDate, setEndDate] = useState(initialResult.endDate)
  const [pinnedEventIds] = useState<string[] | undefined>(initialEventIds)
  const [groupBy, setGroupBy] = useState<'category' | 'supplier'>('category')
  const [showShortagesOnly, setShowShortagesOnly] = useState(true)
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filteredItems = useMemo(() => {
    return result.items.filter((item) => {
      if (showShortagesOnly && item.toBuy <= 0) return false
      if (selectedSupplier && item.supplier !== selectedSupplier) return false
      return true
    })
  }, [result.items, selectedSupplier, showShortagesOnly])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filteredItems>()
    for (const item of filteredItems) {
      const key = groupBy === 'category' ? item.category : item.supplier
      const existing = map.get(key) ?? []
      existing.push(item)
      map.set(key, existing)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filteredItems, groupBy])

  const suppliers = useMemo(() => {
    return Array.from(new Set(result.items.map((item) => item.supplier))).sort((a, b) =>
      a.localeCompare(b)
    )
  }, [result.items])

  function regenerate() {
    setError(null)
    startTransition(async () => {
      try {
        const next = await generateShoppingList({ startDate, endDate, eventIds: pinnedEventIds })
        setResult(next)
      } catch (err: any) {
        setError(err?.message || 'Failed to generate shopping list')
      }
    })
  }

  function exportCsv() {
    const rows = [
      [
        'Ingredient',
        'Category',
        'Supplier',
        'Required',
        'On Hand',
        'To Buy',
        'Unit',
        'Estimated Cost',
      ].join(','),
      ...filteredItems.map((item) =>
        [
          `"${item.ingredientName.replace(/"/g, '""')}"`,
          item.category,
          `"${item.supplier.replace(/"/g, '""')}"`,
          item.totalRequired,
          item.onHand,
          item.toBuy,
          item.unit,
          (item.estimatedCostCents / 100).toFixed(2),
        ].join(',')
      ),
    ]

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `shopping-list-${startDate}-to-${endDate}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  function createDraftPO() {
    if (filteredItems.length === 0) return
    setError(null)

    startTransition(async () => {
      try {
        const po = await createPurchaseOrderFromShoppingList({
          supplier: selectedSupplier || undefined,
          items: filteredItems.map((item) => ({
            ingredientId: item.ingredientId,
            ingredientName: item.ingredientName,
            toBuy: item.toBuy,
            unit: item.unit,
            estimatedCostCents: item.estimatedCostCents,
          })),
        })

        router.push(`/inventory/purchase-orders/${po.id}`)
      } catch (err: any) {
        setError(err?.message || 'Failed to create purchase order from shopping list')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ShoppingListGenerator</CardTitle>
        <p className="text-sm text-stone-500">
          Consolidated ingredient demand minus inventory, grouped by category or supplier.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="grid gap-2 md:grid-cols-[150px_150px_140px_1fr]">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-md border border-stone-600 bg-stone-900 px-2 py-2 text-sm"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-md border border-stone-600 bg-stone-900 px-2 py-2 text-sm"
          />
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as 'category' | 'supplier')}
            className="rounded-md border border-stone-600 bg-stone-900 px-2 py-2 text-sm"
          >
            <option value="category">Group by Category</option>
            <option value="supplier">Group by Supplier</option>
          </select>
          <div className="flex gap-2 justify-end">
            <Button onClick={regenerate} disabled={isPending}>
              Generate
            </Button>
            <Button variant="secondary" onClick={exportCsv}>
              Export
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              Print
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-stone-400">
            <input
              type="checkbox"
              checked={showShortagesOnly}
              onChange={(e) => setShowShortagesOnly(e.target.checked)}
            />
            Show shortages only
          </label>

          <select
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="rounded-md border border-stone-600 bg-stone-900 px-2 py-2 text-sm"
          >
            <option value="">All suppliers</option>
            {suppliers.map((supplier) => (
              <option key={supplier} value={supplier}>
                {supplier}
              </option>
            ))}
          </select>

          <Badge variant="warning">{result.shortageCount} shortages</Badge>
          <Badge variant="info">{formatCurrency(result.totalEstimatedCostCents)} est. spend</Badge>

          <div className="ml-auto">
            <Button onClick={createDraftPO} disabled={isPending || filteredItems.length === 0}>
              Create Draft PO
            </Button>
          </div>
        </div>

        {grouped.length === 0 ? (
          <p className="text-sm text-stone-500">No matching items for this range.</p>
        ) : (
          grouped.map(([groupName, items]) => (
            <div key={groupName} className="rounded-lg border border-stone-700">
              <div className="border-b border-stone-700 px-3 py-2">
                <p className="text-sm font-semibold text-stone-200">
                  {groupName || 'Uncategorized'}
                  <span className="ml-2 text-stone-500">({items.length})</span>
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-800 text-stone-500">
                      <th className="px-2 py-2 text-left font-medium">Ingredient</th>
                      <th className="px-2 py-2 text-right font-medium">Required</th>
                      <th className="px-2 py-2 text-right font-medium">On Hand</th>
                      <th className="px-2 py-2 text-right font-medium">To Buy</th>
                      <th className="px-2 py-2 text-right font-medium">Estimated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={`${item.ingredientId}:${item.unit}`}
                        className="border-b border-stone-800"
                      >
                        <td className="px-2 py-2 text-stone-100">
                          {item.ingredientName}
                          <p className="text-xs text-stone-500">
                            {item.category} · {item.supplier}
                          </p>
                        </td>
                        <td className="px-2 py-2 text-right text-stone-300">
                          {item.totalRequired.toFixed(2)} {item.unit}
                        </td>
                        <td className="px-2 py-2 text-right text-stone-300">
                          {item.onHand.toFixed(2)} {item.unit}
                        </td>
                        <td
                          className={`px-2 py-2 text-right font-medium ${
                            item.toBuy > 0 ? 'text-red-600' : 'text-green-700'
                          }`}
                        >
                          {item.toBuy.toFixed(2)} {item.unit}
                        </td>
                        <td className="px-2 py-2 text-right text-stone-300">
                          {formatCurrency(item.estimatedCostCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

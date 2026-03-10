'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ShoppingCart, Check, Users, ChevronDown, ChevronUp, Calendar } from '@/components/ui/icons'
import {
  getBatchShoppingList,
  createBatchShoppingList,
} from '@/lib/meal-prep/batch-shopping-actions'
import type { BatchShoppingData, BatchShoppingItem } from '@/lib/meal-prep/batch-shopping-actions'
import { formatCurrency } from '@/lib/utils/currency'

function getMonday(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

export function BatchShoppingView() {
  const router = useRouter()
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [data, setData] = useState<BatchShoppingData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const result = await getBatchShoppingList(weekStart)
      setData(result)
      setCheckedItems(new Set())
    } catch (err: any) {
      setError(err.message || 'Failed to generate batch list')
    } finally {
      setLoading(false)
    }
  }

  function handleSave() {
    startTransition(async () => {
      try {
        const result = await createBatchShoppingList(weekStart)
        if (result.success) {
          router.push(`/shopping/${result.id}`)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to save shopping list')
      }
    })
  }

  function toggleExpand(key: string) {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleCheck(key: string) {
    setCheckedItems((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function changeWeek(delta: number) {
    const d = new Date(weekStart + 'T00:00:00')
    d.setDate(d.getDate() + delta * 7)
    setWeekStart(d.toISOString().split('T')[0])
    setData(null)
    setError(null)
  }

  // Group items by category
  const categories = new Map<string, BatchShoppingItem[]>()
  if (data) {
    for (const item of data.items) {
      const cat = item.category
      if (!categories.has(cat)) categories.set(cat, [])
      categories.get(cat)!.push(item)
    }
  }

  const weekDate = new Date(weekStart + 'T00:00:00')
  const weekLabel = weekDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="space-y-4">
      {/* Week selector */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => changeWeek(-1)}>
            &larr; Prev
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-stone-400" />
            <span className="font-medium text-stone-200">Week of {weekLabel}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => changeWeek(1)}>
            Next &rarr;
          </Button>
        </div>
      </Card>

      {/* Generate button */}
      {!data && (
        <div className="text-center py-8">
          <ShoppingCart className="w-12 h-12 text-stone-600 mx-auto mb-4" />
          <p className="text-stone-400 mb-4">
            Generate a consolidated shopping list from all active meal prep programs.
          </p>
          <Button variant="primary" onClick={handleGenerate} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Batch List'}
          </Button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/20 p-4 text-red-400">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Active programs summary */}
          {data.programs.length > 0 && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-wide mb-3">
                Active Programs ({data.programs.length})
              </h3>
              <div className="space-y-2">
                {data.programs.map((prog) => (
                  <div key={prog.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-stone-500" />
                      <span className="text-stone-200">{prog.clientName}</span>
                      <Badge variant="default">Week {prog.rotationWeek}</Badge>
                    </div>
                    <span className="text-stone-500">
                      {prog.dishes.length > 0
                        ? `${prog.dishes.length} dish${prog.dishes.length > 1 ? 'es' : ''}`
                        : 'No dishes'}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Shopping list by category */}
          {data.items.length > 0 ? (
            <>
              {Array.from(categories.entries()).map(([category, items]) => (
                <div key={category} className="space-y-2">
                  <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider px-1">
                    {category}
                    <span className="text-stone-600 ml-2 font-normal">
                      ({items.length} item{items.length > 1 ? 's' : ''})
                    </span>
                  </h3>
                  {items.map((item) => {
                    const itemKey = `${item.ingredientName}|${item.unit}`
                    const isExpanded = expandedItems.has(itemKey)
                    const isChecked = checkedItems.has(itemKey)

                    return (
                      <Card
                        key={itemKey}
                        className={`p-3 transition-all ${isChecked ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleCheck(itemKey)}
                            className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                              isChecked
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-stone-600 hover:border-stone-400'
                            }`}
                          >
                            {isChecked && <Check className="w-4 h-4" />}
                          </button>

                          {/* Item info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-sm font-medium ${
                                  isChecked ? 'text-stone-500 line-through' : 'text-stone-200'
                                }`}
                              >
                                {item.ingredientName}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-stone-400 font-mono">
                                  {item.totalQuantity} {item.unit}
                                </span>
                                {item.estimatedCostCents && (
                                  <span className="text-xs text-stone-500">
                                    {formatCurrency(item.estimatedCostCents)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Client count */}
                            {item.clients.length > 1 && (
                              <button
                                onClick={() => toggleExpand(itemKey)}
                                className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-300 mt-1"
                              >
                                <Users className="w-3 h-3" />
                                {item.clients.length} clients
                                {isExpanded ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </button>
                            )}
                            {item.clients.length === 1 && (
                              <p className="text-xs text-stone-500 mt-0.5">
                                {item.clients[0].clientName}
                              </p>
                            )}

                            {/* Expanded client breakdown */}
                            {isExpanded && (
                              <div className="mt-2 space-y-1 pl-1">
                                {item.clients.map((c) => (
                                  <p key={c.clientId} className="text-xs text-stone-400">
                                    {c.clientName}: {c.quantity} {item.unit}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              ))}

              {/* Cost breakdown */}
              <Card className="p-4 space-y-3">
                <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-wide">
                  Cost Breakdown
                </h3>
                {data.clientTotals.map((ct) => (
                  <div key={ct.clientId} className="flex items-center justify-between text-sm">
                    <span className="text-stone-300">{ct.clientName}</span>
                    <span className="text-stone-400">
                      {ct.estimatedCents > 0 ? formatCurrency(ct.estimatedCents) : 'N/A'}
                    </span>
                  </div>
                ))}
                <div className="border-t border-stone-700 pt-2 flex items-center justify-between">
                  <span className="font-semibold text-stone-200">Total Estimated</span>
                  <span className="font-semibold text-stone-200">
                    {data.totalEstimatedCents > 0
                      ? formatCurrency(data.totalEstimatedCents)
                      : 'N/A'}
                  </span>
                </div>
              </Card>

              {/* Save button */}
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleSave}
                  disabled={pending}
                >
                  <ShoppingCart className="w-4 h-4 mr-1" />
                  {pending ? 'Saving...' : 'Save as Shopping List'}
                </Button>
                <Button variant="secondary" onClick={handleGenerate} disabled={loading}>
                  Refresh
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-stone-500">
                No ingredients found. Make sure your meal prep programs have menus with recipe
                ingredients assigned.
              </p>
              <Button
                variant="secondary"
                className="mt-4"
                onClick={handleGenerate}
                disabled={loading}
              >
                Try Again
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

'use client'

// Food Cost Panel - event detail panel showing estimated vs actual food costs,
// per-dish breakdown, and manual grocery spend log.

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils/currency'
import { getFoodCostBadgeColor } from '@/lib/finance/food-cost-calculator'
import {
  addGrocerySpend,
  updateGrocerySpend,
  deleteGrocerySpend,
} from '@/lib/finance/food-cost-actions'
import type { EventFoodCost, GroceryEntry, DishBreakdown } from '@/lib/finance/food-cost-actions'
import {
  Receipt,
  ShoppingCart,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Pencil,
} from '@/components/ui/icons'

interface Props {
  eventId: string
  initialData: EventFoodCost
}

export function FoodCostPanel({ eventId, initialData }: Props) {
  const [data, setData] = useState(initialData)
  const [isAddingGrocery, setIsAddingGrocery] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedDishes, setExpandedDishes] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const badgeColor = getFoodCostBadgeColor(data.foodCostPercentage)

  function toggleDish(dishName: string) {
    setExpandedDishes((prev) => {
      const next = new Set(prev)
      if (next.has(dishName)) next.delete(dishName)
      else next.add(dishName)
      return next
    })
  }

  // ── Add Grocery ──

  async function handleAddGrocery(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const store = fd.get('store') as string
    const amount = parseFloat(fd.get('amount') as string)
    const date = fd.get('date') as string
    const notes = fd.get('notes') as string

    if (!store || !amount || !date) return

    const amountCents = Math.round(amount * 100)
    const previousData = data

    // Optimistic update
    const newEntry: GroceryEntry = {
      id: `temp-${Date.now()}`,
      store,
      amountCents,
      date,
      notes: notes || null,
      receiptUrl: null,
    }

    setData((prev) => ({
      ...prev,
      groceryEntries: [newEntry, ...prev.groceryEntries],
      actualSpendCents: prev.actualSpendCents + amountCents,
    }))
    setIsAddingGrocery(false)

    startTransition(async () => {
      try {
        const result = await addGrocerySpend({ eventId, store, amountCents, date, notes })
        if (!result.success) {
          setData(previousData)
        }
      } catch {
        setData(previousData)
      }
    })
  }

  // ── Delete Grocery ──

  async function handleDeleteGrocery(entry: GroceryEntry) {
    const previousData = data

    setData((prev) => ({
      ...prev,
      groceryEntries: prev.groceryEntries.filter((e) => e.id !== entry.id),
      actualSpendCents: prev.actualSpendCents - entry.amountCents,
    }))

    startTransition(async () => {
      try {
        const result = await deleteGrocerySpend(entry.id, eventId)
        if (!result.success) {
          setData(previousData)
        }
      } catch {
        setData(previousData)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* ── Summary Card ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          label="Estimated Cost"
          value={formatCurrency(data.estimatedCostCents)}
          sublabel="From recipes"
        />
        <SummaryCard
          label="Actual Spend"
          value={data.actualSpendCents > 0 ? formatCurrency(data.actualSpendCents) : 'No data'}
          sublabel="Grocery receipts"
        />
        <SummaryCard
          label="Cost Per Guest"
          value={data.costPerGuestCents > 0 ? formatCurrency(data.costPerGuestCents) : 'N/A'}
          sublabel={data.guestCount ? `${data.guestCount} guests` : 'No guest count'}
        />
        <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-3">
          <p className="text-xs text-stone-400 mb-1">Food Cost %</p>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-stone-100">{data.foodCostPercentage}%</span>
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${badgeColor}`}>
              {data.foodCostRating.label}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            of {formatCurrency(data.revenueCents)} revenue
          </p>
        </div>
      </div>

      {/* ── Industry Benchmark ── */}
      <p className="text-xs text-stone-500 italic">
        Industry benchmark: Private chefs typically target 25-30% food cost.
      </p>

      {/* ── Per-Dish Breakdown ── */}
      {data.breakdown.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-stone-300 mb-2">Recipe Cost Breakdown</h4>
          <div className="space-y-1">
            {data.breakdown.map((dish) => (
              <DishRow
                key={dish.dishName}
                dish={dish}
                isExpanded={expandedDishes.has(dish.dishName)}
                onToggle={() => toggleDish(dish.dishName)}
              />
            ))}
          </div>
          <div className="flex justify-between text-sm font-medium text-stone-200 mt-2 pt-2 border-t border-stone-800">
            <span>Total estimated</span>
            <span>{formatCurrency(data.estimatedCostCents)}</span>
          </div>
        </div>
      )}

      {data.breakdown.length === 0 && (
        <p className="text-sm text-stone-500 py-3 text-center">
          No menu attached to this event, or no recipes linked to dishes.
        </p>
      )}

      {/* ── Grocery Spend Log ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-stone-300 flex items-center gap-1.5">
            <ShoppingCart className="h-4 w-4 text-stone-400" />
            Grocery Spend Log
          </h4>
          <button
            onClick={() => setIsAddingGrocery(true)}
            className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Add entry
          </button>
        </div>

        {isAddingGrocery && (
          <form
            onSubmit={handleAddGrocery}
            className="border border-stone-800 rounded-lg p-3 mb-3 space-y-2"
          >
            <div className="grid grid-cols-2 gap-2">
              <input
                name="store"
                placeholder="Store name"
                required
                className="bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-sm text-stone-200 placeholder:text-stone-500"
              />
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Amount ($)"
                required
                className="bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-sm text-stone-200 placeholder:text-stone-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                name="date"
                type="date"
                defaultValue={((_fcp) =>
                  `${_fcp.getFullYear()}-${String(_fcp.getMonth() + 1).padStart(2, '0')}-${String(_fcp.getDate()).padStart(2, '0')}`)(
                  new Date()
                )}
                required
                className="bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-sm text-stone-200"
              />
              <input
                name="notes"
                placeholder="Notes (optional)"
                className="bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-sm text-stone-200 placeholder:text-stone-500"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setIsAddingGrocery(false)}
                className="text-xs text-stone-400 hover:text-stone-300 px-2 py-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-3 py-1 rounded disabled:opacity-50"
              >
                {isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        )}

        {data.groceryEntries.length === 0 && !isAddingGrocery && (
          <p className="text-sm text-stone-500 py-3 text-center">
            No grocery spend recorded yet. Add entries to track actual food costs.
          </p>
        )}

        {data.groceryEntries.length > 0 && (
          <div className="space-y-1.5">
            {data.groceryEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between text-sm border border-stone-800 rounded-md px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Receipt className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                  <span className="text-stone-200 truncate">{entry.store}</span>
                  <span className="text-stone-500 text-xs shrink-0">
                    {format(new Date(entry.date + 'T00:00:00'), 'MMM d')}
                  </span>
                  {entry.notes && (
                    <span className="text-stone-500 text-xs truncate">{entry.notes}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-stone-200 font-medium">
                    {formatCurrency(entry.amountCents)}
                  </span>
                  <button
                    onClick={() => handleDeleteGrocery(entry)}
                    className="text-stone-500 hover:text-red-400 p-0.5"
                    title="Delete entry"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex justify-between text-sm font-medium text-stone-200 mt-2 pt-2 border-t border-stone-800">
              <span>Total actual spend</span>
              <span>{formatCurrency(data.actualSpendCents)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ──

function SummaryCard({
  label,
  value,
  sublabel,
}: {
  label: string
  value: string
  sublabel: string
}) {
  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-3">
      <p className="text-xs text-stone-400 mb-1">{label}</p>
      <p className="text-lg font-semibold text-stone-100">{value}</p>
      <p className="text-xs text-stone-500 mt-1">{sublabel}</p>
    </div>
  )
}

function DishRow({
  dish,
  isExpanded,
  onToggle,
}: {
  dish: DishBreakdown
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="border border-stone-800 rounded-md overflow-hidden">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-stone-800/50"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
          )}
          <span className="text-stone-200">{dish.dishName}</span>
          <span className="text-xs text-stone-500">{dish.courseName}</span>
        </div>
        <span className="text-stone-300 font-medium">
          {formatCurrency(dish.estimatedCostCents)}
        </span>
      </button>

      {isExpanded && dish.ingredients.length > 0 && (
        <div className="px-3 pb-2 border-t border-stone-800/50">
          <table className="w-full text-xs mt-1.5">
            <thead>
              <tr className="text-stone-500">
                <th className="text-left font-normal py-1">Ingredient</th>
                <th className="text-right font-normal py-1">Qty</th>
                <th className="text-right font-normal py-1">Unit Cost</th>
                <th className="text-right font-normal py-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {dish.ingredients.map((ing, i) => (
                <tr key={`${ing.name}-${i}`} className="text-stone-300">
                  <td className="py-0.5">
                    {ing.name}
                    {!ing.hasCostData && (
                      <span className="text-amber-500 ml-1" title="No cost data">
                        *
                      </span>
                    )}
                  </td>
                  <td className="text-right py-0.5">
                    {ing.qty.toFixed(1)} {ing.unit}
                  </td>
                  <td className="text-right py-0.5">
                    {ing.hasCostData ? formatCurrency(ing.unitCostCents) : 'N/A'}
                  </td>
                  <td className="text-right py-0.5">{formatCurrency(ing.totalCostCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {dish.ingredients.some((i) => !i.hasCostData) && (
            <p className="text-xs text-amber-500/70 mt-1">
              * Missing cost data. Update ingredient prices for accurate estimates.
            </p>
          )}
        </div>
      )}

      {isExpanded && dish.ingredients.length === 0 && (
        <p className="text-xs text-stone-500 px-3 py-2 border-t border-stone-800/50">
          No ingredients linked to recipes for this dish.
        </p>
      )}
    </div>
  )
}

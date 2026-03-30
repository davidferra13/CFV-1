'use client'

import { useState, useTransition } from 'react'
import { Calculator, Loader2 } from 'lucide-react'
import { estimateMenuCost } from '@/lib/menus/estimate-actions'
import type { MenuEstimate } from '@/lib/menus/estimate-actions'
import { DishEstimateRow } from './dish-estimate-row'

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

interface MenuCostEstimatorProps {
  /** If provided, pre-populates the dish names textarea */
  initialDishNames?: string[]
  /** If provided, pre-populates guest count */
  initialGuestCount?: number
}

export function MenuCostEstimator({
  initialDishNames,
  initialGuestCount = 2,
}: MenuCostEstimatorProps) {
  const [dishText, setDishText] = useState(initialDishNames?.join('\n') ?? '')
  const [guestCount, setGuestCount] = useState(initialGuestCount)
  const [eventPrice, setEventPrice] = useState('')
  const [estimate, setEstimate] = useState<MenuEstimate | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const dishNames = dishText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  function handleEstimate() {
    if (dishNames.length === 0) return
    setError(null)

    startTransition(async () => {
      try {
        const eventPriceCents = eventPrice ? Math.round(parseFloat(eventPrice) * 100) : undefined

        const result = await estimateMenuCost({
          dishNames,
          guestCount,
          eventPriceCents,
        })

        if (result.success) {
          setEstimate(result.estimate)
        } else {
          setError(result.error)
          setEstimate(null)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Estimation failed')
        setEstimate(null)
      }
    })
  }

  function handleGuestCountChange(newCount: number) {
    setGuestCount(newCount)
    // Re-scale existing estimate client-side
    if (estimate && newCount > 0) {
      const oldCount = estimate.guestCount
      if (oldCount > 0 && oldCount !== newCount) {
        const scaleFactor = newCount / oldCount
        const updatedDishes = estimate.dishes.map((d) => ({
          ...d,
          costCents: d.costCents !== null ? Math.round(d.costCents * scaleFactor) : null,
          costPerGuestCents:
            d.costCents !== null ? Math.round((d.costCents * scaleFactor) / newCount) : null,
          scaleFactor: Math.round(d.scaleFactor * scaleFactor * 100) / 100,
        }))
        const totalCostCents = updatedDishes.reduce((sum, d) => sum + (d.costCents || 0), 0)
        setEstimate({
          ...estimate,
          dishes: updatedDishes,
          guestCount: newCount,
          totalCostCents,
          costPerGuestCents: newCount > 0 ? Math.round(totalCostCents / newCount) : null,
        })
      }
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Left panel: Input */}
      <div className="flex-1 lg:w-3/5">
        {!estimate ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-300">
                Dish Names (one per line)
              </label>
              <textarea
                value={dishText}
                onChange={(e) => setDishText(e.target.value)}
                placeholder={`Malai Kofta\nPaneer Tikka\nShahi Tukra\nGulab Jamun\nEgg Curry`}
                rows={10}
                className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-600 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="flex gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-300">Guests</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={guestCount}
                  onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24 rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-200 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-300">
                  Event Price (optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-stone-500">$</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={eventPrice}
                    onChange={(e) => setEventPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-32 rounded-lg border border-stone-700 bg-stone-800 py-2 pl-7 pr-3 text-sm text-stone-200 placeholder:text-stone-600 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleEstimate}
              disabled={dishNames.length === 0 || isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Calculator className="h-4 w-4" />
              )}
              Estimate Cost
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-stone-300">Dish Breakdown</h3>
              <button
                onClick={() => setEstimate(null)}
                className="text-xs text-stone-500 hover:text-stone-300"
              >
                Edit dishes
              </button>
            </div>

            <div className="space-y-2">
              {estimate.dishes.map((dish, i) => (
                <DishEstimateRow key={`${dish.dishName}-${i}`} dish={dish} />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-800 bg-red-900/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* Right panel: Summary */}
      {estimate && (
        <div className="lg:w-2/5">
          <div className="sticky top-20 space-y-4 rounded-xl border border-stone-700 bg-stone-900 p-5">
            <h3 className="text-sm font-medium text-stone-400">Cost Summary</h3>

            {/* Big number */}
            <div>
              <div className="text-3xl font-bold text-stone-100">
                {formatCents(estimate.totalCostCents)}
              </div>
              <div className="text-xs text-stone-500">estimated total (costed dishes only)</div>
            </div>

            {/* Per-guest */}
            {estimate.costPerGuestCents !== null && (
              <div className="flex items-baseline justify-between border-t border-stone-800 pt-3">
                <span className="text-sm text-stone-400">Per guest</span>
                <span className="text-lg font-semibold text-stone-200">
                  {formatCents(estimate.costPerGuestCents)}
                </span>
              </div>
            )}

            {/* Food cost % */}
            {estimate.foodCostPercentage !== null && (
              <div className="flex items-baseline justify-between border-t border-stone-800 pt-3">
                <span className="text-sm text-stone-400">Food cost %</span>
                <span
                  className={`text-lg font-semibold ${
                    estimate.foodCostPercentage <= 30
                      ? 'text-emerald-400'
                      : estimate.foodCostPercentage <= 40
                        ? 'text-amber-400'
                        : 'text-red-400'
                  }`}
                >
                  {estimate.foodCostPercentage}%
                </span>
              </div>
            )}

            {/* Completeness */}
            <div className="border-t border-stone-800 pt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-400">Completeness</span>
                <span className="font-medium text-stone-200">
                  {estimate.costedCount + estimate.partialCount} of {estimate.dishes.length} dishes
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-800">
                <div
                  className="h-full rounded-full bg-teal-500 transition-all"
                  style={{ width: `${estimate.completeness}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-stone-500">{estimate.completeness}% costed</div>
            </div>

            {/* Guest count adjuster */}
            <div className="border-t border-stone-800 pt-3">
              <label className="mb-1.5 block text-sm text-stone-400">Guests</label>
              <input
                type="number"
                min={1}
                max={500}
                value={guestCount}
                onChange={(e) => handleGuestCountChange(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 rounded border border-stone-700 bg-stone-800 px-2 py-1 text-sm text-stone-200 focus:border-teal-500 focus:outline-none"
              />
            </div>

            {/* Warning for missing dishes */}
            {estimate.missingCount > 0 && (
              <div className="rounded-lg border border-amber-800/50 bg-amber-900/20 p-3 text-xs text-amber-400">
                {estimate.missingCount} dish{estimate.missingCount !== 1 ? 'es' : ''} need
                {estimate.missingCount === 1 ? 's' : ''} recipes before the estimate is complete.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

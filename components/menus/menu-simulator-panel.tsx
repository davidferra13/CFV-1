'use client'

// Menu Simulator Panel - "What If" dish swap preview
// Shows cost, allergen, and margin impact of swapping one dish for another.
// Ephemeral state only: nothing is saved until the chef clicks "Apply Swap".
// Pure math, no AI.

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  simulateDishSwap,
  formatCentsDelta,
  formatCents,
  type SimulatorDish,
  type SimulationResult,
} from '@/lib/menus/menu-simulator'

// ── Props ────────────────────────────────────────────────────────────────────

export type MenuSimulatorPanelProps = {
  /** Current dishes on the menu */
  currentDishes: SimulatorDish[]
  /** Guest count for cost scaling */
  guestCount: number
  /** Guest allergens from client records */
  guestAllergens: { allergen: string; severity: string; confirmed_by_chef: boolean }[]
  /** Menu revenue in cents (for margin calculation) */
  menuRevenueCents: number
  /** Available dishes the chef can swap in */
  availableDishes: SimulatorDish[]
  /** Called when the chef confirms the swap */
  onApplySwap: (removeDishId: string, addDish: SimulatorDish) => void
  /** Called when the chef cancels */
  onCancel: () => void
}

// ── Component ────────────────────────────────────────────────────────────────

export function MenuSimulatorPanel({
  currentDishes,
  guestCount,
  guestAllergens,
  menuRevenueCents,
  availableDishes,
  onApplySwap,
  onCancel,
}: MenuSimulatorPanelProps) {
  const [selectedRemoveId, setSelectedRemoveId] = useState<string | null>(null)
  const [selectedAddId, setSelectedAddId] = useState<string | null>(null)

  const selectedRemoveDish = currentDishes.find((d) => d.id === selectedRemoveId) ?? null
  const selectedAddDish = availableDishes.find((d) => d.id === selectedAddId) ?? null

  // Run simulation when both dishes are selected
  const simulation: SimulationResult | null = useMemo(() => {
    if (!selectedRemoveId || !selectedAddDish) return null
    try {
      return simulateDishSwap({
        currentDishes,
        removeDishId: selectedRemoveId,
        addDish: selectedAddDish,
        guestCount,
        guestAllergens,
        menuRevenueCents,
      })
    } catch {
      return null
    }
  }, [selectedRemoveId, selectedAddDish, currentDishes, guestCount, guestAllergens, menuRevenueCents])

  const handleApply = () => {
    if (selectedRemoveId && selectedAddDish) {
      onApplySwap(selectedRemoveId, selectedAddDish)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-100">What-If Simulator</h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-stone-400 hover:text-stone-200"
        >
          Close
        </button>
      </div>
      <p className="text-xs text-stone-400">
        Preview the impact of swapping a dish before committing.
      </p>

      {/* Step 1: Select dish to remove */}
      <div>
        <label className="text-xs font-medium text-stone-300 block mb-1.5">
          Replace this dish
        </label>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {currentDishes.map((dish) => (
            <button
              key={dish.id}
              type="button"
              onClick={() => setSelectedRemoveId(dish.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                selectedRemoveId === dish.id
                  ? 'bg-red-500/10 border border-red-500/30 text-red-300'
                  : 'bg-stone-800 border border-stone-700 text-stone-300 hover:bg-stone-700'
              }`}
            >
              <span className="font-medium">{dish.name}</span>
              <span className="ml-2 text-xs text-stone-500">
                {formatCents(dish.costPerServingCents)}/serving
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Select dish to add */}
      {selectedRemoveId && (
        <div>
          <label className="text-xs font-medium text-stone-300 block mb-1.5">
            Swap in this dish
          </label>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {availableDishes.map((dish) => (
              <button
                key={dish.id}
                type="button"
                onClick={() => setSelectedAddId(dish.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  selectedAddId === dish.id
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : 'bg-stone-800 border border-stone-700 text-stone-300 hover:bg-stone-700'
                }`}
              >
                <span className="font-medium">{dish.name}</span>
                <span className="ml-2 text-xs text-stone-500">
                  {formatCents(dish.costPerServingCents)}/serving
                </span>
              </button>
            ))}
            {availableDishes.length === 0 && (
              <p className="text-xs text-stone-500 py-2">No available dishes to swap in.</p>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Show simulation results */}
      {simulation && (
        <Card className="bg-stone-800/50 border-stone-700 p-4 space-y-3">
          <h4 className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
            Impact Preview
          </h4>

          {/* Dish comparison header */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-red-400 line-through">{simulation.removedDish.name}</span>
            <span className="text-stone-500">&rarr;</span>
            <span className="text-emerald-400">{simulation.addedDish.name}</span>
          </div>

          {/* Cost delta */}
          <div className="flex items-center justify-between py-1.5 border-b border-stone-700">
            <span className="text-xs text-stone-400">Food cost change</span>
            <span
              className={`text-sm font-semibold ${
                simulation.foodCostDeltaCents < 0
                  ? 'text-emerald-400'
                  : simulation.foodCostDeltaCents > 0
                    ? 'text-red-400'
                    : 'text-stone-400'
              }`}
            >
              {formatCentsDelta(simulation.foodCostDeltaCents)}
            </span>
          </div>

          {/* Total cost comparison */}
          <div className="flex items-center justify-between py-1.5 border-b border-stone-700">
            <span className="text-xs text-stone-400">Total menu cost</span>
            <div className="text-right">
              <span className="text-xs text-stone-500 line-through mr-2">
                {formatCents(simulation.oldTotalCostCents)}
              </span>
              <span className="text-sm text-stone-200">
                {formatCents(simulation.newTotalCostCents)}
              </span>
            </div>
          </div>

          {/* Margin impact */}
          <div className="flex items-center justify-between py-1.5 border-b border-stone-700">
            <span className="text-xs text-stone-400">Margin</span>
            <div className="text-right">
              <span className="text-xs text-stone-500 mr-2">
                {simulation.marginImpact.oldMarginPct}%
              </span>
              <span className="text-stone-500 mr-2">&rarr;</span>
              <span
                className={`text-sm font-semibold ${
                  simulation.marginImpact.newMarginPct > simulation.marginImpact.oldMarginPct
                    ? 'text-emerald-400'
                    : simulation.marginImpact.newMarginPct < simulation.marginImpact.oldMarginPct
                      ? 'text-red-400'
                      : 'text-stone-300'
                }`}
              >
                {simulation.marginImpact.newMarginPct}%
              </span>
            </div>
          </div>

          {/* Prep time delta */}
          {simulation.prepTimeEstimateDelta !== null && (
            <div className="flex items-center justify-between py-1.5 border-b border-stone-700">
              <span className="text-xs text-stone-400">Prep time change</span>
              <span
                className={`text-sm ${
                  simulation.prepTimeEstimateDelta < 0
                    ? 'text-emerald-400'
                    : simulation.prepTimeEstimateDelta > 0
                      ? 'text-amber-400'
                      : 'text-stone-400'
                }`}
              >
                {simulation.prepTimeEstimateDelta > 0 ? '+' : ''}
                {simulation.prepTimeEstimateDelta} min
              </span>
            </div>
          )}

          {/* Allergen warnings */}
          {simulation.allergenConflicts.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-red-400">Allergen Conflicts</span>
                <Badge variant="error">{simulation.allergenConflicts.length}</Badge>
              </div>
              {simulation.allergenConflicts.map((conflict, i) => (
                <div
                  key={`${conflict.allergen}-${i}`}
                  className="text-xs bg-red-500/10 border border-red-500/20 rounded px-2 py-1.5 text-red-300"
                >
                  <span className="font-medium">{conflict.allergen}</span>
                  {' - '}
                  found &ldquo;{conflict.ingredientName}&rdquo;
                  {conflict.severity && (
                    <span className="text-red-400 ml-1">({conflict.severity})</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Ingredient overlap */}
          {simulation.ingredientOverlap.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs text-stone-400">
                Shared ingredients with other dishes ({simulation.ingredientOverlap.length})
              </span>
              <div className="flex flex-wrap gap-1">
                {simulation.ingredientOverlap.map((ing) => (
                  <Badge key={ing} variant="info">
                    {ing}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Actions */}
      {simulation && (
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={handleApply}
            className="flex-1"
          >
            Apply Swap
          </Button>
          <Button
            variant="ghost"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}

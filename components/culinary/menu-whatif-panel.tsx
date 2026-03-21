'use client'

import { useEffect, useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getMenuSimulatorData } from '@/lib/menus/menu-engineering-actions'
import type { MenuSimulatorData } from '@/lib/menus/menu-engineering-actions'
import { simulateDishSwap, formatCentsDelta, formatCents } from '@/lib/menus/menu-simulator'
import type { SimulationResult, SimulatorDish } from '@/lib/menus/menu-simulator'

interface MenuWhatIfPanelProps {
  menuId: string
}

export function MenuWhatIfPanel({ menuId }: MenuWhatIfPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<MenuSimulatorData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  // Selection state
  const [removeDishId, setRemoveDishId] = useState('')
  const [addDishId, setAddDishId] = useState('')
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [simError, setSimError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || data) return
    startTransition(async () => {
      try {
        const simData = await getMenuSimulatorData(menuId)
        setData(simData)
        setLoadError(null)
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load simulator data')
      }
    })
  }, [menuId, isOpen, data])

  function runSimulation() {
    if (!data || !removeDishId || !addDishId) return
    setSimError(null)

    const addDish = data.availableRecipes.find((r) => r.id === addDishId)
    if (!addDish) {
      setSimError('Selected recipe not found')
      return
    }

    try {
      const simResult = simulateDishSwap({
        currentDishes: data.currentDishes,
        removeDishId,
        addDish,
        guestCount: data.guestCount,
        guestAllergens: data.guestAllergens,
        menuRevenueCents: data.menuRevenueCents,
      })
      setResult(simResult)
    } catch (err) {
      setSimError(err instanceof Error ? err.message : 'Simulation failed')
      setResult(null)
    }
  }

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800/50">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">
          What-If Simulator
        </span>
        <span className="text-stone-500 text-xs">{isOpen ? '−' : '+'}</span>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-3 border-t border-stone-700 pt-3">
          {loadError && <p className="text-xs text-red-300">{loadError}</p>}

          {isPending && (
            <div className="animate-pulse space-y-2">
              <div className="h-3 bg-stone-700 rounded w-3/4" />
              <div className="h-3 bg-stone-700 rounded w-1/2" />
            </div>
          )}

          {data && !isPending && (
            <>
              {data.currentDishes.length === 0 ? (
                <p className="text-xs text-stone-500">
                  Add dishes to the menu to use the simulator.
                </p>
              ) : (
                <>
                  {/* Remove dish selector */}
                  <div>
                    <label className="text-xxs text-stone-500 block mb-1">Remove dish</label>
                    <select
                      value={removeDishId}
                      onChange={(e) => {
                        setRemoveDishId(e.target.value)
                        setResult(null)
                      }}
                      className="w-full bg-stone-900 border border-stone-600 rounded px-2 py-1.5 text-xs text-stone-200"
                    >
                      <option value="">Select a dish...</option>
                      {data.currentDishes.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({formatCents(d.costPerServingCents)}/srv)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Add dish selector */}
                  <div>
                    <label className="text-xxs text-stone-500 block mb-1">Replace with</label>
                    <select
                      value={addDishId}
                      onChange={(e) => {
                        setAddDishId(e.target.value)
                        setResult(null)
                      }}
                      className="w-full bg-stone-900 border border-stone-600 rounded px-2 py-1.5 text-xs text-stone-200"
                    >
                      <option value="">Select a recipe...</option>
                      {data.availableRecipes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({formatCents(r.costPerServingCents)}/srv)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Simulate button */}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={runSimulation}
                    disabled={!removeDishId || !addDishId}
                    className="w-full text-xs"
                  >
                    Simulate Swap
                  </Button>

                  {simError && <p className="text-xs text-red-300">{simError}</p>}

                  {/* Results */}
                  {result && (
                    <div className="space-y-2 pt-2 border-t border-stone-700">
                      <div className="grid grid-cols-2 gap-2 text-xxs">
                        <div>
                          <span className="text-stone-500">Cost delta</span>
                          <p
                            className={`font-bold text-sm ${
                              result.foodCostDeltaCents > 0
                                ? 'text-red-400'
                                : result.foodCostDeltaCents < 0
                                  ? 'text-emerald-400'
                                  : 'text-stone-300'
                            }`}
                          >
                            {formatCentsDelta(result.foodCostDeltaCents)}
                          </p>
                        </div>
                        <div>
                          <span className="text-stone-500">New total</span>
                          <p className="font-medium text-stone-200 text-sm">
                            {formatCents(result.newTotalCostCents)}
                          </p>
                        </div>
                      </div>

                      {/* Margin impact */}
                      {result.marginImpact.oldMarginPct > 0 && (
                        <div className="text-xxs">
                          <span className="text-stone-500">Margin: </span>
                          <span className="text-stone-400">
                            {result.marginImpact.oldMarginPct}%
                          </span>
                          <span className="text-stone-600 mx-1">→</span>
                          <span
                            className={
                              result.marginImpact.newMarginPct >= result.marginImpact.oldMarginPct
                                ? 'text-emerald-400'
                                : 'text-red-400'
                            }
                          >
                            {result.marginImpact.newMarginPct}%
                          </span>
                        </div>
                      )}

                      {/* Prep time delta */}
                      {result.prepTimeEstimateDelta !== null && (
                        <div className="text-xxs">
                          <span className="text-stone-500">Prep time: </span>
                          <span
                            className={
                              result.prepTimeEstimateDelta > 0
                                ? 'text-amber-400'
                                : result.prepTimeEstimateDelta < 0
                                  ? 'text-emerald-400'
                                  : 'text-stone-400'
                            }
                          >
                            {result.prepTimeEstimateDelta > 0 ? '+' : ''}
                            {result.prepTimeEstimateDelta}m
                          </span>
                        </div>
                      )}

                      {/* Allergen conflicts */}
                      {result.allergenConflicts.length > 0 && (
                        <div className="bg-red-500/10 rounded p-2">
                          <p className="text-xxs font-medium text-red-400 mb-1">
                            Allergen Conflicts
                          </p>
                          {result.allergenConflicts.map((c, i) => (
                            <p key={i} className="text-xxs text-red-300">
                              {c.ingredientName} triggers {c.allergen} ({c.severity})
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Ingredient overlap */}
                      {result.ingredientOverlap.length > 0 && (
                        <div className="text-xxs">
                          <span className="text-amber-400 font-medium">Shared ingredients: </span>
                          <span className="text-stone-400">
                            {result.ingredientOverlap.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

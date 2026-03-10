'use client'

// Menu Scaling Panel
// Shows scaled ingredient quantities for a menu based on guest count.
// Pure math display: recipe yield / guest count = multiplier, applied to all ingredients.

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  scaleMenuForGuests,
  getStoreSectionLabel,
  type MenuScalingResult,
  type ScaledDish,
  type ScaledComponent,
  type ConsolidatedIngredient,
} from '@/lib/scaling/recipe-scaling'

// ============================================
// MAIN PANEL
// ============================================

export function MenuScalingPanel({
  menuId,
  initialGuestCount,
}: {
  menuId: string
  initialGuestCount: number | null
}) {
  const [guestCount, setGuestCount] = useState(initialGuestCount?.toString() ?? '')
  const [result, setResult] = useState<MenuScalingResult | null>(null)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const [view, setView] = useState<'breakdown' | 'shopping'>('breakdown')

  const handleScale = () => {
    const count = parseInt(guestCount, 10)
    if (!count || count <= 0) {
      setError('Enter a valid guest count')
      return
    }
    setError('')
    startTransition(async () => {
      try {
        const data = await scaleMenuForGuests(menuId, count)
        setResult(data)
      } catch (err: any) {
        setError(err.message || 'Failed to scale menu')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-100">Recipe Scaling</h2>
      </div>

      {/* Guest count input */}
      <div className="flex items-end gap-3">
        <div>
          <label className="block text-xs text-stone-500 mb-1">Guest count</label>
          <Input
            type="number"
            value={guestCount}
            onChange={(e) => setGuestCount(e.target.value)}
            placeholder="40"
            min="1"
            className="w-28 text-sm"
            disabled={pending}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleScale()
            }}
          />
        </div>
        <Button variant="primary" size="sm" onClick={handleScale} disabled={pending || !guestCount}>
          {pending ? 'Scaling...' : 'Scale Recipes'}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-950 border border-red-800 rounded px-3 py-2">
          {error}
        </p>
      )}

      {result && (
        <>
          {/* Summary bar */}
          <SummaryBar result={result} />

          {/* View toggle */}
          <div className="flex gap-1 border-b border-stone-700 pb-1">
            <button
              type="button"
              onClick={() => setView('breakdown')}
              className={`px-3 py-1.5 text-sm rounded-t transition-colors ${
                view === 'breakdown'
                  ? 'bg-stone-700 text-stone-100 font-medium'
                  : 'text-stone-400 hover:text-stone-300'
              }`}
            >
              By Dish
            </button>
            <button
              type="button"
              onClick={() => setView('shopping')}
              className={`px-3 py-1.5 text-sm rounded-t transition-colors ${
                view === 'shopping'
                  ? 'bg-stone-700 text-stone-100 font-medium'
                  : 'text-stone-400 hover:text-stone-300'
              }`}
            >
              Shopping List
            </button>
          </div>

          {/* Content */}
          {view === 'breakdown' ? (
            <DishBreakdownView dishes={result.dishes} guestCount={result.eventGuestCount} />
          ) : (
            <ShoppingListView ingredients={result.consolidatedIngredients} />
          )}
        </>
      )}
    </div>
  )
}

// ============================================
// SUMMARY BAR
// ============================================

function SummaryBar({ result }: { result: MenuScalingResult }) {
  const { totals, eventGuestCount } = result
  return (
    <div className="flex flex-wrap gap-4 bg-stone-800 rounded-lg px-4 py-3">
      <Stat label="Guests" value={eventGuestCount.toString()} />
      <Stat
        label="Est. Food Cost"
        value={
          totals.totalScaledCostCents > 0
            ? `$${(totals.totalScaledCostCents / 100).toFixed(2)}`
            : 'N/A'
        }
      />
      <Stat
        label="Per Guest"
        value={
          totals.costPerGuestCents > 0 ? `$${(totals.costPerGuestCents / 100).toFixed(2)}` : 'N/A'
        }
      />
      <Stat label="Ingredients" value={totals.uniqueIngredientCount.toString()} />
      {totals.missingPriceCount > 0 && (
        <Stat label="Missing Prices" value={totals.missingPriceCount.toString()} warn />
      )}
      {totals.missingYieldCount > 0 && (
        <Stat label="No Yield Data" value={totals.missingYieldCount.toString()} warn />
      )}
      {totals.unlinkedComponentCount > 0 && (
        <Stat label="No Recipe" value={totals.unlinkedComponentCount.toString()} warn />
      )}
    </div>
  )
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="text-center">
      <p className={`text-lg font-bold ${warn ? 'text-amber-400' : 'text-stone-100'}`}>{value}</p>
      <p className="text-xs text-stone-500">{label}</p>
    </div>
  )
}

// ============================================
// DISH BREAKDOWN VIEW
// ============================================

function DishBreakdownView({ dishes, guestCount }: { dishes: ScaledDish[]; guestCount: number }) {
  if (dishes.length === 0) {
    return <p className="text-sm text-stone-500 py-4 text-center">No dishes on this menu yet.</p>
  }

  return (
    <div className="space-y-4">
      {dishes.map((dish) => (
        <Card key={dish.dishId}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                Course {dish.courseNumber}
              </span>
              <span className="font-semibold text-stone-100">{dish.dishName}</span>
            </div>

            {dish.components.length === 0 ? (
              <p className="text-xs text-stone-500">No components.</p>
            ) : (
              <div className="space-y-3">
                {dish.components.map((comp) => (
                  <ComponentScaleCard
                    key={comp.componentId}
                    component={comp}
                    guestCount={guestCount}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ComponentScaleCard({
  component,
  guestCount,
}: {
  component: ScaledComponent
  guestCount: number
}) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="border border-stone-700 rounded-lg p-3 space-y-2">
      {/* Component header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-sm font-medium text-stone-100 hover:text-stone-300 transition-colors"
            >
              {expanded ? '▾' : '▸'} {component.componentName}
            </button>
            <Badge variant="default">{component.componentCategory}</Badge>
            {component.noRecipeLinked && <Badge variant="warning">No recipe linked</Badge>}
            {component.noYieldData && <Badge variant="warning">No yield data</Badge>}
          </div>

          {/* Scaling math explanation */}
          {component.recipeName && (
            <p className="text-xs text-stone-500">
              {component.recipeName}
              {component.recipeYieldQuantity && (
                <>
                  {' '}
                  (yields {component.recipeYieldQuantity}
                  {component.recipeYieldUnit ? ` ${component.recipeYieldUnit}` : ' servings'})
                </>
              )}
              {component.guestMultiplier != null && (
                <>
                  {' '}
                  &times; {formatMultiplier(component.guestMultiplier)}
                  {component.scaleFactor !== 1 && (
                    <> &times; {component.scaleFactor}x scale</>
                  )} = {formatMultiplier(component.totalMultiplier)} batches
                </>
              )}
            </p>
          )}
        </div>

        {/* Portion info */}
        {component.portionQuantity && (
          <span className="text-xs text-stone-400 shrink-0">
            {component.portionQuantity}
            {component.portionUnit ?? ''}/person &times; {guestCount} ={' '}
            {roundDisplay(component.portionQuantity * guestCount)}
            {component.portionUnit ?? ''}
          </span>
        )}
      </div>

      {/* Ingredient table */}
      {expanded && component.scaledIngredients.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-stone-500 border-b border-stone-700">
                <th className="text-left py-1 pr-3 font-medium">Ingredient</th>
                <th className="text-right py-1 px-2 font-medium">Base</th>
                <th className="text-right py-1 px-2 font-medium">Scaled</th>
                <th className="text-left py-1 px-2 font-medium">Unit</th>
                <th className="text-right py-1 pl-2 font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {component.scaledIngredients.map((ing) => (
                <tr
                  key={`${ing.ingredientId}-${ing.unit}`}
                  className="border-b border-stone-800 last:border-0"
                >
                  <td className="py-1.5 pr-3 text-stone-300">
                    {ing.name}
                    {ing.isOptional && <span className="text-stone-600 ml-1">(optional)</span>}
                    {ing.prepNotes && (
                      <span className="text-stone-600 ml-1">- {ing.prepNotes}</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-right text-stone-500 tabular-nums">
                    {roundDisplay(ing.baseQuantity)}
                  </td>
                  <td className="py-1.5 px-2 text-right text-stone-100 font-medium tabular-nums">
                    {roundDisplay(ing.scaledQuantity)}
                  </td>
                  <td className="py-1.5 px-2 text-stone-400">{ing.unit}</td>
                  <td className="py-1.5 pl-2 text-right tabular-nums">
                    {ing.scaledCostCents != null ? (
                      <span className="text-stone-300">
                        ${(ing.scaledCostCents / 100).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-amber-500">--</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {expanded && component.scaledIngredients.length === 0 && !component.noRecipeLinked && (
        <p className="text-xs text-stone-500">No ingredients on this recipe.</p>
      )}
    </div>
  )
}

// ============================================
// SHOPPING LIST VIEW
// ============================================

function ShoppingListView({ ingredients }: { ingredients: ConsolidatedIngredient[] }) {
  if (ingredients.length === 0) {
    return (
      <p className="text-sm text-stone-500 py-4 text-center">
        No ingredients to show. Link recipes to your menu components first.
      </p>
    )
  }

  // Group by store section
  const sections = new Map<string, ConsolidatedIngredient[]>()
  for (const ing of ingredients) {
    const section = ing.category
    const existing = sections.get(section) || []
    existing.push(ing)
    sections.set(section, existing)
  }

  return (
    <div className="space-y-4">
      {[...sections.entries()].map(([section, items]) => (
        <Card key={section}>
          <CardContent className="p-4">
            <h3 className="text-sm font-bold text-stone-300 uppercase tracking-wide mb-2">
              {getStoreSectionLabel(section)}
            </h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-stone-500 border-b border-stone-700">
                  <th className="text-left py-1 pr-3 font-medium">Item</th>
                  <th className="text-right py-1 px-2 font-medium">Qty</th>
                  <th className="text-left py-1 px-2 font-medium">Unit</th>
                  <th className="text-right py-1 px-2 font-medium">Cost</th>
                  <th className="text-left py-1 pl-2 font-medium">Used In</th>
                </tr>
              </thead>
              <tbody>
                {items.map((ing) => (
                  <tr
                    key={`${ing.ingredientId}-${ing.unit}`}
                    className="border-b border-stone-800 last:border-0"
                  >
                    <td className="py-1.5 pr-3 text-stone-200 font-medium">{ing.name}</td>
                    <td className="py-1.5 px-2 text-right text-stone-100 font-bold tabular-nums">
                      {roundDisplay(ing.totalQuantity)}
                    </td>
                    <td className="py-1.5 px-2 text-stone-400">{ing.unit}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      {ing.totalCostCents != null ? (
                        <span className="text-stone-300">
                          ${(ing.totalCostCents / 100).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-amber-500">--</span>
                      )}
                    </td>
                    <td className="py-1.5 pl-2 text-stone-500">{ing.usedIn.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ============================================
// DISPLAY HELPERS
// ============================================

function formatMultiplier(n: number): string {
  if (Number.isInteger(n)) return n.toString()
  return n.toFixed(1)
}

function roundDisplay(n: number): string {
  if (n < 10) return (Math.round(n * 100) / 100).toString()
  if (n < 100) return (Math.round(n * 10) / 10).toString()
  return Math.round(n).toString()
}

export default MenuScalingPanel

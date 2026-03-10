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
import { calculatePortions, type PortionCalculation } from '@/lib/scaling/portioning'
import {
  generatePrepTimeline,
  type PrepTimeline,
  type DayGroup,
  type PrepTask,
} from '@/lib/scaling/prep-timeline'
import {
  checkMenuAllergens,
  type AllergenCheckResult,
  type DietaryConflict,
} from '@/lib/scaling/allergen-check'

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
  const [view, setView] = useState<
    'breakdown' | 'shopping' | 'portions' | 'timeline' | 'allergens'
  >('breakdown')
  const [portions, setPortions] = useState<PortionCalculation[] | null>(null)
  const [timeline, setTimeline] = useState<PrepTimeline | null>(null)
  const [allergens, setAllergens] = useState<AllergenCheckResult | null>(null)
  const [timelinePending, startTimelineTransition] = useTransition()
  const [allergenPending, startAllergenTransition] = useTransition()

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
        // Also compute portions (pure client-side math)
        setPortions(calculatePortions(count))
      } catch (err: any) {
        setError(err.message || 'Failed to scale menu')
      }
    })
    // Fire off timeline and allergen checks in parallel
    startTimelineTransition(async () => {
      try {
        const tl = await generatePrepTimeline(menuId)
        setTimeline(tl)
      } catch {
        // Non-blocking: timeline is supplementary
      }
    })
    startAllergenTransition(async () => {
      try {
        const ac = await checkMenuAllergens(menuId)
        setAllergens(ac)
      } catch {
        // Non-blocking
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
          <div className="flex gap-1 border-b border-stone-700 pb-1 flex-wrap">
            {(
              [
                ['breakdown', 'By Dish'],
                ['shopping', 'Shopping List'],
                ['portions', 'Portions Guide'],
                ['timeline', 'Prep Timeline'],
                ['allergens', 'Allergens'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                className={`px-3 py-1.5 text-sm rounded-t transition-colors ${
                  view === key
                    ? 'bg-stone-700 text-stone-100 font-medium'
                    : 'text-stone-400 hover:text-stone-300'
                }`}
              >
                {label}
                {key === 'allergens' && allergens?.hasConflicts && (
                  <span className="ml-1 inline-block w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          {view === 'breakdown' && (
            <DishBreakdownView dishes={result.dishes} guestCount={result.eventGuestCount} />
          )}
          {view === 'shopping' && <ShoppingListView ingredients={result.consolidatedIngredients} />}
          {view === 'portions' && portions && (
            <PortionsGuideView portions={portions} guestCount={result.eventGuestCount} />
          )}
          {view === 'timeline' &&
            (timelinePending ? (
              <p className="text-sm text-stone-500 py-4 text-center">Loading prep timeline...</p>
            ) : timeline ? (
              <PrepTimelineView timeline={timeline} />
            ) : (
              <p className="text-sm text-stone-500 py-4 text-center">
                No prep timeline data. Add prep/cook times to your recipes.
              </p>
            ))}
          {view === 'allergens' &&
            (allergenPending ? (
              <p className="text-sm text-stone-500 py-4 text-center">Checking allergens...</p>
            ) : allergens ? (
              <AllergenCheckView result={allergens} />
            ) : (
              <p className="text-sm text-stone-500 py-4 text-center">No allergen data available.</p>
            ))}
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
// PORTIONS GUIDE VIEW
// ============================================

function PortionsGuideView({
  portions,
  guestCount,
}: {
  portions: PortionCalculation[]
  guestCount: number
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-stone-500">
        Industry-standard catering portions for {guestCount} guests. Use as a reference when
        building your menu.
      </p>
      <Card>
        <CardContent className="p-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-stone-500 border-b border-stone-700">
                <th className="text-left py-1 pr-3 font-medium">Category</th>
                <th className="text-right py-1 px-2 font-medium">Per Person</th>
                <th className="text-right py-1 px-2 font-medium">Total ({guestCount})</th>
                <th className="text-left py-1 pl-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {portions.map((p) => (
                <tr key={p.category} className="border-b border-stone-800 last:border-0">
                  <td className="py-2 pr-3 text-stone-200 font-medium">{p.label}</td>
                  <td className="py-2 px-2 text-right text-stone-400 tabular-nums">
                    {p.perPersonDisplay}
                  </td>
                  <td className="py-2 px-2 text-right text-stone-100 font-bold tabular-nums">
                    {p.totalDisplay}
                  </td>
                  <td className="py-2 pl-3 text-stone-500">{p.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================
// PREP TIMELINE VIEW
// ============================================

function PrepTimelineView({ timeline }: { timeline: PrepTimeline }) {
  if (timeline.tasks.length === 0) {
    return (
      <p className="text-sm text-stone-500 py-4 text-center">
        No tasks with timing data. Add prep/cook times to your recipes and set prep day offsets on
        components.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap gap-4 bg-stone-800 rounded-lg px-4 py-3">
        <Stat label="Total Prep" value={`${timeline.totalPrepMinutes} min`} />
        <Stat label="Total Cook" value={`${timeline.totalCookMinutes} min`} />
        <Stat label="Tasks" value={timeline.tasks.length.toString()} />
        <Stat label="Start By" value={formatTimeDisplay(timeline.earliestStart)} />
        <Stat label="Serve" value={formatTimeDisplay(timeline.serveTime)} />
      </div>

      {/* Day groups */}
      {timeline.dayGroups.map((group) => (
        <Card key={group.dayOffset}>
          <CardContent className="p-4 space-y-2">
            <h3 className="text-sm font-bold text-stone-300 uppercase tracking-wide">
              {group.dayLabel}
            </h3>
            <div className="space-y-1">
              {group.tasks.map((task) => (
                <div
                  key={task.componentId}
                  className="flex items-start gap-3 py-2 border-b border-stone-800 last:border-0"
                >
                  {/* Time */}
                  <div className="w-28 shrink-0 text-right">
                    <span className="text-xs font-medium text-stone-100 tabular-nums">
                      {task.startLabel}
                    </span>
                    <span className="text-xs text-stone-600 mx-1">-</span>
                    <span className="text-xs text-stone-400 tabular-nums">{task.endLabel}</span>
                  </div>

                  {/* Task info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-stone-100">{task.componentName}</span>
                      <span className="text-xs text-stone-500">({task.dishName})</span>
                      {task.isMakeAhead && <Badge variant="info">Make-ahead</Badge>}
                      {task.prepStation && <Badge variant="default">{task.prepStation}</Badge>}
                    </div>
                    <div className="flex gap-3 mt-0.5">
                      {task.prepMinutes > 0 && (
                        <span className="text-xs text-stone-500">Prep: {task.prepMinutes} min</span>
                      )}
                      {task.cookMinutes > 0 && (
                        <span className="text-xs text-stone-500">Cook: {task.cookMinutes} min</span>
                      )}
                    </div>
                    {task.executionNotes && (
                      <p className="text-xs text-stone-600 mt-0.5">{task.executionNotes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function formatTimeDisplay(date: Date): string {
  const h = date.getHours()
  const m = date.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return m === 0 ? `${hour12} ${ampm}` : `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`
}

// ============================================
// ALLERGEN CHECK VIEW
// ============================================

function AllergenCheckView({ result }: { result: AllergenCheckResult }) {
  return (
    <div className="space-y-4">
      {/* Guest dietary info */}
      {result.guestDietary && (
        <div className="bg-stone-800 rounded-lg px-4 py-3 space-y-1">
          <p className="text-sm font-medium text-stone-200">
            Client: {result.guestDietary.clientName ?? 'Unknown'}
          </p>
          {result.guestDietary.restrictions && (
            <p className="text-xs text-stone-400">Dietary: {result.guestDietary.restrictions}</p>
          )}
          {result.guestDietary.allergies && (
            <p className="text-xs text-stone-400">Allergies: {result.guestDietary.allergies}</p>
          )}
        </div>
      )}

      {/* Conflicts */}
      {result.conflicts.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-bold text-red-400 uppercase tracking-wide">
              Conflicts Found ({result.conflictCount})
            </h3>
            {result.conflicts.map((conflict, i) => (
              <div
                key={`${conflict.allergen}-${i}`}
                className={`rounded-lg p-3 space-y-1 ${
                  conflict.severity === 'critical'
                    ? 'bg-red-950 border border-red-800'
                    : 'bg-amber-950 border border-amber-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Badge variant={conflict.severity === 'critical' ? 'error' : 'warning'}>
                    {conflict.severity}
                  </Badge>
                  <span className="text-sm text-stone-100 font-medium">{conflict.restriction}</span>
                </div>
                <p className="text-xs text-stone-400">
                  Menu contains{' '}
                  <span className="text-stone-200 font-medium">{conflict.allergen}</span> in:
                </p>
                <ul className="text-xs text-stone-400 ml-4 list-disc">
                  {conflict.sources.map((src, j) => (
                    <li key={j}>
                      {src.dishName} / {src.componentName}
                      {src.ingredientName && (
                        <span className="text-stone-500"> ({src.ingredientName})</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No conflicts */}
      {result.conflicts.length === 0 && result.guestDietary && (
        <div className="bg-green-950 border border-green-800 rounded-lg px-4 py-3">
          <p className="text-sm text-green-400 font-medium">No allergen conflicts detected.</p>
          <p className="text-xs text-green-600 mt-1">
            {result.totalAllergensInMenu} allergen(s) present in menu, none conflict with client
            restrictions.
          </p>
        </div>
      )}

      {!result.guestDietary && (
        <div className="bg-stone-800 rounded-lg px-4 py-3">
          <p className="text-sm text-stone-400">
            No client dietary info on file. Link this menu to an event with a client to check for
            conflicts.
          </p>
        </div>
      )}

      {/* All allergens in menu */}
      {result.allAllergens.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-bold text-stone-300 uppercase tracking-wide mb-2">
              All Allergens in Menu
            </h3>
            <div className="flex flex-wrap gap-2">
              {result.allAllergens.map((a) => (
                <div key={a.allergen} className="group relative">
                  <Badge
                    variant={
                      result.conflicts.some((c) => c.allergen === a.allergen) ? 'error' : 'default'
                    }
                  >
                    {a.allergen} ({a.sources.length})
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
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

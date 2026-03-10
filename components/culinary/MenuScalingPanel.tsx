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
import {
  getEventEquipmentChecklist,
  addEquipmentToEvent,
  removeEquipmentFromEvent,
  toggleEquipmentChecked,
  type EquipmentChecklist,
  type EquipmentAssignment,
} from '@/lib/scaling/equipment-checklist'
import {
  getShareableMenuInfo,
  createShareLink,
  updateShareSettings,
  revokeShareLink,
  type ShareableMenuInfo,
} from '@/lib/scaling/shareable-menu'
import {
  compareVendorsForMenu,
  type VendorComparisonResult,
  type IngredientVendorComparison,
} from '@/lib/scaling/vendor-comparison'
import {
  getEventWasteSummary,
  addLeftoverDetail,
  removeLeftoverDetail,
  type EventWasteSummary,
  type LeftoverDetail,
} from '@/lib/scaling/waste-tracking'
import {
  getTransportPlan,
  type TransportPlan,
  type TravelLeg,
  type LoadEstimate,
} from '@/lib/scaling/transport-planner'

// ============================================
// MAIN PANEL
// ============================================

export function MenuScalingPanel({
  menuId,
  eventId,
  initialGuestCount,
}: {
  menuId: string
  eventId?: string | null
  initialGuestCount: number | null
}) {
  const [guestCount, setGuestCount] = useState(initialGuestCount?.toString() ?? '')
  const [result, setResult] = useState<MenuScalingResult | null>(null)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  type ViewTab =
    | 'breakdown'
    | 'shopping'
    | 'portions'
    | 'timeline'
    | 'allergens'
    | 'equipment'
    | 'share'
    | 'vendors'
    | 'waste'
    | 'transport'
  const [view, setView] = useState<ViewTab>('breakdown')
  const [portions, setPortions] = useState<PortionCalculation[] | null>(null)
  const [timeline, setTimeline] = useState<PrepTimeline | null>(null)
  const [allergens, setAllergens] = useState<AllergenCheckResult | null>(null)
  const [timelinePending, startTimelineTransition] = useTransition()
  const [allergenPending, startAllergenTransition] = useTransition()

  // Phase 3 state
  const [equipment, setEquipment] = useState<EquipmentChecklist | null>(null)
  const [shareInfo, setShareInfo] = useState<ShareableMenuInfo | null>(null)
  const [vendors, setVendors] = useState<VendorComparisonResult | null>(null)
  const [waste, setWaste] = useState<EventWasteSummary | null>(null)
  const [transport, setTransport] = useState<TransportPlan | null>(null)
  const [phase3Pending, startPhase3Transition] = useTransition()

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
    // Phase 3: load equipment, share info, vendors, waste, transport
    startPhase3Transition(async () => {
      try {
        const [vendorData, shareData] = await Promise.all([
          compareVendorsForMenu(menuId),
          getShareableMenuInfo(menuId),
        ])
        setVendors(vendorData)
        setShareInfo(shareData)

        if (eventId) {
          const [equipData, wasteData, transportData] = await Promise.all([
            getEventEquipmentChecklist(eventId),
            getEventWasteSummary(eventId),
            getTransportPlan(eventId),
          ])
          setEquipment(equipData)
          setWaste(wasteData)
          setTransport(transportData)
        }
      } catch {
        // Non-blocking: phase 3 features are supplementary
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
          {/* Tab rows */}
          <div className="space-y-0.5">
            {/* Row 1: Scaling tabs */}
            <div className="flex gap-1 flex-wrap">
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
            {/* Row 2: Operations tabs */}
            <div className="flex gap-1 border-b border-stone-700 pb-1 flex-wrap">
              {(
                [
                  ['equipment', 'Equipment'],
                  ['vendors', 'Vendors'],
                  ['share', 'Share Menu'],
                  ['waste', 'Waste Log'],
                  ['transport', 'Transport'],
                ] as [ViewTab, string][]
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
                  {key === 'equipment' &&
                    equipment &&
                    equipment.allChecked &&
                    equipment.totalItems > 0 && (
                      <span className="ml-1 inline-block w-2 h-2 bg-green-500 rounded-full" />
                    )}
                </button>
              ))}
            </div>
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

          {/* Phase 3 views */}
          {view === 'equipment' &&
            (phase3Pending ? (
              <p className="text-sm text-stone-500 py-4 text-center">Loading equipment...</p>
            ) : !eventId ? (
              <p className="text-sm text-stone-500 py-4 text-center">
                Link this menu to an event to use the equipment checklist.
              </p>
            ) : equipment ? (
              <EquipmentChecklistView
                checklist={equipment}
                eventId={eventId}
                onRefresh={async () => {
                  const data = await getEventEquipmentChecklist(eventId)
                  setEquipment(data)
                }}
              />
            ) : (
              <p className="text-sm text-stone-500 py-4 text-center">No equipment data.</p>
            ))}

          {view === 'vendors' &&
            (phase3Pending ? (
              <p className="text-sm text-stone-500 py-4 text-center">Loading vendor data...</p>
            ) : vendors ? (
              <VendorComparisonView result={vendors} />
            ) : (
              <p className="text-sm text-stone-500 py-4 text-center">No vendor data available.</p>
            ))}

          {view === 'share' &&
            (phase3Pending ? (
              <p className="text-sm text-stone-500 py-4 text-center">Loading share info...</p>
            ) : (
              <ShareMenuView
                info={shareInfo}
                menuId={menuId}
                onRefresh={async () => {
                  const data = await getShareableMenuInfo(menuId)
                  setShareInfo(data)
                }}
              />
            ))}

          {view === 'waste' &&
            (phase3Pending ? (
              <p className="text-sm text-stone-500 py-4 text-center">Loading waste data...</p>
            ) : !eventId ? (
              <p className="text-sm text-stone-500 py-4 text-center">
                Link this menu to an event to track leftovers.
              </p>
            ) : waste ? (
              <WasteTrackingView
                summary={waste}
                eventId={eventId}
                onRefresh={async () => {
                  const data = await getEventWasteSummary(eventId)
                  setWaste(data)
                }}
              />
            ) : (
              <p className="text-sm text-stone-500 py-4 text-center">No waste data.</p>
            ))}

          {view === 'transport' &&
            (phase3Pending ? (
              <p className="text-sm text-stone-500 py-4 text-center">Loading transport plan...</p>
            ) : !eventId ? (
              <p className="text-sm text-stone-500 py-4 text-center">
                Link this menu to an event to see the transport plan.
              </p>
            ) : transport ? (
              <TransportPlanView plan={transport} />
            ) : (
              <p className="text-sm text-stone-500 py-4 text-center">No transport data.</p>
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
// EQUIPMENT CHECKLIST VIEW
// ============================================

function EquipmentChecklistView({
  checklist,
  eventId,
  onRefresh,
}: {
  checklist: EquipmentChecklist
  eventId: string
  onRefresh: () => Promise<void>
}) {
  const [addingCustom, setAddingCustom] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customQty, setCustomQty] = useState('1')
  const [actionPending, startActionTransition] = useTransition()

  const handleAddFromInventory = (itemId: string) => {
    startActionTransition(async () => {
      const res = await addEquipmentToEvent(eventId, { equipmentItemId: itemId })
      if (res.success) await onRefresh()
    })
  }

  const handleAddCustom = () => {
    if (!customName.trim()) return
    startActionTransition(async () => {
      const res = await addEquipmentToEvent(eventId, {
        customName: customName.trim(),
        quantity: parseInt(customQty) || 1,
      })
      if (res.success) {
        setCustomName('')
        setCustomQty('1')
        setAddingCustom(false)
        await onRefresh()
      }
    })
  }

  const handleToggle = (id: string, checked: boolean) => {
    startActionTransition(async () => {
      await toggleEquipmentChecked(id, checked)
      await onRefresh()
    })
  }

  const handleRemove = (id: string) => {
    startActionTransition(async () => {
      await removeEquipmentFromEvent(id)
      await onRefresh()
    })
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-3 bg-stone-800 rounded-lg px-4 py-3">
        <Stat label="Total Items" value={checklist.totalItems.toString()} />
        <Stat label="Packed" value={checklist.checkedCount.toString()} />
        {checklist.allChecked && checklist.totalItems > 0 && (
          <Badge variant="success">All Packed</Badge>
        )}
      </div>

      {/* Current assignments */}
      {checklist.assignments.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-1">
            {checklist.assignments.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 py-2 border-b border-stone-800 last:border-0"
              >
                <input
                  type="checkbox"
                  checked={a.checkedOff}
                  onChange={(e) => handleToggle(a.id, e.target.checked)}
                  disabled={actionPending}
                  title={`Mark ${a.equipmentName} as packed`}
                  className="w-4 h-4 rounded border-stone-600 bg-stone-700 accent-green-500"
                />
                <div className="flex-1 min-w-0">
                  <span
                    className={`text-sm ${a.checkedOff ? 'text-stone-500 line-through' : 'text-stone-200'}`}
                  >
                    {a.equipmentName}
                  </span>
                  {a.quantity > 1 && (
                    <span className="text-xs text-stone-500 ml-1">x{a.quantity}</span>
                  )}
                  <Badge variant="default" className="ml-2 text-[10px]">
                    {a.category}
                  </Badge>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(a.id)}
                  disabled={actionPending}
                  className="text-xs text-stone-600 hover:text-red-400 transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Add from inventory */}
      {checklist.suggestedItems.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <h3 className="text-sm font-bold text-stone-300 uppercase tracking-wide">
              Add from Inventory
            </h3>
            <div className="flex flex-wrap gap-2">
              {checklist.suggestedItems.slice(0, 20).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleAddFromInventory(item.id)}
                  disabled={actionPending}
                  className="text-xs bg-stone-700 hover:bg-stone-600 text-stone-300 px-2 py-1 rounded transition-colors"
                >
                  + {item.name}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add custom item */}
      {addingCustom ? (
        <div className="flex items-end gap-2">
          <div>
            <label className="block text-xs text-stone-500 mb-1">Item name</label>
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Disposable plates"
              className="text-sm w-48"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">Qty</label>
            <Input
              type="number"
              value={customQty}
              onChange={(e) => setCustomQty(e.target.value)}
              min="1"
              className="text-sm w-16"
            />
          </div>
          <Button variant="primary" size="sm" onClick={handleAddCustom} disabled={actionPending}>
            Add
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setAddingCustom(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setAddingCustom(true)}>
          + Add Custom Item
        </Button>
      )}
    </div>
  )
}

// ============================================
// SHARE MENU VIEW
// ============================================

function ShareMenuView({
  info,
  menuId,
  onRefresh,
}: {
  info: ShareableMenuInfo | null
  menuId: string
  onRefresh: () => Promise<void>
}) {
  const [actionPending, startActionTransition] = useTransition()
  const [copied, setCopied] = useState(false)

  if (!info) {
    return (
      <div className="bg-stone-800 rounded-lg px-4 py-3">
        <p className="text-sm text-stone-400">
          No front-of-house menu generated yet. Generate a FOH menu first from the menu editor, then
          come back here to create a shareable link.
        </p>
      </div>
    )
  }

  const handleCreate = () => {
    startActionTransition(async () => {
      await createShareLink(info.fohMenuId, { pricingVisible: false, expiresInDays: 30 })
      await onRefresh()
    })
  }

  const handleRevoke = () => {
    startActionTransition(async () => {
      await revokeShareLink(info.fohMenuId)
      await onRefresh()
    })
  }

  const handleTogglePricing = (visible: boolean) => {
    startActionTransition(async () => {
      await updateShareSettings(info.fohMenuId, { pricingVisible: visible })
      await onRefresh()
    })
  }

  const handleCopy = () => {
    if (info.shareUrl) {
      navigator.clipboard.writeText(`${window.location.origin}${info.shareUrl}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-stone-800 rounded-lg px-4 py-3 space-y-2">
        <p className="text-sm text-stone-200 font-medium">{info.menuName}</p>

        {info.shareToken ? (
          <>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-stone-900 text-stone-300 px-2 py-1 rounded flex-1 truncate">
                {typeof window !== 'undefined'
                  ? `${window.location.origin}${info.shareUrl}`
                  : info.shareUrl}
              </code>
              <Button variant="ghost" size="sm" onClick={handleCopy} disabled={actionPending}>
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>

            {info.isExpired && <p className="text-xs text-red-400">This link has expired.</p>}
            {info.shareExpiresAt && !info.isExpired && (
              <p className="text-xs text-stone-500">
                Expires: {new Date(info.shareExpiresAt).toLocaleDateString()}
              </p>
            )}

            <div className="flex items-center gap-3 pt-1">
              <label className="flex items-center gap-2 text-xs text-stone-400">
                <input
                  type="checkbox"
                  checked={info.pricingVisible}
                  onChange={(e) => handleTogglePricing(e.target.checked)}
                  disabled={actionPending}
                  className="w-3.5 h-3.5 rounded border-stone-600 bg-stone-700 accent-green-500"
                />
                Show pricing to client
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRevoke}
                disabled={actionPending}
                className="text-red-400 hover:text-red-300"
              >
                Revoke Link
              </Button>
            </div>
          </>
        ) : (
          <Button variant="primary" size="sm" onClick={handleCreate} disabled={actionPending}>
            {actionPending ? 'Creating...' : 'Create Share Link'}
          </Button>
        )}
      </div>

      {/* Preview note */}
      <p className="text-xs text-stone-500">
        The shared link shows the front-of-house version of your menu. Clients don't need an account
        to view it.
      </p>
    </div>
  )
}

// ============================================
// VENDOR COMPARISON VIEW
// ============================================

function VendorComparisonView({ result }: { result: VendorComparisonResult }) {
  if (result.totalIngredients === 0) {
    return (
      <p className="text-sm text-stone-500 py-4 text-center">
        No ingredients found. Link recipes to your menu components first.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap gap-4 bg-stone-800 rounded-lg px-4 py-3">
        <Stat label="Ingredients" value={result.totalIngredients.toString()} />
        <Stat label="With Pricing" value={result.ingredientsWithPricing.toString()} />
        <Stat
          label="No Pricing"
          value={result.ingredientsWithoutPricing.toString()}
          warn={result.ingredientsWithoutPricing > 0}
        />
        <Stat label="Vendors" value={result.vendorsUsed.length.toString()} />
        {result.potentialSavingsCents > 0 && (
          <Stat
            label="Potential Savings"
            value={`$${(result.potentialSavingsCents / 100).toFixed(2)}`}
          />
        )}
      </div>

      {/* Vendors used */}
      {result.vendorsUsed.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {result.vendorsUsed.map((v) => (
            <Badge key={v.id} variant="default">
              {v.name} ({v.itemCount} items)
            </Badge>
          ))}
        </div>
      )}

      {/* Ingredient comparison table */}
      <Card>
        <CardContent className="p-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-stone-500 border-b border-stone-700">
                <th className="text-left py-1 pr-3 font-medium">Ingredient</th>
                <th className="text-right py-1 px-2 font-medium">Best Price</th>
                <th className="text-left py-1 px-2 font-medium">Vendor</th>
                <th className="text-right py-1 px-2 font-medium">Avg</th>
                <th className="text-right py-1 px-2 font-medium">Range</th>
                <th className="text-right py-1 pl-2 font-medium">Sources</th>
              </tr>
            </thead>
            <tbody>
              {result.ingredients.map((ing) => (
                <tr key={ing.ingredientId} className="border-b border-stone-800 last:border-0">
                  <td className="py-1.5 pr-3 text-stone-200 font-medium">{ing.ingredientName}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums">
                    {ing.bestPrice ? (
                      <span className="text-green-400">
                        ${(ing.bestPrice.priceCents / 100).toFixed(2)}/{ing.bestPrice.unit}
                      </span>
                    ) : (
                      <span className="text-stone-600">--</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-stone-400">
                    {ing.bestPrice?.vendorName ?? '--'}
                    {ing.bestPrice?.isPreferred && (
                      <span className="text-yellow-500 ml-1" title="Preferred vendor">
                        ★
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-right text-stone-500 tabular-nums">
                    {ing.averagePriceCents > 0
                      ? `$${(ing.averagePriceCents / 100).toFixed(2)}`
                      : '--'}
                  </td>
                  <td className="py-1.5 px-2 text-right text-stone-500 tabular-nums">
                    {ing.vendorCount > 1
                      ? `$${(ing.lowestPriceCents / 100).toFixed(2)} - $${(ing.highestPriceCents / 100).toFixed(2)}`
                      : '--'}
                  </td>
                  <td className="py-1.5 pl-2 text-right text-stone-500">{ing.vendorCount}</td>
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
// WASTE TRACKING VIEW
// ============================================

function WasteTrackingView({
  summary,
  eventId,
  onRefresh,
}: {
  summary: EventWasteSummary
  eventId: string
  onRefresh: () => Promise<void>
}) {
  const [adding, setAdding] = useState(false)
  const [itemName, setItemName] = useState('')
  const [qty, setQty] = useState('')
  const [unit, setUnit] = useState('oz')
  const [origQty, setOrigQty] = useState('')
  const [disposition, setDisposition] = useState('discarded')
  const [actionPending, startActionTransition] = useTransition()

  const handleAdd = () => {
    if (!itemName.trim() || !qty) return
    startActionTransition(async () => {
      const res = await addLeftoverDetail(eventId, {
        itemName: itemName.trim(),
        quantityLeftover: parseFloat(qty),
        unit,
        originalQuantity: origQty ? parseFloat(origQty) : undefined,
        disposition,
      })
      if (res.success) {
        setItemName('')
        setQty('')
        setOrigQty('')
        setAdding(false)
        await onRefresh()
      }
    })
  }

  const handleRemove = (id: string) => {
    startActionTransition(async () => {
      await removeLeftoverDetail(id)
      await onRefresh()
    })
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="flex flex-wrap gap-4 bg-stone-800 rounded-lg px-4 py-3">
        <Stat label="Items Logged" value={summary.totalItems.toString()} />
        {summary.averageWastePercent !== null && (
          <Stat
            label="Avg Waste %"
            value={`${summary.averageWastePercent}%`}
            warn={summary.averageWastePercent > 20}
          />
        )}
        {summary.dispositionBreakdown.map((d) => (
          <Stat key={d.disposition} label={d.disposition} value={d.count.toString()} />
        ))}
      </div>

      {/* Leftover entries */}
      {summary.leftovers.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-stone-500 border-b border-stone-700">
                  <th className="text-left py-1 pr-3 font-medium">Item</th>
                  <th className="text-right py-1 px-2 font-medium">Leftover</th>
                  <th className="text-right py-1 px-2 font-medium">Original</th>
                  <th className="text-right py-1 px-2 font-medium">Waste %</th>
                  <th className="text-left py-1 px-2 font-medium">Disposition</th>
                  <th className="text-right py-1 pl-2 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.leftovers.map((l) => (
                  <tr key={l.id} className="border-b border-stone-800 last:border-0">
                    <td className="py-1.5 pr-3 text-stone-200">{l.itemName}</td>
                    <td className="py-1.5 px-2 text-right text-stone-100 tabular-nums">
                      {l.quantityLeftover} {l.unit}
                    </td>
                    <td className="py-1.5 px-2 text-right text-stone-500 tabular-nums">
                      {l.originalQuantity ? `${l.originalQuantity} ${l.unit}` : '--'}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      {l.wastePercent !== null ? (
                        <span className={l.wastePercent > 20 ? 'text-amber-400' : 'text-stone-400'}>
                          {l.wastePercent}%
                        </span>
                      ) : (
                        <span className="text-stone-600">--</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2">
                      <Badge
                        variant={
                          l.disposition === 'donated' || l.disposition === 'repurposed'
                            ? 'success'
                            : l.disposition === 'discarded'
                              ? 'warning'
                              : 'default'
                        }
                      >
                        {l.disposition}
                      </Badge>
                    </td>
                    <td className="py-1.5 pl-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemove(l.id)}
                        disabled={actionPending}
                        className="text-xs text-stone-600 hover:text-red-400"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Add leftover form */}
      {adding ? (
        <div className="bg-stone-800 rounded-lg p-4 space-y-3">
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="block text-xs text-stone-500 mb-1">Item</label>
              <Input
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Brie"
                className="text-sm w-36"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Leftover</label>
              <Input
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="2"
                className="text-sm w-20"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Unit</label>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="oz"
                className="text-sm w-16"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Original qty</label>
              <Input
                type="number"
                value={origQty}
                onChange={(e) => setOrigQty(e.target.value)}
                placeholder="10"
                className="text-sm w-20"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">What happened</label>
              <select
                value={disposition}
                onChange={(e) => setDisposition(e.target.value)}
                title="Leftover disposition"
                className="text-sm bg-stone-700 border border-stone-600 text-stone-300 rounded px-2 py-1.5"
              >
                <option value="discarded">Discarded</option>
                <option value="donated">Donated</option>
                <option value="repurposed">Repurposed</option>
                <option value="carried_forward">Carried Forward</option>
                <option value="staff_meal">Staff Meal</option>
                <option value="composted">Composted</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleAdd} disabled={actionPending}>
              {actionPending ? 'Adding...' : 'Log Leftover'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
          + Log Leftover
        </Button>
      )}
    </div>
  )
}

// ============================================
// TRANSPORT PLAN VIEW
// ============================================

function TransportPlanView({ plan }: { plan: TransportPlan }) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap gap-4 bg-stone-800 rounded-lg px-4 py-3">
        {plan.eventDate && <Stat label="Event Date" value={plan.eventDate} />}
        {plan.serveTime && <Stat label="Serve Time" value={plan.serveTime} />}
        {plan.suggestedDepartureTime && (
          <Stat label="Leave By" value={plan.suggestedDepartureTime} />
        )}
        <Stat label="Drive Time" value={`${plan.totalDriveMinutes} min`} />
        {plan.totalStopMinutes > 0 && (
          <Stat label="Stop Time" value={`${plan.totalStopMinutes} min`} />
        )}
        <Stat label="Routes" value={plan.totalLegs.toString()} />
      </div>

      {/* Load estimate */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <h3 className="text-sm font-bold text-stone-300 uppercase tracking-wide">
            Load Estimate
          </h3>
          <div className="flex flex-wrap gap-4">
            <Stat label="Components" value={plan.loadEstimate.totalComponents.toString()} />
            {plan.loadEstimate.coldItems > 0 && (
              <Stat label="Cold Items" value={plan.loadEstimate.coldItems.toString()} />
            )}
            {plan.loadEstimate.hotItems > 0 && (
              <Stat label="Hot Items" value={plan.loadEstimate.hotItems.toString()} />
            )}
            <Stat label="Room Temp" value={plan.loadEstimate.roomTempItems.toString()} />
            <Stat label="Equipment" value={plan.loadEstimate.equipmentCount.toString()} />
          </div>
          <div className="flex gap-2 mt-2">
            {plan.loadEstimate.needsCoolers && <Badge variant="info">Coolers needed</Badge>}
            {plan.loadEstimate.needsHotHolding && (
              <Badge variant="warning">Hot holding needed</Badge>
            )}
            {plan.loadEstimate.serviceStyle && (
              <Badge variant="default">{plan.loadEstimate.serviceStyle}</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Venue address */}
      {plan.eventAddress && (
        <div className="bg-stone-800 rounded-lg px-4 py-3">
          <p className="text-xs text-stone-500">Venue</p>
          <p className="text-sm text-stone-200">{plan.eventAddress}</p>
        </div>
      )}

      {/* Travel legs */}
      {plan.legs.length > 0 ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-bold text-stone-300 uppercase tracking-wide">
              Travel Legs
            </h3>
            {plan.legs.map((leg) => (
              <div key={leg.id} className="border border-stone-700 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="default">{leg.legType.replace(/_/g, ' ')}</Badge>
                  <Badge
                    variant={
                      leg.status === 'completed'
                        ? 'success'
                        : leg.status === 'in_progress'
                          ? 'info'
                          : 'default'
                    }
                  >
                    {leg.status}
                  </Badge>
                  {leg.totalEstimatedMinutes && (
                    <span className="text-xs text-stone-500">
                      ~{leg.totalEstimatedMinutes} min total
                    </span>
                  )}
                </div>
                <div className="text-xs text-stone-400">
                  {leg.originLabel || leg.originAddress || 'Home'} →{' '}
                  {leg.destinationLabel || leg.destinationAddress || 'Venue'}
                </div>
                {leg.departureTime && (
                  <p className="text-xs text-stone-500">
                    Depart: {leg.departureTime}
                    {leg.estimatedReturnTime && ` | Return: ${leg.estimatedReturnTime}`}
                  </p>
                )}
                {leg.stops.length > 0 && (
                  <div className="mt-1 ml-4 space-y-0.5">
                    {leg.stops.map((stop, i) => (
                      <p key={i} className="text-xs text-stone-500">
                        {stop.order}. {stop.name}
                        {stop.purpose && ` (${stop.purpose})`}
                        {stop.estimatedMinutes > 0 && ` ~${stop.estimatedMinutes} min`}
                      </p>
                    ))}
                  </div>
                )}
                {leg.purposeNotes && (
                  <p className="text-xs text-stone-600 mt-1">{leg.purposeNotes}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <p className="text-xs text-stone-500">
          No travel legs planned yet. Add routes from the event detail page.
        </p>
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

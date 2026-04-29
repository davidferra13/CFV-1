'use client'

// MenuBreakdownPanel - Post-creation analysis view
// Shows course structure, Recipe Bible matches, and cost estimate immediately after a menu is created.
// Formula-based only -- no AI involved. Recipe search and cost fetch run in background (non-blocking).

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  searchRecipesForEditor,
  linkRecipeToEditorDish,
  getEditorMenuCost,
} from '@/lib/menus/editor-actions'

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICE_STYLE_LABELS: Record<string, string> = {
  plated: 'Plated',
  family_style: 'Family Style',
  buffet: 'Buffet',
  cocktail: 'Cocktail',
  tasting_menu: 'Tasting Menu',
  other: 'Other',
}

const DIETARY_TAG_LABELS: Record<string, string> = {
  GF: 'Gluten-Free',
  DF: 'Dairy-Free',
  V: 'Vegetarian',
  VG: 'Vegan',
  NF: 'Nut-Free',
  SF: 'Shellfish-Free',
  EF: 'Egg-Free',
  KO: 'Kosher',
  HA: 'Halal',
}

// ─── Types ────────────────────────────────────────────────────────────────────

type BreakdownDish = {
  id: string
  course_number: number
  course_name: string
  name: string | null
  dietary_tags: string[]
}

type RecipeMatch = {
  dishId: string
  dishName: string
  recipeId: string
  recipeName: string
  linked: boolean
}

type CostData = {
  costPerGuestCents: number | null
  foodCostPercentage: number | null
  hasAllCosts: boolean
} | null

type ReadinessItem = {
  label: string
  ready: boolean
  detail: string
}

type Props = {
  menuId: string
  menuName: string
  sceneType?: string | null
  cuisineType?: string | null
  serviceStyle?: string | null
  guestCount?: number | null
  dishes: BreakdownDish[]
  onOpenEditor: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MenuBreakdownPanel({
  menuId,
  menuName,
  sceneType,
  cuisineType,
  serviceStyle,
  guestCount,
  dishes,
  onOpenEditor,
}: Props) {
  const router = useRouter()
  const [recipeMatches, setRecipeMatches] = useState<RecipeMatch[]>([])
  const [recipeSearchDone, setRecipeSearchDone] = useState(false)
  const [costData, setCostData] = useState<CostData | undefined>(undefined)
  const [costLoading, setCostLoading] = useState(false)

  // Aggregate dietary tags across all dishes
  const allDietaryTags = Array.from(new Set(dishes.flatMap((d) => d.dietary_tags)))

  // Run recipe matching in background after mount
  useEffect(() => {
    if (!dishes.length) {
      setRecipeSearchDone(true)
      return
    }

    const namedDishes = dishes.filter((d) => d.name?.trim())
    if (!namedDishes.length) {
      setRecipeSearchDone(true)
      return
    }

    async function matchRecipes() {
      const matches: RecipeMatch[] = []

      for (const dish of namedDishes) {
        try {
          const results = await searchRecipesForEditor(dish.name!)
          if (results.length > 0) {
            const best = results[0]
            // Auto-link the best match (non-blocking, errors don't surface to UI)
            let linked = false
            try {
              await linkRecipeToEditorDish(dish.id, best.id, best.name)
              linked = true
            } catch {
              // Non-blocking
            }
            matches.push({
              dishId: dish.id,
              dishName: dish.name!,
              recipeId: best.id,
              recipeName: best.name,
              linked,
            })
          }
        } catch {
          // Non-blocking per dish
        }
      }

      setRecipeMatches(matches)
      setRecipeSearchDone(true)

      // Fetch cost after linking is done
      if (matches.some((m) => m.linked)) {
        setCostLoading(true)
        try {
          const cost = await getEditorMenuCost(menuId)
          setCostData(
            cost
              ? {
                  costPerGuestCents: cost.costPerGuestCents,
                  foodCostPercentage: cost.foodCostPercentage,
                  hasAllCosts: cost.hasAllCosts,
                }
              : null
          )
        } catch {
          setCostData(null)
        } finally {
          setCostLoading(false)
        }
      } else {
        setCostData(null)
      }
    }

    void matchRecipes()
  }, [menuId, dishes])

  const tagLine = [
    `${dishes.length}-course`,
    serviceStyle ? SERVICE_STYLE_LABELS[serviceStyle] || serviceStyle : null,
    cuisineType || null,
    sceneType || null,
    guestCount ? `${guestCount} guests` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const namedDishCount = dishes.filter((dish) => dish.name?.trim()).length
  const linkedRecipeCount = recipeMatches.filter((match) => match.linked).length
  const readinessItems: ReadinessItem[] = [
    {
      label: 'Courses named',
      ready: dishes.length > 0 && namedDishCount === dishes.length,
      detail:
        namedDishCount === dishes.length
          ? `${namedDishCount} of ${dishes.length} courses have dish names`
          : `${dishes.length - namedDishCount} course${dishes.length - namedDishCount === 1 ? '' : 's'} still need dish names`,
    },
    {
      label: 'Recipe book linked',
      ready: dishes.length > 0 && linkedRecipeCount === dishes.length,
      detail:
        linkedRecipeCount > 0
          ? `${linkedRecipeCount} of ${dishes.length} courses linked to saved recipes`
          : 'Link saved recipes to unlock prep, costing, and grocery detail',
    },
    {
      label: 'Costing available',
      ready: Boolean(costData && costData.costPerGuestCents != null && costData.hasAllCosts),
      detail: costLoading
        ? 'Costing is still loading'
        : costData?.hasAllCosts
          ? 'Ingredient costs are available for linked recipes'
          : 'Some linked recipes still need priced ingredients',
    },
    {
      label: 'Service context set',
      ready: Boolean(guestCount && serviceStyle),
      detail:
        guestCount && serviceStyle
          ? `${guestCount} guests, ${SERVICE_STYLE_LABELS[serviceStyle] || serviceStyle}`
          : 'Set guest count and service style before production planning',
    },
  ]
  const readyCount = readinessItems.filter((item) => item.ready).length

  function formatCents(cents: number) {
    return `$${(cents / 100).toFixed(2)}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
          <svg
            className="w-4 h-4 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-stone-100">{menuName}</h2>
          <p className="text-sm text-stone-400 mt-0.5">{tagLine}</p>
        </div>
      </div>

      {/* Readiness checklist */}
      <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Menu Readiness
            </h3>
            <p className="text-sm text-stone-300 mt-1">
              {readyCount} of {readinessItems.length} checks ready for production planning.
            </p>
          </div>
          <Badge variant={readyCount === readinessItems.length ? 'success' : 'warning'}>
            {readyCount === readinessItems.length ? 'Ready' : 'Needs Review'}
          </Badge>
        </div>
        <div className="space-y-2">
          {readinessItems.map((item) => (
            <div key={item.label} className="flex items-start gap-2 text-sm">
              <span
                className={`mt-1 h-2 w-2 rounded-full ${item.ready ? 'bg-green-400' : 'bg-amber-400'}`}
                aria-hidden="true"
              />
              <div>
                <p className="text-stone-200">{item.label}</p>
                <p className="text-xs text-stone-500">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Course list */}
      <div>
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
          Courses
        </h3>
        <div className="space-y-1">
          {dishes
            .slice()
            .sort((a, b) => a.course_number - b.course_number)
            .map((dish) => (
              <div
                key={dish.id}
                className="flex items-start gap-3 py-2 border-b border-stone-800 last:border-0"
              >
                <span className="text-xs font-mono text-stone-500 w-6 flex-shrink-0 mt-0.5">
                  {dish.course_number}
                </span>
                <span className="text-xs text-stone-400 w-28 flex-shrink-0">
                  {dish.course_name}
                </span>
                <span className="text-sm text-stone-200 flex-1">
                  {dish.name || <span className="text-stone-600 italic">No dish name</span>}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Recipe Bible section */}
      <div>
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
          Recipe Bible
        </h3>
        {!recipeSearchDone ? (
          <p className="text-sm text-stone-500">Searching your Recipe Bible...</p>
        ) : recipeMatches.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-sm text-green-400">
              {recipeMatches.filter((m) => m.linked).length} recipe
              {recipeMatches.filter((m) => m.linked).length !== 1 ? 's' : ''} matched and pre-linked
            </p>
            {recipeMatches.map((m) => (
              <div key={m.dishId} className="flex items-center gap-2 text-xs text-stone-400">
                <span className="text-stone-600">{m.dishName}</span>
                <span className="text-stone-700">-&gt;</span>
                <span className="text-stone-300">{m.recipeName}</span>
                {m.linked && (
                  <Badge variant="success" className="text-[10px] py-0 px-1.5">
                    linked
                  </Badge>
                )}
              </div>
            ))}
            {dishes.filter((d) => d.name && !recipeMatches.find((m) => m.dishId === d.id)).length >
              0 && (
              <p className="text-xs text-stone-500 mt-1">
                {
                  dishes.filter((d) => d.name && !recipeMatches.find((m) => m.dishId === d.id))
                    .length
                }{' '}
                course
                {dishes.filter((d) => d.name && !recipeMatches.find((m) => m.dishId === d.id))
                  .length !== 1
                  ? 's'
                  : ''}{' '}
                have no recipe match yet. Link them in the editor to unlock costing.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-stone-500">
            No recipe matches found. Link recipes in the editor to unlock ingredient analysis and
            costing.
          </p>
        )}
      </div>

      {/* Cost section */}
      {(recipeMatches.length > 0 || costData !== undefined) && (
        <div>
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
            Food Cost
          </h3>
          {costLoading ? (
            <p className="text-sm text-stone-500">Calculating...</p>
          ) : costData && (costData.costPerGuestCents ?? 0) > 0 ? (
            <div className="flex gap-6">
              {costData.costPerGuestCents != null && (
                <div>
                  <p className="text-xs text-stone-500">Per guest</p>
                  <p className="text-lg font-semibold text-stone-100">
                    {formatCents(costData.costPerGuestCents)}
                  </p>
                </div>
              )}
              {costData.foodCostPercentage != null && (
                <div>
                  <p className="text-xs text-stone-500">Food cost %</p>
                  <p className="text-lg font-semibold text-stone-100">
                    {costData.foodCostPercentage.toFixed(1)}%
                  </p>
                </div>
              )}
              {!costData.hasAllCosts && (
                <p className="text-xs text-stone-500 self-end pb-1">
                  Partial (some ingredients not priced)
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-stone-500">
              Costing unlocked when recipes with priced ingredients are linked.
            </p>
          )}
        </div>
      )}

      {/* Dietary flags */}
      {allDietaryTags.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
            Dietary Flags
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {allDietaryTags.map((tag) => (
              <Badge key={tag} variant="info" className="text-xs">
                {tag} {DIETARY_TAG_LABELS[tag] ? `(${DIETARY_TAG_LABELS[tag]})` : ''}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2 border-t border-stone-800">
        <Button onClick={onOpenEditor}>Open Editor</Button>
        <button
          type="button"
          onClick={() => router.push(`/menus/${menuId}`)}
          className="text-sm text-stone-400 hover:text-stone-200 transition-colors"
        >
          View Menu
        </button>
      </div>
    </div>
  )
}

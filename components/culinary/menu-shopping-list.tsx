'use client'

// MenuShoppingList - auto-generated shopping list from all recipe-linked components in a menu.
// Aggregates ingredients across every course, scales to guest count, groups by category.
// No AI - pure math from recipe_ingredients table.

import { useEffect, useState, useTransition } from 'react'
import {
  getMenuShoppingList,
  type MenuShoppingListResult,
  type ShoppingListItem,
} from '@/lib/menus/actions'
import { Badge } from '@/components/ui/badge'

const CATEGORY_LABELS: Record<string, string> = {
  protein: 'Protein',
  produce: 'Produce',
  dairy: 'Dairy',
  pantry: 'Pantry',
  spice: 'Spices',
  oil: 'Oils',
  alcohol: 'Alcohol',
  baking: 'Baking',
  frozen: 'Frozen',
  canned: 'Canned',
  fresh_herb: 'Fresh Herbs',
  dry_herb: 'Dry Herbs',
  condiment: 'Condiments',
  beverage: 'Beverages',
  specialty: 'Specialty',
  other: 'Other',
}

const CATEGORY_ORDER = [
  'protein',
  'produce',
  'fresh_herb',
  'dairy',
  'pantry',
  'spice',
  'oil',
  'baking',
  'canned',
  'frozen',
  'alcohol',
  'condiment',
  'dry_herb',
  'beverage',
  'specialty',
  'other',
]

function formatQty(qty: number): string {
  if (qty < 0.1) return qty.toFixed(3)
  if (qty < 10) return qty.toFixed(2).replace(/\.?0+$/, '')
  return Math.round(qty).toString()
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function IngredientRow({ item }: { item: ShoppingListItem }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="py-1.5">
      <div
        className="flex items-center justify-between gap-2 cursor-pointer group"
        onClick={() => item.sources.length > 1 && setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {item.sources.length > 1 && (
            <span className="text-stone-500 text-xs shrink-0 w-3">{expanded ? '▾' : '▸'}</span>
          )}
          {item.isOptional && (
            <Badge variant="default" className="text-xs shrink-0">
              opt
            </Badge>
          )}
          <span className="text-sm text-stone-200 truncate">{item.ingredientName}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-right">
          <span className="text-sm font-medium text-stone-100">
            {formatQty(item.totalQuantity)} {item.unit}
          </span>
          {item.hasPricing ? (
            <span className="text-xs text-emerald-400 w-16 text-right">
              {formatCents(item.estimatedCostCents)}
            </span>
          ) : (
            <span className="text-xs text-stone-600 w-16 text-right">no price</span>
          )}
        </div>
      </div>
      {expanded && (
        <div className="ml-5 mt-1 space-y-0.5">
          {item.sources.map((src, i) => (
            <p key={i} className="text-xs text-stone-500">
              {src.dish} / {src.recipeName}: {formatQty(src.scaledQty)} {item.unit}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

function CategorySection({ category, items }: { category: string; items: ShoppingListItem[] }) {
  const label = CATEGORY_LABELS[category] ?? category
  const sectionCost = items.reduce((sum, i) => sum + i.estimatedCostCents, 0)

  return (
    <div>
      <div className="flex items-center justify-between py-1 border-b border-stone-700 mb-1">
        <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
          {label}
        </span>
        {sectionCost > 0 && (
          <span className="text-xs text-stone-500">{formatCents(sectionCost)}</span>
        )}
      </div>
      <div className="divide-y divide-stone-800/60">
        {items.map((item) => (
          <IngredientRow key={item.ingredientId} item={item} />
        ))}
      </div>
    </div>
  )
}

interface MenuShoppingListProps {
  menuId: string
}

export function MenuShoppingList({ menuId }: MenuShoppingListProps) {
  const [result, setResult] = useState<MenuShoppingListResult | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  const load = () => {
    startTransition(async () => {
      try {
        const data = await getMenuShoppingList(menuId)
        setResult(data)
        setLoadError(null)
      } catch (err: any) {
        setLoadError(err.message || 'Could not load shopping list')
      }
    })
  }

  // Load when first opened
  useEffect(() => {
    if (open && !result && !isPending) {
      load()
    }
  }, [open])

  const sortedCategories = result
    ? CATEGORY_ORDER.filter((cat) => result.grouped[cat]).concat(
        Object.keys(result.grouped).filter((cat) => !CATEGORY_ORDER.includes(cat))
      )
    : []

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900/50 overflow-hidden">
      {/* Header / toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-stone-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-stone-200">Shopping List</span>
          {result && result.items.length > 0 && (
            <Badge variant="default">{result.items.length} ingredients</Badge>
          )}
          {result && result.unlinkedComponentCount > 0 && (
            <Badge variant="warning">{result.unlinkedComponentCount} unlinked</Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          {result && result.totalEstimatedCostCents > 0 && (
            <span className="text-sm font-semibold text-emerald-400">
              {formatCents(result.totalEstimatedCostCents)} est.
            </span>
          )}
          <span className="text-stone-400 text-sm">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-stone-700">
          {isPending && (
            <div className="py-6 text-center">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-stone-700 rounded w-3/4 mx-auto" />
                <div className="h-4 bg-stone-700 rounded w-1/2 mx-auto" />
                <div className="h-4 bg-stone-700 rounded w-2/3 mx-auto" />
              </div>
            </div>
          )}

          {loadError && (
            <div className="py-4 text-center">
              <p className="text-sm text-red-400">{loadError}</p>
              <button
                type="button"
                onClick={load}
                className="text-xs text-stone-400 hover:text-stone-300 mt-2 underline"
              >
                Retry
              </button>
            </div>
          )}

          {!isPending && result && result.items.length === 0 && (
            <div className="py-6 text-center text-stone-500 text-sm">
              {result.unlinkedComponentCount > 0 ? (
                <p>
                  {result.unlinkedComponentCount} component
                  {result.unlinkedComponentCount !== 1 ? 's' : ''} have no recipe linked yet. Link
                  recipes to components to generate a shopping list.
                </p>
              ) : (
                <p>Add courses and link components to recipes to generate a shopping list.</p>
              )}
            </div>
          )}

          {!isPending && result && result.items.length > 0 && (
            <>
              {/* Summary bar */}
              <div className="flex items-center justify-between pt-3 text-xs text-stone-500">
                <span>
                  {result.linkedRecipeCount} recipe{result.linkedRecipeCount !== 1 ? 's' : ''}{' '}
                  linked
                  {result.unlinkedComponentCount > 0 && (
                    <span className="text-amber-400 ml-2">
                      + {result.unlinkedComponentCount} component
                      {result.unlinkedComponentCount !== 1 ? 's' : ''} without recipes
                    </span>
                  )}
                </span>
                <span>{result.guestCount} guests</span>
              </div>

              {/* Category sections */}
              <div className="space-y-4">
                {sortedCategories.map((cat) => (
                  <CategorySection key={cat} category={cat} items={result.grouped[cat]} />
                ))}
              </div>

              {/* Totals footer */}
              {result.totalEstimatedCostCents > 0 && (
                <div className="flex items-center justify-between pt-3 border-t border-stone-700 text-sm font-semibold">
                  <span className="text-stone-300">Estimated ingredient cost</span>
                  <span className="text-emerald-400">
                    {formatCents(result.totalEstimatedCostCents)}
                  </span>
                </div>
              )}

              {/* Refresh */}
              <button
                type="button"
                onClick={load}
                disabled={isPending}
                className="text-xs text-stone-500 hover:text-stone-300 underline"
              >
                Refresh
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

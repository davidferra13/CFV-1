'use client'

import { CheckCircle, AlertTriangle, XCircle, HelpCircle } from 'lucide-react'
import Link from 'next/link'
import type { DishEstimate } from '@/lib/menus/estimate-actions'

interface DishEstimateRowProps {
  dish: DishEstimate
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function StatusBadge({ status }: { status: DishEstimate['status'] }) {
  switch (status) {
    case 'costed':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/50 px-2 py-0.5 text-xs text-emerald-400">
          <CheckCircle className="h-3 w-3" />
          Costed
        </span>
      )
    case 'partial':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/50 px-2 py-0.5 text-xs text-amber-400">
          <AlertTriangle className="h-3 w-3" />
          Partial
        </span>
      )
    case 'no_recipe':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-900/50 px-2 py-0.5 text-xs text-red-400">
          <XCircle className="h-3 w-3" />
          Recipe Needed
        </span>
      )
    case 'no_prices':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-stone-700/50 px-2 py-0.5 text-xs text-stone-400">
          <HelpCircle className="h-3 w-3" />
          No Prices
        </span>
      )
  }
}

export function DishEstimateRow({ dish }: DishEstimateRowProps) {
  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-stone-200">{dish.dishName}</span>
            <StatusBadge status={dish.status} />
          </div>

          {/* Matched recipe info */}
          {dish.matchedRecipe && (
            <div className="mt-1">
              <Link
                href={`/recipes/${dish.matchedRecipe.id}`}
                className="text-xs text-teal-400 hover:text-teal-300 hover:underline"
              >
                {dish.matchedRecipe.name}
              </Link>
              {dish.ingredientCount > 0 && (
                <span className="ml-2 text-xs text-stone-500">
                  {dish.pricedIngredientCount}/{dish.ingredientCount} priced
                </span>
              )}
            </div>
          )}

          {/* Missing ingredients */}
          {dish.missingIngredients.length > 0 && (
            <div className="mt-1 text-xs text-amber-500/80">
              Missing prices: {dish.missingIngredients.slice(0, 3).join(', ')}
              {dish.missingIngredients.length > 3 && ` +${dish.missingIngredients.length - 3} more`}
            </div>
          )}

          {/* Create recipe CTA */}
          {dish.status === 'no_recipe' && (
            <div className="mt-2">
              <Link
                href={`/recipes/new?name=${encodeURIComponent(dish.dishName)}`}
                className="inline-flex items-center gap-1 rounded-md bg-teal-600/20 px-2.5 py-1 text-xs font-medium text-teal-400 hover:bg-teal-600/30"
              >
                Create Recipe
              </Link>
            </div>
          )}
        </div>

        {/* Cost */}
        <div className="shrink-0 text-right">
          {dish.costCents !== null ? (
            <>
              <div className="text-sm font-semibold text-stone-200">
                {formatCents(dish.costCents)}
              </div>
              {dish.costPerGuestCents !== null && (
                <div className="text-xs text-stone-500">
                  {formatCents(dish.costPerGuestCents)}/guest
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-stone-600">--</div>
          )}
        </div>
      </div>
    </div>
  )
}

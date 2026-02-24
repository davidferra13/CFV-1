'use client'

// PriceCascadePreview — Shows the impact of updating an ingredient price
// across all affected recipes before the chef confirms the change.

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, TrendingUp, TrendingDown, DollarSign, RefreshCw } from 'lucide-react'
import { cascadeIngredientPrice } from '@/lib/inventory/price-cascade-actions'

type AffectedRecipe = {
  recipeId: string
  recipeName: string
  oldCostCents: number
  newCostCents: number
  deltaCents: number
}

type PriceCascadePreviewProps = {
  preview: {
    affectedRecipes: AffectedRecipe[]
    ingredientId: string
    ingredientName: string
    oldPriceCents: number
    newPriceCents: number
  }
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function DeltaIndicator({ deltaCents }: { deltaCents: number }) {
  if (deltaCents === 0) {
    return <span className="text-stone-400 text-sm">No change</span>
  }
  if (deltaCents > 0) {
    return (
      <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
        <TrendingUp className="h-3.5 w-3.5" />+{formatMoney(deltaCents)}
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
      <TrendingDown className="h-3.5 w-3.5" />
      {formatMoney(deltaCents)}
    </span>
  )
}

export function PriceCascadePreview({ preview }: PriceCascadePreviewProps) {
  const [pending, startTransition] = useTransition()
  const [applied, setApplied] = useState(false)

  const priceDelta = preview.newPriceCents - preview.oldPriceCents
  const priceIncreased = priceDelta > 0

  const totalDelta = preview.affectedRecipes.reduce((sum, r) => sum + r.deltaCents, 0)

  function handleApply() {
    startTransition(async () => {
      await cascadeIngredientPrice(preview.ingredientId, preview.newPriceCents)
      setApplied(true)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-stone-400" />
          Price Cascade Preview
        </CardTitle>
        <div className="mt-3 p-3 rounded-lg bg-stone-800 border border-stone-700">
          <p className="text-sm text-stone-500 mb-1">Ingredient</p>
          <p className="font-semibold text-stone-100 text-lg">{preview.ingredientName}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm text-stone-500">{formatMoney(preview.oldPriceCents)}</span>
            <ArrowRight className="h-4 w-4 text-stone-400" />
            <span
              className={`text-sm font-semibold ${priceIncreased ? 'text-red-600' : 'text-emerald-600'}`}
            >
              {formatMoney(preview.newPriceCents)}
            </span>
            <Badge variant={priceIncreased ? 'error' : 'success'}>
              {priceIncreased ? '+' : ''}
              {formatMoney(priceDelta)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {preview.affectedRecipes.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-stone-400 text-sm">No recipes affected by this price change.</p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="px-6 py-2 bg-stone-800 border-y border-stone-800 grid grid-cols-4 gap-4 text-xs font-medium text-stone-500 uppercase tracking-wide">
              <span>Recipe</span>
              <span className="text-right">Old Cost</span>
              <span className="text-right">New Cost</span>
              <span className="text-right">Delta</span>
            </div>

            {/* Table body */}
            <div className="divide-y divide-stone-800">
              {preview.affectedRecipes.map((recipe) => (
                <div
                  key={recipe.recipeId}
                  className="px-6 py-3 grid grid-cols-4 gap-4 items-center"
                >
                  <span className="text-sm font-medium text-stone-100 truncate">
                    {recipe.recipeName}
                  </span>
                  <span className="text-sm text-stone-500 text-right">
                    {formatMoney(recipe.oldCostCents)}
                  </span>
                  <span className="text-sm text-stone-300 text-right font-medium">
                    {formatMoney(recipe.newCostCents)}
                  </span>
                  <div className="flex justify-end">
                    <DeltaIndicator deltaCents={recipe.deltaCents} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-stone-400" />
          <span className="text-sm text-stone-400">
            Total impact across {preview.affectedRecipes.length} recipe
            {preview.affectedRecipes.length !== 1 ? 's' : ''}:
          </span>
          <span
            className={`text-sm font-bold ${totalDelta > 0 ? 'text-red-600' : totalDelta < 0 ? 'text-emerald-600' : 'text-stone-500'}`}
          >
            {totalDelta > 0 ? '+' : ''}
            {formatMoney(totalDelta)}
          </span>
        </div>
        <Button
          variant={applied ? 'secondary' : 'primary'}
          onClick={handleApply}
          loading={pending}
          disabled={pending || applied || preview.affectedRecipes.length === 0}
        >
          {applied ? 'Applied' : 'Apply Price Change'}
        </Button>
      </CardFooter>
    </Card>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  calculateNutritionalSnapshot,
  type NutritionalSnapshot,
} from '@/lib/recipes/nutritional-calculator-actions'

type DraftIngredient = {
  name: string
  quantity: number
  unit: string
}

type Props = {
  ingredients: DraftIngredient[]
  servings?: number
  onCalculated?: (snapshot: NutritionalSnapshot) => void
  onApplyCalories?: (calories: number) => void
}

export function NutritionalCalculator({
  ingredients,
  servings = 1,
  onCalculated,
  onApplyCalories,
}: Props) {
  const [snapshot, setSnapshot] = useState<NutritionalSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const validIngredients = ingredients.filter(
    (ingredient) => ingredient.name.trim() && ingredient.quantity > 0 && ingredient.unit.trim()
  )

  function runCalculation() {
    if (!validIngredients.length) return
    setError(null)

    startTransition(async () => {
      try {
        const result = await calculateNutritionalSnapshot({
          ingredients: validIngredients,
          servings,
        })
        setSnapshot(result)
        onCalculated?.(result)
      } catch (err: any) {
        setError(err?.message || 'Nutrition lookup failed')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>NutritionalCalculator</CardTitle>
        <p className="text-sm text-stone-500">
          USDA-powered nutrition estimates for total recipe and per-serving macros.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Button onClick={runCalculation} disabled={isPending || validIngredients.length === 0}>
            {isPending ? 'Calculating...' : 'Calculate Nutrition'}
          </Button>
          <span className="text-xs text-stone-500">
            {validIngredients.length} ingredient{validIngredients.length === 1 ? '' : 's'} ·{' '}
            {Math.max(1, servings)} servings
          </span>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {snapshot && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Metric
                label="Calories"
                total={snapshot.totals.calories}
                per={snapshot.perServing.calories}
                unit="kcal"
              />
              <Metric
                label="Protein"
                total={snapshot.totals.protein}
                per={snapshot.perServing.protein}
                unit="g"
              />
              <Metric
                label="Fat"
                total={snapshot.totals.fat}
                per={snapshot.perServing.fat}
                unit="g"
              />
              <Metric
                label="Carbs"
                total={snapshot.totals.carbs}
                per={snapshot.perServing.carbs}
                unit="g"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-stone-500">
              <span>{snapshot.missingIngredientCount} unmatched ingredient(s)</span>
              {onApplyCalories && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onApplyCalories(snapshot.perServing.calories)}
                >
                  Apply Calories/Serving
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Metric({
  label,
  total,
  per,
  unit,
}: {
  label: string
  total: number
  per: number
  unit: string
}) {
  return (
    <div className="rounded-lg border border-stone-700 p-2">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="text-sm font-semibold text-stone-100">
        {per} {unit}/serv
      </p>
      <p className="text-xs text-stone-500">
        Total: {total} {unit}
      </p>
    </div>
  )
}

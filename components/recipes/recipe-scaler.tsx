'use client'

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { getScaledRecipe, type ScaledRecipeResult } from '@/lib/recipes/scaling-actions'
import { type ScalingCategory, getScalingCategoryLabel } from '@/lib/recipes/recipe-scaling'
import { formatScaledQty } from '@/lib/recipes/portion-standards'

// ── Category Colors ────────────────────────────────────────────────────────────

const CATEGORY_BADGE_VARIANT: Record<ScalingCategory, 'info' | 'warning' | 'success' | 'default'> =
  {
    bulk: 'info',
    flavor: 'warning',
    structure: 'success',
    finishing: 'default',
  }

const CATEGORY_BADGE_CLASS: Record<ScalingCategory, string> = {
  bulk: '', // info = sky/blue (built-in)
  flavor: '', // warning = amber (built-in)
  structure: '', // success = emerald/green (built-in)
  finishing: 'bg-purple-950 text-purple-400 ring-purple-800', // custom purple
}

// ── Props ──────────────────────────────────────────────────────────────────────

type Props = {
  recipeId: string
  recipeName: string
  originalYield: number | null
  yieldUnit?: string | null
}

// ── Component ──────────────────────────────────────────────────────────────────

export function RecipeScaler({ recipeId, recipeName, originalYield, yieldUnit }: Props) {
  const [targetServings, setTargetServings] = useState('')
  const [result, setResult] = useState<ScaledRecipeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const baseYield = originalYield ?? 1
  const displayUnit = yieldUnit ?? 'servings'

  const handleScale = () => {
    const target = parseFloat(targetServings)
    if (!target || target <= 0) return

    setError(null)
    startTransition(async () => {
      try {
        const scaled = await getScaledRecipe(recipeId, target)
        setResult(scaled)
      } catch (err) {
        setResult(null)
        setError(err instanceof Error ? err.message : 'Failed to scale recipe')
      }
    })
  }

  const handleCopy = () => {
    if (!result) return

    const lines: string[] = [
      `${recipeName} - Scaled to ${result.targetServings} ${displayUnit}`,
      `Original: ${result.originalYield} ${displayUnit} | Scale factor: ${result.scaling.scaleFactor.toFixed(2)}x`,
      '',
      'INGREDIENTS:',
    ]

    for (const ing of result.scaling.scaledIngredients) {
      const scaled = formatScaledQty(ing.scaledQty)
      const original = formatScaledQty(ing.originalQty)
      lines.push(
        `  ${scaled.padStart(8)} ${ing.unit.padEnd(6)} ${ing.name}  (was ${original} ${ing.unit})`
      )
    }

    if (result.scaling.warnings.length > 0) {
      lines.push('')
      lines.push('NOTES:')
      for (const w of result.scaling.warnings) {
        lines.push(`  * ${w}`)
      }
    }

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scale by Guest Count</CardTitle>
        <p className="text-sm text-stone-500">
          Base yield: {baseYield} {displayUnit}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input row */}
        <div className="flex items-end gap-3">
          <div className="w-40">
            <label className="block text-xs font-semibold text-stone-400 mb-1 uppercase tracking-wide">
              Target {displayUnit}
            </label>
            <Input
              type="number"
              value={targetServings}
              onChange={(e) => setTargetServings(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScale()}
              placeholder={`e.g. ${baseYield * 2}`}
              min="1"
              step="1"
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleScale}
            disabled={isPending || !targetServings || parseFloat(targetServings) <= 0}
          >
            {isPending ? 'Scaling...' : 'Scale'}
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="text-sm text-red-400 bg-red-950 border border-red-800 rounded p-3">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-3">
            {/* Scale factor display */}
            <div className="text-sm text-stone-400">
              Scale factor:{' '}
              <span className="font-semibold text-stone-200">
                {result.scaling.scaleFactor.toFixed(2)}x
              </span>
            </div>

            {/* Warnings */}
            {result.scaling.warnings.map((warning, i) => (
              <div
                key={i}
                className="text-sm text-amber-400 bg-amber-950 border border-amber-800 rounded p-3"
              >
                {warning}
              </div>
            ))}

            {/* Category legend */}
            <div className="flex flex-wrap gap-2">
              {(['bulk', 'flavor', 'structure', 'finishing'] as ScalingCategory[]).map((cat) => (
                <Badge
                  key={cat}
                  variant={CATEGORY_BADGE_VARIANT[cat]}
                  className={CATEGORY_BADGE_CLASS[cat]}
                >
                  {getScalingCategoryLabel(cat)}
                </Badge>
              ))}
            </div>

            {/* Ingredient table */}
            <div className="bg-stone-800 rounded-lg border border-stone-700 overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-[1fr_80px_80px_80px_auto] gap-2 px-4 py-2 text-xs font-semibold text-stone-400 uppercase tracking-wide border-b border-stone-700">
                <span>Ingredient</span>
                <span className="text-right">Original</span>
                <span className="text-right">Scaled</span>
                <span className="text-center">Unit</span>
                <span>Category</span>
              </div>

              {/* Rows */}
              {result.scaling.scaledIngredients.map((ing) => (
                <div
                  key={ing.ingredientId}
                  className="grid grid-cols-[1fr_80px_80px_80px_auto] gap-2 px-4 py-2.5 text-sm border-b border-stone-800 last:border-b-0 hover:bg-stone-750"
                >
                  <span className="text-stone-200 truncate">{ing.name}</span>
                  <span className="text-right text-stone-500 tabular-nums">
                    {formatScaledQty(ing.originalQty)}
                  </span>
                  <span className="text-right text-stone-100 font-semibold tabular-nums">
                    {formatScaledQty(ing.scaledQty)}
                  </span>
                  <span className="text-center text-stone-400 text-xs">{ing.unit}</span>
                  <Badge
                    variant={CATEGORY_BADGE_VARIANT[ing.scalingCategory]}
                    className={`text-[10px] ${CATEGORY_BADGE_CLASS[ing.scalingCategory]}`}
                  >
                    {ing.scalingCategory}
                  </Badge>
                </div>
              ))}

              {result.scaling.scaledIngredients.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-stone-500">
                  No ingredients found for this recipe.
                </div>
              )}
            </div>

            {/* Copy button */}
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" onClick={handleCopy}>
                {copySuccess ? 'Copied!' : 'Copy Scaled Recipe'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

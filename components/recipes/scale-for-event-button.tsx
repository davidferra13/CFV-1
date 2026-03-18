'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
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
  bulk: '',
  flavor: '',
  structure: '',
  finishing: 'bg-purple-950 text-purple-400 ring-purple-800',
}

// ── Props ──────────────────────────────────────────────────────────────────────

type Props = {
  recipeId: string
  eventName: string
  guestCount: number
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ScaleForEventButton({ recipeId, eventName, guestCount }: Props) {
  const [result, setResult] = useState<ScaledRecipeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleScale = () => {
    if (isOpen && result) {
      // Toggle close
      setIsOpen(false)
      return
    }

    setIsOpen(true)
    setError(null)

    startTransition(async () => {
      try {
        const scaled = await getScaledRecipe(recipeId, guestCount)
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
      `${result.recipeName} - Scaled for ${eventName} (${guestCount} guests)`,
      `Original: ${result.originalYield} ${result.yieldUnit} | Scale factor: ${result.scaling.scaleFactor.toFixed(2)}x`,
      '',
      'INGREDIENTS:',
    ]

    for (const ing of result.scaling.scaledIngredients) {
      const scaled = formatScaledQty(ing.scaledQty)
      lines.push(`  ${scaled.padStart(8)} ${ing.unit.padEnd(6)} ${ing.name}`)
    }

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    })
  }

  return (
    <div className="space-y-3">
      <Button
        variant={isOpen ? 'secondary' : 'primary'}
        size="sm"
        onClick={handleScale}
        disabled={isPending}
      >
        {isPending
          ? 'Scaling...'
          : isOpen
            ? 'Close'
            : `Scale for ${eventName} (${guestCount} guests)`}
      </Button>

      {isOpen && error && (
        <div className="text-sm text-red-400 bg-red-950 border border-red-800 rounded p-3">
          {error}
        </div>
      )}

      {isOpen && result && (
        <div className="space-y-3 bg-stone-800 rounded-lg border border-stone-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-200">{result.recipeName}</p>
              <p className="text-xs text-stone-500">
                {result.originalYield} {result.yieldUnit} scaled to {guestCount} guests (
                {result.scaling.scaleFactor.toFixed(2)}x)
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleCopy}>
              {copySuccess ? 'Copied!' : 'Copy'}
            </Button>
          </div>

          {/* Warnings */}
          {result.scaling.warnings.map((warning, i) => (
            <div
              key={i}
              className="text-sm text-amber-400 bg-amber-950 border border-amber-800 rounded p-2"
            >
              {warning}
            </div>
          ))}

          {/* Compact ingredient list */}
          <div className="divide-y divide-stone-700">
            {result.scaling.scaledIngredients.map((ing) => (
              <div
                key={ing.ingredientId}
                className="flex items-center justify-between py-1.5 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-stone-200 truncate">{ing.name}</span>
                  <Badge
                    variant={CATEGORY_BADGE_VARIANT[ing.scalingCategory]}
                    className={`text-xxs shrink-0 ${CATEGORY_BADGE_CLASS[ing.scalingCategory]}`}
                  >
                    {getScalingCategoryLabel(ing.scalingCategory)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="text-stone-500 text-xs tabular-nums">
                    {formatScaledQty(ing.originalQty)}
                  </span>
                  <span className="text-stone-600">&#8594;</span>
                  <span className="text-stone-100 font-semibold tabular-nums">
                    {formatScaledQty(ing.scaledQty)}
                  </span>
                  <span className="text-stone-400 text-xs">{ing.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

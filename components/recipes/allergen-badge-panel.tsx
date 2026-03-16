'use client'

// Allergen Badge Panel - shows allergen, caution, and health label badges for a recipe.
// On-demand: chef clicks "Check Allergens" to trigger Edamam API lookup.
// Results cached in component state so repeat clicks don't re-fetch.
//
// Badge colors:
//   - Red (error): Major allergens (nuts, dairy, gluten, eggs, shellfish, etc.) - SAFETY
//   - Yellow (warning): Cautions (FODMAPs, sulfites, etc.)
//   - Green (success): Positive health labels (Vegan, Vegetarian, Gluten-Free, etc.)

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { detectAllergens } from '@/lib/recipes/allergen-actions'
import type { AllergenResult } from '@/lib/recipes/allergen-actions'

type Props = {
  recipeId: string
  ingredientCount: number
}

// Major allergens that get red badges - these are SAFETY-critical
const MAJOR_ALLERGENS = new Set([
  'Peanuts',
  'Tree Nuts',
  'Dairy',
  'Eggs',
  'Gluten',
  'Wheat',
  'Soy',
  'Fish',
  'Shellfish',
  'Crustaceans',
  'Mollusks',
  'Sesame',
  'Celery',
  'Mustard',
  'Lupine',
  'Sulfites',
])

export function AllergenBadgePanel({ recipeId, ingredientCount }: Props) {
  const [data, setData] = useState<AllergenResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCheck() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await detectAllergens(recipeId)
        setData(result)
      } catch (err: any) {
        setError(err.message || 'Failed to check allergens')
      }
    })
  }

  // Not yet loaded - show trigger button
  if (!data && !error) {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Allergen Detection</CardTitle>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleCheck}
              disabled={isPending || ingredientCount === 0}
            >
              {isPending ? 'Checking...' : 'Check Allergens'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="flex items-center gap-3 py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-600 border-t-brand-500" />
              <p className="text-sm text-stone-400">
                Analyzing {ingredientCount} ingredient{ingredientCount !== 1 ? 's' : ''} for
                allergens...
              </p>
            </div>
          ) : ingredientCount === 0 ? (
            <p className="text-stone-500 text-center py-4">
              Add ingredients to check for allergens.
            </p>
          ) : (
            <p className="text-sm text-stone-500">
              Detect allergens, dietary flags, and cautions using Edamam Nutrition Analysis. Results
              are cached for 30 days.
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Allergen Detection</CardTitle>
            <Button size="sm" variant="secondary" onClick={handleCheck} disabled={isPending}>
              {isPending ? 'Retrying...' : 'Retry'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-400">{error}</p>
        </CardContent>
      </Card>
    )
  }

  // API keys not configured
  if (data && !data.configured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Allergen Detection</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-400">
            Add <code className="px-1.5 py-0.5 bg-stone-800 rounded text-xs">EDAMAM_APP_ID</code>{' '}
            and <code className="px-1.5 py-0.5 bg-stone-800 rounded text-xs">EDAMAM_APP_KEY</code>{' '}
            to your environment variables to enable allergen detection.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Loaded - show results
  const hasAllergens = data!.allergens.length > 0
  const hasCautions = data!.cautions.length > 0
  const hasHealthLabels = data!.healthLabels.length > 0
  const isEmpty = !hasAllergens && !hasCautions && !hasHealthLabels

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <CardTitle>Allergen Detection</CardTitle>
            {hasAllergens && (
              <Badge variant="error">
                {data!.allergens.length} allergen{data!.allergens.length !== 1 ? 's' : ''} found
              </Badge>
            )}
          </div>
          <Button size="sm" variant="secondary" onClick={handleCheck} disabled={isPending}>
            {isPending ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <p className="text-sm text-stone-400 py-2">
            No allergens, cautions, or health labels detected. This could mean the recipe is very
            simple or the ingredients were not recognized.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Allergens - red badges, most prominent */}
            {hasAllergens && (
              <div>
                <p className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                  Contains
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {data!.allergens.map((allergen) => (
                    <Badge
                      key={allergen}
                      variant={MAJOR_ALLERGENS.has(allergen) ? 'error' : 'warning'}
                    >
                      {allergen}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Cautions - yellow badges */}
            {hasCautions && (
              <div>
                <p className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                  Cautions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {data!.cautions.map((caution) => (
                    <Badge key={caution} variant="warning">
                      {caution}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Health labels - green badges */}
            {hasHealthLabels && (
              <div>
                <p className="text-sm font-medium text-emerald-400 mb-2 flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  Health Labels
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {data!.healthLabels.map((label) => (
                    <Badge key={label} variant="success">
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-stone-500 mt-3">
          Powered by Edamam Nutrition Analysis. Allergen data is based on ingredient parsing and may
          not account for cross-contamination. Always verify with ingredient suppliers for
          safety-critical decisions.
        </p>
      </CardContent>
    </Card>
  )
}

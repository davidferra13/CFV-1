import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { ConstraintRecipePickerResult } from '@/lib/menus/constraint-recipe-picker-types'

function formatQty(value: number): string {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

function coverageBadgeVariant(coveragePct: number): 'success' | 'warning' | 'error' | 'info' {
  if (coveragePct >= 90) return 'success'
  if (coveragePct >= 60) return 'warning'
  if (coveragePct > 0) return 'info'
  return 'error'
}

export function ConstraintRecipePicker({ result }: { result: ConstraintRecipePickerResult }) {
  const hasConstraints = result.dietaryTags.length > 0 || result.allergies.length > 0

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-stone-100">Constraint Recipe Picker</h3>
          <p className="mt-1 text-xs text-stone-500">
            Existing recipes ranked by event constraints and current inventory coverage.
          </p>
        </div>
        <Link href="/recipes" className="text-xs text-brand-500 hover:text-brand-400 font-medium">
          Recipe Book &rarr;
        </Link>
      </div>

      {hasConstraints && (
        <div className="mb-4 flex flex-wrap gap-2">
          {result.dietaryTags.map((tag) => (
            <Badge key={`diet-${tag}`} variant="info">
              {tag}
            </Badge>
          ))}
          {result.allergies.map((allergy) => (
            <Badge key={`allergy-${allergy}`} variant="error">
              {allergy}
            </Badge>
          ))}
        </div>
      )}

      {result.status === 'error' ? (
        <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-sm text-amber-300">
          {result.error ?? 'Could not load constraint recipe picks.'}
        </div>
      ) : result.picks.length === 0 ? (
        <div className="rounded-lg border border-stone-800 bg-stone-950/40 px-3 py-2 text-sm text-stone-400">
          No existing recipes match these constraints yet. Add dietary tags, ingredient allergens,
          and current stock to improve matching.
        </div>
      ) : (
        <div className="space-y-3">
          {result.picks.map((pick) => {
            const missingItems = pick.ingredientCoverage
              .filter((item) => item.status !== 'ready')
              .slice(0, 3)

            return (
              <div key={pick.recipeId} className="rounded-lg border border-stone-800 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/recipes/${pick.recipeId}`}
                      className="text-sm font-medium text-stone-200 hover:text-brand-500 hover:underline"
                    >
                      {pick.recipeName}
                    </Link>
                    <p className="mt-1 text-xs capitalize text-stone-500">
                      {pick.category.replace(/_/g, ' ')}
                      {pick.servings ? ` - ${pick.servings} servings` : ''}
                    </p>
                  </div>
                  <Badge variant={coverageBadgeVariant(pick.coveragePct)}>
                    {pick.coveragePct}% stocked
                  </Badge>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-stone-500">
                  <span>{pick.readyCount} ready</span>
                  <span>{pick.partialCount} partial</span>
                  <span>{pick.missingCount} missing</span>
                </div>

                {missingItems.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {missingItems.map((item) => (
                      <p
                        key={`${pick.recipeId}-${item.ingredientId}-${item.unit}`}
                        className="text-xs text-stone-500"
                      >
                        {item.ingredientName}: {formatQty(item.onHandQty)} /{' '}
                        {formatQty(item.neededQty)} {item.unit}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {result.filteredOutCount > 0 && (
            <p className="border-t border-stone-800 pt-2 text-xs text-stone-500">
              {result.filteredOutCount} recipe{result.filteredOutCount === 1 ? '' : 's'} excluded
              by dietary or allergy constraints.
            </p>
          )}
        </div>
      )}
    </Card>
  )
}

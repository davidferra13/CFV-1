import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getIngredients } from '@/lib/recipes/actions'
import { Card } from '@/components/ui/card'
import {
  formatPeakMonths,
  getPrimarySeason,
  isPeakNow,
  resolveIngredientSeasonality,
} from '@/lib/public-data/seasonality'

export const metadata: Metadata = { title: 'Seasonal Availability - ChefFlow' }

const SEASONS = [
  {
    name: 'Spring',
    months: 'Mar-May',
    color: 'bg-green-900 text-green-200 border-green-200',
  },
  {
    name: 'Summer',
    months: 'Jun-Aug',
    color: 'bg-yellow-900 text-yellow-200 border-yellow-200',
  },
  {
    name: 'Fall',
    months: 'Sep-Nov',
    color: 'bg-orange-900 text-orange-200 border-orange-200',
  },
  {
    name: 'Winter',
    months: 'Dec-Feb',
    color: 'bg-blue-900 text-blue-200 border-blue-200',
  },
] as const

type IngredientEntry = Awaited<ReturnType<typeof getIngredients>>[number]

type SeasonEntry = {
  ingredient: IngredientEntry
  insight: ReturnType<typeof resolveIngredientSeasonality>
}

export default async function SeasonalAvailabilityPage() {
  await requireChef()
  const ingredients = await getIngredients()

  const bySeason = new Map<string, SeasonEntry[]>()
  const yearRound: SeasonEntry[] = []
  const unmatched: SeasonEntry[] = []

  for (const ingredient of ingredients) {
    const insight = resolveIngredientSeasonality(ingredient.name, ingredient.category)
    const season = getPrimarySeason(insight)

    if (season) {
      if (!bySeason.has(season)) bySeason.set(season, [])
      bySeason.get(season)!.push({ ingredient, insight })
      continue
    }

    if (insight.status === 'year_round') {
      yearRound.push({ ingredient, insight })
      continue
    }

    unmatched.push({ ingredient, insight })
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/culinary/ingredients" className="text-sm text-stone-500 hover:text-stone-300">
          Back to ingredients
        </Link>
        <h1 className="mt-1 text-3xl font-bold text-stone-100">Seasonal Availability</h1>
        <p className="mt-1 text-stone-500">
          Ingredient seasonality based on a maintained produce reference instead of raw keyword
          guesses.
        </p>
      </div>

      <Card className="border-stone-700 bg-stone-800 p-4">
        <p className="text-sm font-medium text-stone-300">How seasonality works in ChefFlow</p>
        <p className="mt-1 text-sm text-stone-400">
          ChefFlow now checks a produce seasonality reference first, then falls back to year-round
          or unclassified buckets. This is still reference data, not a live market feed.
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {SEASONS.map((season) => {
          const items = bySeason.get(season.name) ?? []
          return (
            <Card key={season.name} className={`border p-5 ${season.color}`}>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">{season.name}</h2>
                  <p className="mt-0.5 text-xs opacity-75">{season.months}</p>
                </div>
                <span className="text-2xl font-bold opacity-60">{items.length}</span>
              </div>

              {items.length === 0 ? (
                <p className="text-xs opacity-60">No ingredients matched</p>
              ) : (
                <ul className="space-y-2">
                  {items.slice(0, 8).map(({ ingredient, insight }) => (
                    <li
                      key={ingredient.id}
                      className="flex items-start justify-between gap-3 border-b border-black/10 pb-2 last:border-b-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{ingredient.name}</p>
                        <p className="text-[11px] opacity-70">
                          {isPeakNow(insight) ? 'Peak now' : formatPeakMonths(insight.peakMonths)}
                        </p>
                      </div>
                      {ingredient.preferred_vendor && (
                        <span className="shrink-0 text-right text-xs opacity-60">
                          {ingredient.preferred_vendor}
                        </span>
                      )}
                    </li>
                  ))}
                  {items.length > 8 && (
                    <li className="text-xs opacity-60">+{items.length - 8} more</li>
                  )}
                </ul>
              )}
            </Card>
          )
        })}
      </div>

      {yearRound.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-stone-400">
            Year-round / Pantry-ready ({yearRound.length})
          </h2>
          <Card className="p-4">
            <div className="flex flex-wrap gap-2">
              {yearRound
                .sort((a, b) => a.ingredient.name.localeCompare(b.ingredient.name))
                .map(({ ingredient }) => (
                  <span
                    key={ingredient.id}
                    className="rounded-full bg-stone-800 px-2 py-1 text-xs text-stone-300"
                  >
                    {ingredient.name}
                  </span>
                ))}
            </div>
          </Card>
        </div>
      )}

      {unmatched.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-stone-400">
            Unclassified ({unmatched.length})
          </h2>
          <Card className="p-4">
            <div className="flex flex-wrap gap-2">
              {unmatched
                .sort((a, b) => a.ingredient.name.localeCompare(b.ingredient.name))
                .map(({ ingredient }) => (
                  <span
                    key={ingredient.id}
                    className="rounded-full bg-stone-800 px-2 py-1 text-xs text-stone-400"
                  >
                    {ingredient.name}
                  </span>
                ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

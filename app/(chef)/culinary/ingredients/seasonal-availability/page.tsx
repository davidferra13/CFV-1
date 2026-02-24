import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getIngredients } from '@/lib/recipes/actions'
import { Card } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Seasonal Availability - ChefFlow' }

// Rough northern-hemisphere season months for reference display
const SEASONS = [
  {
    name: 'Spring',
    months: 'Mar – May',
    color: 'bg-green-900 text-green-800 border-green-200',
    keywords: [
      'spring',
      'pea',
      'asparagus',
      'ramp',
      'fiddlehead',
      'morel',
      'strawberr',
      'radish',
      'artichoke',
    ],
  },
  {
    name: 'Summer',
    months: 'Jun – Aug',
    color: 'bg-yellow-900 text-yellow-800 border-yellow-200',
    keywords: [
      'summer',
      'tomato',
      'corn',
      'zucchini',
      'basil',
      'peach',
      'blueberr',
      'cucumber',
      'pepper',
      'eggplant',
      'fig',
    ],
  },
  {
    name: 'Fall',
    months: 'Sep – Nov',
    color: 'bg-orange-900 text-orange-800 border-orange-200',
    keywords: [
      'fall',
      'autumn',
      'squash',
      'pumpkin',
      'apple',
      'pear',
      'mushroom',
      'chanterelle',
      'grape',
      'sweet potato',
    ],
  },
  {
    name: 'Winter',
    months: 'Dec – Feb',
    color: 'bg-blue-900 text-blue-800 border-blue-200',
    keywords: [
      'winter',
      'citrus',
      'lemon',
      'orange',
      'grapefruit',
      'kale',
      'root',
      'turnip',
      'celeri',
      'parsnip',
      'truffle',
    ],
  },
]

function guessSeason(name: string): string | null {
  const lower = name.toLowerCase()
  for (const season of SEASONS) {
    if (season.keywords.some((kw) => lower.includes(kw))) return season.name
  }
  return null
}

export default async function SeasonalAvailabilityPage() {
  await requireChef()
  const ingredients = await getIngredients()

  // Match ingredients to seasons by name heuristic
  const bySeason = new Map<string, typeof ingredients>()
  const unmatched: typeof ingredients = []

  for (const ing of ingredients) {
    const season = guessSeason(ing.name)
    if (season) {
      if (!bySeason.has(season)) bySeason.set(season, [])
      bySeason.get(season)!.push(ing)
    } else {
      unmatched.push(ing)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/culinary/ingredients" className="text-sm text-stone-500 hover:text-stone-300">
          ← Ingredients
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Seasonal Availability</h1>
        <p className="text-stone-500 mt-1">
          Ingredients sorted by likely peak season based on name
        </p>
      </div>

      <Card className="p-4 bg-stone-800 border-stone-700">
        <p className="text-sm font-medium text-stone-300">How seasonality works in ChefFlow</p>
        <p className="text-sm text-stone-400 mt-1">
          ChefFlow does not have a dedicated seasonality field on ingredients. The groupings below
          are estimated from ingredient names using common seasonal keywords (northern hemisphere).
          To track precise seasonal windows, add notes to the ingredient&apos;s vendor or use the
          recipe&apos;s <strong>Adaptations</strong> field to document seasonal swaps.
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {SEASONS.map((season) => {
          const items = bySeason.get(season.name) ?? []
          return (
            <Card key={season.name} className={`p-5 border ${season.color}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-semibold text-base">{season.name}</h2>
                  <p className="text-xs mt-0.5 opacity-75">{season.months}</p>
                </div>
                <span className="text-2xl font-bold opacity-60">{items.length}</span>
              </div>
              {items.length === 0 ? (
                <p className="text-xs opacity-60">No ingredients matched</p>
              ) : (
                <ul className="space-y-1">
                  {items.slice(0, 8).map((ing) => (
                    <li key={ing.id} className="text-sm flex items-center justify-between">
                      <span>{ing.name}</span>
                      {ing.preferred_vendor && (
                        <span className="text-xs opacity-60">{ing.preferred_vendor}</span>
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

      {unmatched.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-stone-400 mb-2">
            Year-round / Unclassified ({unmatched.length})
          </h2>
          <Card className="p-4">
            <div className="flex flex-wrap gap-2">
              {unmatched
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((ing) => (
                  <span
                    key={ing.id}
                    className="text-xs bg-stone-800 text-stone-400 px-2 py-1 rounded-full"
                  >
                    {ing.name}
                  </span>
                ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

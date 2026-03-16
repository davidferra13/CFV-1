// Settings > Repertoire > Edit Palette
// Full edit form for a single seasonal palette.

import { requireChef } from '@/lib/auth/get-user'
import { getSeasonalPaletteById } from '@/lib/seasonal/actions'
import { getRecipes } from '@/lib/recipes/actions'
import { SeasonalPaletteForm } from '@/components/settings/seasonal-palette-form'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function EditPalettePage({ params }: { params: { id: string } }) {
  await requireChef()

  const palette = await getSeasonalPaletteById(params.id)
  if (!palette) notFound()

  // Load recipes for "Proven Wins" linking
  const recipes = await getRecipes({ sort: 'name' })
  const recipeOptions = recipes.map((r) => ({ id: r.id, name: r.name }))

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm">
          <Link href="/settings" className="text-brand-500 hover:text-brand-400">
            Settings
          </Link>
          <span className="text-stone-400">/</span>
          <Link href="/settings/repertoire" className="text-brand-500 hover:text-brand-400">
            Seasonal Palettes
          </Link>
          <span className="text-stone-400">/</span>
          <span className="text-stone-500">{palette.season_name}</span>
        </div>
        <h1 className="text-3xl font-bold text-stone-100 mt-2">{palette.season_name}</h1>
        <p className="text-stone-400 mt-1">
          Add your notes, seasonal ingredients, and go-to dishes for {palette.season_name}.
        </p>
      </div>

      <SeasonalPaletteForm palette={palette} recipes={recipeOptions} />
    </div>
  )
}

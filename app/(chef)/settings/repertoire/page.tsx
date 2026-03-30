// Settings > Repertoire - Seasonal Palettes Overview
// List all seasons, set active, edit, create custom.

import { requireChef } from '@/lib/auth/get-user'
import { getSeasonalPalettes } from '@/lib/seasonal/actions'
import { createServerClient } from '@/lib/db/server'
import { SeasonalPaletteList } from '@/components/settings/seasonal-palette-list'
import Link from 'next/link'

export default async function RepertoirePage() {
  const user = await requireChef()
  const palettes = await getSeasonalPalettes()

  // Resolve ingredient and recipe images for palette thumbnails
  let ingredientImageMap: Record<string, string> = {}
  let recipeImageMap: Record<string, string> = {}

  try {
    const db: any = createServerClient()

    // Collect unique ingredient names and recipe IDs across all palettes
    const ingredientNames = Array.from(
      new Set(palettes.flatMap((p) => p.micro_windows.map((mw) => mw.ingredient)).filter(Boolean))
    )
    const recipeIds = Array.from(
      new Set(palettes.flatMap((p) => p.proven_wins.map((pw) => pw.recipe_id)).filter(Boolean))
    ) as string[]

    // Fetch ingredient images by name
    if (ingredientNames.length > 0) {
      const { data: ingredients } = await db
        .from('ingredients')
        .select('name, image_url')
        .eq('tenant_id', user.tenantId!)
        .in('name', ingredientNames)
        .not('image_url', 'is', null)
      if (ingredients) {
        for (const ing of ingredients) {
          if (ing.image_url) ingredientImageMap[ing.name] = ing.image_url
        }
      }
    }

    // Fetch recipe images by ID
    if (recipeIds.length > 0) {
      const { data: recipes } = await db
        .from('recipes')
        .select('id, photo_url')
        .in('id', recipeIds)
        .not('photo_url', 'is', null)
      if (recipes) {
        for (const r of recipes) {
          if (r.photo_url) recipeImageMap[r.id] = r.photo_url
        }
      }
    }
  } catch (err: any) {
    console.error('[repertoire] Image lookup failed (non-blocking):', err.message)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm">
          <Link href="/settings" className="text-brand-500 hover:text-brand-400">
            Settings
          </Link>
          <span className="text-stone-400">/</span>
          <span className="text-stone-500">Seasonal Palettes</span>
        </div>
        <h1 className="text-3xl font-bold text-stone-100 mt-2">Seasonal Palettes</h1>
        <p className="text-stone-400 mt-1">
          Keep track of what&apos;s available each season so you can plan menus without guessing.
        </p>
      </div>

      <SeasonalPaletteList
        palettes={palettes}
        ingredientImageMap={ingredientImageMap}
        recipeImageMap={recipeImageMap}
      />
    </div>
  )
}

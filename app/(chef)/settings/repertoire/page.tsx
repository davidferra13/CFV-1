// Settings > Repertoire — Seasonal Palettes Overview
// List all seasons, set active, edit, create custom.

import { requireChef } from '@/lib/auth/get-user'
import { getSeasonalPalettes } from '@/lib/seasonal/actions'
import { SeasonalPaletteList } from '@/components/settings/seasonal-palette-list'
import Link from 'next/link'

export default async function RepertoirePage() {
  await requireChef()
  const palettes = await getSeasonalPalettes()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm">
          <Link href="/settings" className="text-brand-600 hover:text-brand-700">
            Settings
          </Link>
          <span className="text-stone-400">/</span>
          <span className="text-stone-500">Seasonal Palettes</span>
        </div>
        <h1 className="text-3xl font-bold text-stone-900 mt-2">Seasonal Palettes</h1>
        <p className="text-stone-600 mt-1">
          Keep track of what&apos;s available each season so you can plan menus without guessing.
        </p>
      </div>

      <SeasonalPaletteList palettes={palettes} />
    </div>
  )
}

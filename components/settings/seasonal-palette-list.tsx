// Seasonal Palette List - Client Component
// Displays the 4 fixed seasons as cards with active toggle and edit links.

'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { setActiveSeason, deactivateAllSeasons } from '@/lib/seasonal/actions'
import type { SeasonalPalette } from '@/lib/seasonal/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const SEASON_COLORS: Record<string, string> = {
  Winter: 'border-brand-200 bg-brand-950/50',
  Spring: 'border-emerald-200 bg-emerald-950/50',
  Summer: 'border-amber-200 bg-amber-950/50',
  Autumn: 'border-orange-200 bg-orange-950/50',
}

function formatDateRange(start: string, end: string): string {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  const [sm, sd] = start.split('-').map(Number)
  const [em, ed] = end.split('-').map(Number)
  return `${months[sm - 1]} ${sd} \u2013 ${months[em - 1]} ${ed}`
}

type PaletteListProps = {
  palettes: SeasonalPalette[]
  ingredientImageMap?: Record<string, string>
  recipeImageMap?: Record<string, string>
}

export function SeasonalPaletteList({
  palettes,
  ingredientImageMap = {},
  recipeImageMap = {},
}: PaletteListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const hasActiveSeason = palettes.some((p) => p.is_active)

  const handleSetActive = (paletteId: string) => {
    startTransition(async () => {
      try {
        await setActiveSeason(paletteId)
        router.refresh()
      } catch (err) {
        toast.error('Failed to set active season')
      }
    })
  }

  const handleDeactivate = () => {
    startTransition(async () => {
      try {
        await deactivateAllSeasons()
        router.refresh()
      } catch (err) {
        toast.error('Failed to deactivate seasons')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Opt-in/opt-out info */}
      <div className="bg-stone-800 border border-stone-700 rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-stone-300">
            {hasActiveSeason
              ? 'Seasonal ingredients are showing on your Calendar and Recipes pages.'
              : 'Seasonal ingredients are hidden. Set a season as active to show them.'}
          </p>
        </div>
        {hasActiveSeason && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeactivate}
            disabled={isPending}
            className="text-stone-500 shrink-0"
          >
            Turn Off
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {palettes.map((palette) => {
          const colorClass =
            SEASON_COLORS[palette.season_name] || 'border-stone-700 bg-stone-800/50'
          const ingredientCount = palette.micro_windows.length
          const dishCount = palette.proven_wins.length

          return (
            <Card
              key={palette.id}
              className={`${colorClass} transition-all ${isPending ? 'opacity-50' : ''}`}
            >
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-stone-100 text-lg">{palette.season_name}</h3>
                    <p className="text-sm text-stone-500">
                      {formatDateRange(palette.start_month_day, palette.end_month_day)}
                    </p>
                  </div>
                  {palette.is_active && <Badge variant="success">Active</Badge>}
                </div>

                {palette.sensory_anchor ? (
                  <p className="text-sm text-stone-400 line-clamp-2 mb-3">
                    {palette.sensory_anchor}
                  </p>
                ) : (
                  <p className="text-sm text-stone-400 mb-3">No notes yet</p>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500 mb-2">
                  <span>
                    {ingredientCount} ingredient{ingredientCount !== 1 ? 's' : ''}
                  </span>
                  <span>
                    {dishCount} go-to dish{dishCount !== 1 ? 'es' : ''}
                  </span>
                </div>

                {/* Ingredient + recipe thumbnails */}
                {(() => {
                  const thumbs: { url: string; label: string }[] = []
                  for (const mw of palette.micro_windows) {
                    const url = ingredientImageMap[mw.ingredient]
                    if (url) thumbs.push({ url, label: mw.ingredient })
                  }
                  for (const pw of palette.proven_wins) {
                    if (pw.recipe_id) {
                      const url = recipeImageMap[pw.recipe_id]
                      if (url) thumbs.push({ url, label: pw.dish_name })
                    }
                  }
                  if (thumbs.length === 0) return null
                  const shown = thumbs.slice(0, 6)
                  const remaining = thumbs.length - shown.length
                  return (
                    <div className="flex items-center gap-1 mb-3">
                      {shown.map((t, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={t.url}
                          alt={t.label}
                          title={t.label}
                          className="h-6 w-6 rounded object-cover"
                        />
                      ))}
                      {remaining > 0 && (
                        <span className="text-xs text-stone-500 ml-1">+{remaining}</span>
                      )}
                    </div>
                  )
                })()}

                <div className="flex gap-2">
                  <Link href={`/settings/repertoire/${palette.id}`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full">
                      Edit
                    </Button>
                  </Link>
                  {!palette.is_active && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetActive(palette.id)}
                      disabled={isPending}
                    >
                      Set Active
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
